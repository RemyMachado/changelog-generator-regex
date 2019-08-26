#! /usr/bin/env node

import appRoot from "app-root-path";
import {
  askAutomaticDefaultChangelog,
  askAutomaticDefaultCommitTypesConfig,
  askFilename,
  askLastCommitPattern,
  askVersionTypeIncrement
} from "./helpers/askUser";
import { fileExists, getFileContent } from "./helpers/system/read";
import { writeToFile } from "./helpers/system/write";
import {
  getVersionFromContent,
  incrementVersion
} from "./helpers/stringParsing";
import { commandResultToString, execCommand } from "./helpers/system/exec";
import {
  cleanGitLogs,
  getRidOfCommitTypesRegexp
} from "./helpers/regularExpressions";
import { getTwoDigitsDate } from "./helpers/date";
import {
  printCancelAction,
  printError,
  printSuccess,
  printSuccessReleaseGeneration,
  printWarning
} from "./helpers/printers";
import STRING from "./values/STRING";

const getLastReleaseVersion = fileName => {
  const lastVersionResponse = getVersionFromContent(getFileContent(fileName));

  if (lastVersionResponse && lastVersionResponse.length >= 2) {
    return lastVersionResponse[1];
  }

  return STRING.DEFAULT_VERSION;
};

const getGitLogsString = () =>
  commandResultToString(
    execCommand("git", ["log", ...STRING.GIT_LOG_ARGUMENTS])
  );

const getCleanGitLogs = lastCommitPattern => {
  const entireGitLogs = getGitLogsString();

  const indexOfLastReleaseCommit = entireGitLogs.search(
    new RegExp(lastCommitPattern)
  );

  if (indexOfLastReleaseCommit === -1) {
    printWarning(
      `Regular expression '${lastCommitPattern}' wasn't found. The entire logs have been processed.`
    );

    return cleanGitLogs(entireGitLogs);
  } else {
    const lastReleaseGitLogs = entireGitLogs.substring(
      0,
      indexOfLastReleaseCommit
    );

    return cleanGitLogs(lastReleaseGitLogs);
  }
};

const getDefaultChangelog = defaultCommitTypes => {
  let defaultChangelog = STRING.DEFAULT_CHANGELOG_CONTENT;

  for (const [key, value] of Object.entries(defaultCommitTypes)) {
    defaultChangelog = defaultChangelog.concat(`- [\`${key}\`] ${value}\n`);
  }

  defaultChangelog = defaultChangelog.concat(
    `\n${STRING.RELEASE_ENTRY_POINT_PATTERN}\n`
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

  const notRecognizedCommitsRegexp = getRidOfCommitTypesRegexp(commitTypes);
  const notRecognizedCommits = gitLogs
    .match(notRecognizedCommitsRegexp)
    .filter(commit => commit !== "");

  sortedCommits.untyped = {
    description: STRING.NOT_RECOGNIZED_COMMITS_DESCRIPTION,
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
  const { year, month, day } = getTwoDigitsDate;

  let newChangeLogPart = `${STRING.RELEASE_ENTRY_POINT_PATTERN}\n`;

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

const askAndGetDefaultChangelogContent = async (filename, commitTypes) => {
  if (!(await askAutomaticDefaultChangelog(filename))) {
    return false;
  }

  return getDefaultChangelog(commitTypes);
};

/* AUTOMATIC LAUNCH: */
(async () => {
  let changelogContent;

  const commitTypesConfigFilename = await askFilename(
    "Name of your commit types configuration file:",
    STRING.DEFAULT_COMMIT_TYPES_CONFIG_FILENAME
  );

  if (!commitTypesConfigFilename) {
    printCancelAction();
    return;
  }

  if (!fileExists(commitTypesConfigFilename)) {
    printWarning(`'${commitTypesConfigFilename}' not found.`);

    if (await askAutomaticDefaultCommitTypesConfig(commitTypesConfigFilename)) {
      writeToFile(
        commitTypesConfigFilename,
        STRING.DEFAULT_COMMIT_TYPES_CONFIG_CONTENT
      );
    } else {
      printCancelAction();
      return;
    }
  }

  const changeLogFilename = await askFilename(
    "Name of your changelog file:",
    STRING.DEFAULT_CHANGELOG_FILENAME
  );

  if (!changeLogFilename) {
    printCancelAction();
    return;
  }

  const defaultCommitTypes = appRoot.require(commitTypesConfigFilename).default;

  console.log(defaultCommitTypes);

  const changeLogAbsolutePath = appRoot.resolve(changeLogFilename);

  if (fileExists(changeLogAbsolutePath)) {
    changelogContent = getFileContent(changeLogFilename);
  } else {
    printWarning(`'${changeLogAbsolutePath}' not found.`);

    changelogContent = await askAndGetDefaultChangelogContent(
      changeLogFilename,
      defaultCommitTypes
    );

    if (!changelogContent) {
      printCancelAction();
      return;
    }

    writeToFile(changeLogFilename, changelogContent);
  }

  const lastReleaseVersion = getLastReleaseVersion(changeLogFilename);

  printSuccess(`The current version is ${lastReleaseVersion}`);

  const incrementType = await askVersionTypeIncrement();

  const wantedReleaseVersion = incrementVersion(
    lastReleaseVersion,
    incrementType
  );

  if (!wantedReleaseVersion) {
    printCancelAction();
    return;
  }

  if (!changelogContent.match(`${STRING.RELEASE_ENTRY_POINT_PATTERN}\n`)) {
    printError(`ERROR:\tCouldn't find entry point inside ${changeLogFilename}`);
    return;
  }

  const lastCommitPattern = await askLastCommitPattern();

  if (!lastCommitPattern) {
    printCancelAction();
    return;
  }

  const sortedCommits = sortLogsPerCommitType(
    defaultCommitTypes,
    getCleanGitLogs(lastCommitPattern)
  );

  const newContent = genReleaseContentWithSortedSections(
    wantedReleaseVersion,
    changelogContent,
    sortedCommits
  );

  const newChangelogContent = changelogContent.replace(
    `${STRING.RELEASE_ENTRY_POINT_PATTERN}\n`,
    newContent
  );

  writeToFile(changeLogFilename, newChangelogContent);
  printSuccessReleaseGeneration(changeLogFilename);
})();
