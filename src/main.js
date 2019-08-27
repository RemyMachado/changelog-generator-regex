#! /usr/bin/env node

import appRoot from "app-root-path";

import { fileExists, getFileContent } from "./helpers/system/read";
import { writeToFile } from "./helpers/system/write";
import { commandResultToString, execCommand } from "./helpers/system/exec";
import { getTwoDigitsDate } from "./helpers/date";
import {
  askWantDefaultChangelog,
  askWantDefaultConfig,
  askFilename,
  askLastCommitPattern,
  askVersionIncrementType
} from "./helpers/askUser";
import {
  getVersionFromContent,
  incrementVersion
} from "./helpers/stringParsing";
import {
  cleanGitLogs,
  getRidOfCommitTypesRegexp
} from "./helpers/regularExpressions";
import {
  printCancelAction,
  printError,
  printNormal,
  printSuccess,
  printSuccessReleaseGeneration,
  printWarning
} from "./helpers/printers";
import STRING from "./values/STRING";

const getLastReleaseVersion = content => {
  const lastVersionResponse = getVersionFromContent(content);

  // lastVersionResponse contains whole regexp result
  if (lastVersionResponse && lastVersionResponse.length >= 2) {
    return lastVersionResponse[1];
  }

  return STRING.DEFAULT_VERSION;
};

const getGitLogsString = () =>
  commandResultToString(
    execCommand("git", ["log", ...STRING.GIT_LOG_ARGUMENTS])
  );

const getCleanGitLogs = depthLimitPattern => {
  const entireGitLogs = getGitLogsString();

  const indexOfLastReleaseCommit = entireGitLogs.search(
    new RegExp(depthLimitPattern)
  );

  if (indexOfLastReleaseCommit === -1) {
    printWarning(
      `Regular expression '${depthLimitPattern}' wasn't found. The entire logs have been processed.`
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

const getDefaultChangelogContent = defaultCommitTypes => {
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

/* AUTOMATIC LAUNCH: */
(async () => {
  /* ---Config--- */
  const configFilename = await askFilename(
    "Name of your commit types configuration file:",
    STRING.DEFAULT_CONFIG_FILENAME
  );

  if (!configFilename) {
    printCancelAction();
    return;
  }

  const configAbsolutePath = appRoot.resolve(configFilename);

  if (!fileExists(configAbsolutePath)) {
    printWarning(`'${configAbsolutePath}' not found.`);

    if (await askWantDefaultConfig(configFilename)) {
      writeToFile(configAbsolutePath, STRING.DEFAULT_CONFIG_CONTENT);
    } else {
      printCancelAction();
      return;
    }
  }

  const config = appRoot.require(configFilename).default;
  console.log(config);

  /* ---Changelog--- */
  const changelogFilename = await askFilename(
    "Name of your changelog file:",
    STRING.DEFAULT_CHANGELOG_FILENAME
  );

  if (!changelogFilename) {
    printCancelAction();
    return;
  }

  let changelogContent;
  const changelogAbsolutePath = appRoot.resolve(changelogFilename);

  if (fileExists(changelogAbsolutePath)) {
    changelogContent = getFileContent(changelogFilename);
  } else {
    printWarning(`'${changelogAbsolutePath}' not found.`);

    if (!(await askWantDefaultChangelog(changelogFilename))) {
      printCancelAction();
      return;
    }

    changelogContent = getDefaultChangelogContent(config);

    writeToFile(changelogAbsolutePath, changelogContent);
  }

  /* ---Version--- */
  const lastReleaseVersion = getLastReleaseVersion(changelogContent);

  printNormal(`The current version is ${lastReleaseVersion}`);

  const versionIncrementType = await askVersionIncrementType();

  const wantedReleaseVersion = incrementVersion(
    lastReleaseVersion,
    versionIncrementType
  );

  if (!wantedReleaseVersion) {
    printCancelAction();
    return;
  }

  // verify changelog entry point existence
  if (!changelogContent.match(`${STRING.RELEASE_ENTRY_POINT_PATTERN}\n`)) {
    printError(`ERROR:\tCouldn't find entry point inside ${changelogFilename}`);
    return;
  }

  /* ---Git logs depth to analyze--- */
  const lastCommitPattern = await askLastCommitPattern();

  if (!lastCommitPattern) {
    printCancelAction();
    return;
  }

  // retrieve wanted commits
  const cleanGitLogs = getCleanGitLogs(lastCommitPattern);
  console.log(cleanGitLogs);

  const sortedCommits = sortLogsPerCommitType(config, cleanGitLogs);

  const newContent = genReleaseContentWithSortedSections(
    wantedReleaseVersion,
    changelogContent,
    sortedCommits
  );

  const newChangelogContent = changelogContent.replace(
    `${STRING.RELEASE_ENTRY_POINT_PATTERN}\n`,
    newContent
  );

  writeToFile(changelogFilename, newChangelogContent);
  printSuccessReleaseGeneration(changelogFilename);
})();
