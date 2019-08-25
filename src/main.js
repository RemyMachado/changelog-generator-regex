#! /usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

import {
  askAutomaticDefaultCommitTypesConfig,
  askFilename,
  askLastCommitPattern,
  askVersionIncrement
} from "./helpers/askUser";
import STRINGS from "./values/STRINGS";

/* eslint-disable no-console */

const askAndComputeNewVersionNumber = async lastVersionNumber => {
  const result = await askVersionIncrement();
  let wantedVersionNumber = lastVersionNumber;

  switch (result) {
    case 1:
      wantedVersionNumber = setCharAt(
        wantedVersionNumber,
        0,
        Number(wantedVersionNumber[0]) + 1
      );
      wantedVersionNumber = setCharAt(wantedVersionNumber, 2, "0");
      wantedVersionNumber = setCharAt(wantedVersionNumber, 4, "0");
      break;
    case 2:
      wantedVersionNumber = setCharAt(
        wantedVersionNumber,
        2,
        Number(wantedVersionNumber[2]) + 1
      );
      wantedVersionNumber = setCharAt(wantedVersionNumber, 4, "0");
      break;
    case 3:
      wantedVersionNumber = setCharAt(
        wantedVersionNumber,
        4,
        Number(wantedVersionNumber[4]) + 1
      );
      break;
    default:
      return undefined;
  }

  return wantedVersionNumber;
};

const askAndGetDefaultChangelogContent = async (filename, commitTypes) => {
  if (!(await askAutomaticDefaultChangelog(filename))) {
    return false;
  }

  return getDefaultChangelog(commitTypes);
};

const getFileContent = filename => {
  return fs.readFileSync(filename, { encoding: STRINGS.READ_ENCODING });
};

const extractVersion = haystack => {
  const regex = /## \[(\d\.\d\.\d)\]/;
  return haystack.match(regex);
};

const getNegativeCommitRegexp = defaultCommitTypes => {
  let negativeRegexPattern = "^";

  for (const commitType of Object.keys(defaultCommitTypes)) {
    negativeRegexPattern = negativeRegexPattern.concat(
      `(?!\\[${commitType}\\])`
    );
  }
  negativeRegexPattern = negativeRegexPattern.concat(".*");

  return new RegExp(negativeRegexPattern, "gm");
};

const getLastReleaseVersion = fileName => {
  const lastVersionResponse = extractVersion(getFileContent(fileName));

  if (lastVersionResponse && lastVersionResponse.length >= 2) {
    return lastVersionResponse[1];
  }

  return STRINGS.DEFAULT_VERSION;
};

const getGitLogsFilterMerge = lastCommitPattern => {
  const gitLogs = spawnSync("git", [
    "log",
    ...STRINGS.GIT_LOG_ARGUMENTS
  ]).stdout.toString();

  let gitLogsToLastRelease = gitLogs;
  const indexOfLastReleaseCommit = gitLogs.search(
    new RegExp(lastCommitPattern)
  );

  if (indexOfLastReleaseCommit !== -1) {
    gitLogsToLastRelease = gitLogs.substring(0, indexOfLastReleaseCommit);
  } else {
    console.log(
      `\x1b[33mRegular expression '${lastCommitPattern}' wasn't found. The entire logs has been processed`
    );
  }

  return gitLogsToLastRelease
    .replace(/.*Merge branch.*\n/g, "")
    .replace(/^"- /gm, "")
    .replace(/"\n/g, "\n");
};

const getDefaultChangelog = defaultCommitTypes => {
  let defaultChangelog = STRINGS.DEFAULT_CHANGELOG_CONTENT;

  for (const [key, value] of Object.entries(defaultCommitTypes)) {
    defaultChangelog = defaultChangelog.concat(`- [\`${key}\`] ${value}\n`);
  }

  defaultChangelog = defaultChangelog.concat(
    `\n${STRINGS.RELEASE_ENTRY_POINT_PATTERN}\n`
  );

  return defaultChangelog;
};

const sortLogsPerCommitType = (commitTypes, gitLogs) => {
  const sortedCommits = {};

  for (const [key, value] of Object.entries(commitTypes)) {
    const commitRegexPattern = `^\\[${key}\\].*$`;
    const commitRegex = new RegExp(commitRegexPattern, "gm");
    const matchedCommits = gitLogs.match(commitRegex);

    const trimmedMatchedCommits =
      matchedCommits &&
      matchedCommits.map(commit => commit.replace(`[${key}] `, ""));

    sortedCommits[key] = { description: value };
    sortedCommits[key].commits = trimmedMatchedCommits || [];
  }

  const notRecognizedCommitsRegexp = getNegativeCommitRegexp(commitTypes);
  const notRecognizedCommits = gitLogs
    .match(notRecognizedCommitsRegexp)
    .filter(commit => commit !== "");

  sortedCommits.untyped = {
    description: STRINGS.NOT_RECOGNIZED_COMMITS_DESCRIPTION,
    commits: notRecognizedCommits || []
  };

  return sortedCommits;
};

const appendCommitsToSection = (type, changeLogPart, sortedCommits) => {
  let appendedChangeLogPart = changeLogPart;

  for (const commit of sortedCommits[type].commits) {
    appendedChangeLogPart = appendedChangeLogPart.concat("- ", commit, "\n");
  }

  return appendedChangeLogPart;
};

const genReleaseContentWithSortedSections = (
  version,
  content,
  sortedCommits
) => {
  const dateObj = new Date();
  const year = dateObj.getUTCFullYear();
  const month = `0${dateObj.getUTCMonth() + 1}`.slice(-2);
  const day = `0${dateObj.getUTCDate()}`.slice(-2);

  let newChangeLogPart = `${STRINGS.RELEASE_ENTRY_POINT_PATTERN}\n`;
  newChangeLogPart = newChangeLogPart.concat(
    `## [${version}] - ${year}-${month}-${day}\n`
  );

  for (const key of Object.keys(sortedCommits)) {
    if (sortedCommits[key].commits.length > 0) {
      newChangeLogPart = newChangeLogPart.concat(
        `### ${sortedCommits[key].commits.length} ${key}: _${sortedCommits[key].description}_\n`
      );
    }
    newChangeLogPart = appendCommitsToSection(
      key,
      newChangeLogPart,
      sortedCommits
    );
  }

  return newChangeLogPart;
};

const setCharAt = (str, index, character) => {
  if (index > str.length - 1) return str;
  return str.substr(0, index) + character + str.substr(index + 1);
};

const logSuccessReleaseGeneration = changelogFilename => {
  console.log(
    `\x1b[32mRelease successfully added to ${changelogFilename} file.`
  );
};

const logCancelAction = () => {
  console.log(`\x1b[31mRelease generation was cancelled.`);
};

/* AUTOMATIC LAUNCH: */
(async () => {
  let changelogContent;

  const commitTypesConfigFilename = await askFilename(
    "Name of your commit types configuration file:",
    STRINGS.DEFAULT_COMMIT_TYPES_CONFIG_FILENAME
  );

  if (!commitTypesConfigFilename) {
    logCancelAction();
    return;
  }

  if (!fs.existsSync(commitTypesConfigFilename)) {
    console.log(`'${commitTypesConfigFilename}' not found.`);
    if (await askAutomaticDefaultCommitTypesConfig(commitTypesConfigFilename)) {
      fs.writeFileSync(
        commitTypesConfigFilename,
        STRINGS.DEFAULT_COMMIT_TYPES_CONFIG_CONTENT
      );
    } else {
      logCancelAction();
      return;
    }
  }

  const changeLogFilename = await askFilename(
    "Name of your changelog file:",
    STRINGS.DEFAULT_CHANGELOG_FILENAME
  );

  if (!changeLogFilename) {
    logCancelAction();
    return;
  }

  /* eslint-disable-next-line global-require,import/no-dynamic-require */
  const { defaultCommitTypes } = require(`../${commitTypesConfigFilename}`);

  if (fs.existsSync(changeLogFilename)) {
    changelogContent = getFileContent(changeLogFilename);
  } else {
    console.log(`'${changeLogFilename}' not found.`);
    changelogContent = await askAndGetDefaultChangelogContent(
      changeLogFilename,
      defaultCommitTypes
    );

    if (!changelogContent) {
      logCancelAction();
      return;
    }

    fs.writeFileSync(changeLogFilename, changelogContent);
  }

  const lastReleaseVersion = getLastReleaseVersion(changeLogFilename);
  console.log(`The current version is ${lastReleaseVersion}`);

  const wantedReleaseVersion = await askAndComputeNewVersionNumber(
    lastReleaseVersion
  );

  if (!wantedReleaseVersion) {
    logCancelAction();
    return;
  }

  if (!changelogContent.match(`${STRINGS.RELEASE_ENTRY_POINT_PATTERN}\n`)) {
    console.log(
      `ERROR:\tCouldn't find entry point inside ${changeLogFilename}`
    );
    return;
  }

  const lastCommitPattern = await askLastCommitPattern();

  if (!lastCommitPattern) {
    logCancelAction();
    return;
  }

  const sortedCommits = sortLogsPerCommitType(
    defaultCommitTypes,
    getGitLogsFilterMerge(lastCommitPattern)
  );

  const newContent = genReleaseContentWithSortedSections(
    wantedReleaseVersion,
    changelogContent,
    sortedCommits
  );

  const newChangelogContent = changelogContent.replace(
    `${STRINGS.RELEASE_ENTRY_POINT_PATTERN}\n`,
    newContent
  );

  fs.writeFileSync(changeLogFilename, newChangelogContent);
  logSuccessReleaseGeneration(changeLogFilename);
})();
