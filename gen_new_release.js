#! /usr/bin/env node

const fs = require('fs');
const { spawnSync } = require('child_process');
const prompts = require('prompts');

/* eslint-disable no-console */

const DEFAULT_CHANGELOG_FILENAME = 'CHANGELOG.md';
const DEFAULT_COMMIT_TYPES_CONFIG_FILENAME = 'default-commit-types.js';
const READ_ENCODING = 'utf-8';
const DEFAULT_VERSION = '0.0.0';
const GIT_LOG_ARGUMENTS = ['--pretty=format:"- %s by @%an"'];
const DEFAULT_GIT_LOG_STOP_PATTERN = '\\[\\d\\.\\d\\.\\d\\]';
const RELEASE_ENTRY_POINT_PATTERN =
  '_---> Here is the next release entry point <---_';
const NOT_RECOGNIZED_COMMITS_DESCRIPTION = 'not recognized commit type';
const DEFAULT_CHANGELOG_CONTENT = `# Changelog\n
Each commit has to be one of the following [\`type\`]:\n\n`;
const DEFAULT_COMMIT_TYPES_CONFIG_CONTENT = `module.exports.defaultCommitTypes = {
  feat: 'new feature',
  chore: 'maintain/improve existing features',
  docs: 'document anything related to the project',
  fix: 'correct a bug',
  refactor: 'improve code without changing behavior',
  style: 'format, add missing semi colons, fix linter warnings...',
  test: 'unit tests'
};\n`;

const askFilename = async (message, initial) => {
  const response = await prompts({
    type: 'text',
    name: 'filename',
    message,
    initial
  });

  return response.filename;
};

const askAutomaticDefaultChangelog = async filename => {
  const response = await prompts({
    type: 'confirm',
    name: 'value',
    message: `Do you want '${filename}' to be created with a default changelog ?`,
    initial: true
  });

  return response.value;
};

const askAutomaticDefaultCommitTypesConfig = async filename => {
  const response = await prompts({
    type: 'confirm',
    name: 'value',
    message: `Do you want '${filename}' to be created with default commit types ?`,
    initial: true
  });

  return response.value;
};

const askLastCommitPattern = async () => {
  const response = await prompts({
    type: 'text',
    name: 'pattern',
    message: `Regular expression to match the 'STOP' commit (not included) ?`,
    initial: DEFAULT_GIT_LOG_STOP_PATTERN
  });

  return response.pattern;
};

const getFileContent = filename => {
  return fs.readFileSync(filename, { encoding: READ_ENCODING });
};

const extractVersion = haystack => {
  const regex = /## \[(\d\.\d\.\d)\]/;
  return haystack.match(regex);
};

const getNegativeCommitRegexp = defaultCommitTypes => {
  let negativeRegexPattern = '^';

  for (const commitType of Object.keys(defaultCommitTypes)) {
    negativeRegexPattern = negativeRegexPattern.concat(
      `(?!\\[${commitType}\\])`
    );
  }
  negativeRegexPattern = negativeRegexPattern.concat('.*');

  return new RegExp(negativeRegexPattern, 'gm');
};

const getLastReleaseVersion = fileName => {
  const lastVersionResponse = extractVersion(getFileContent(fileName));

  if (lastVersionResponse && lastVersionResponse.length >= 2) {
    return lastVersionResponse[1];
  }

  return DEFAULT_VERSION;
};

const getGitLogsFilterMerge = lastCommitPattern => {
  const gitLogs = spawnSync('git', [
    'log',
    ...GIT_LOG_ARGUMENTS
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
    .replace(/.*Merge branch.*\n/g, '')
    .replace(/^"- /gm, '')
    .replace(/"\n/g, '\n');
};

const getDefaultChangelog = defaultCommitTypes => {
  let defaultChangelog = DEFAULT_CHANGELOG_CONTENT;

  for (const [key, value] of Object.entries(defaultCommitTypes)) {
    defaultChangelog = defaultChangelog.concat(`- [\`${key}\`] ${value}\n`);
  }

  defaultChangelog = defaultChangelog.concat(
    `\n${RELEASE_ENTRY_POINT_PATTERN}\n`
  );

  return defaultChangelog;
};

const sortLogsPerCommitType = (commitTypes, gitLogs) => {
  const sortedCommits = {};

  for (const [key, value] of Object.entries(commitTypes)) {
    const commitRegexPattern = `^\\[${key}\\].*$`;
    const commitRegex = new RegExp(commitRegexPattern, 'gm');
    const matchedCommits = gitLogs.match(commitRegex);

    const trimmedMatchedCommits =
      matchedCommits &&
      matchedCommits.map(commit => commit.replace(`[${key}] `, ''));

    sortedCommits[key] = { description: value };
    sortedCommits[key].commits = trimmedMatchedCommits || [];
  }

  const notRecognizedCommitsRegexp = getNegativeCommitRegexp(commitTypes);
  const notRecognizedCommits = gitLogs
    .match(notRecognizedCommitsRegexp)
    .filter(commit => commit !== '');

  sortedCommits.untyped = {
    description: NOT_RECOGNIZED_COMMITS_DESCRIPTION,
    commits: notRecognizedCommits || []
  };

  return sortedCommits;
};

const appendCommitsToSection = (type, changeLogPart, sortedCommits) => {
  let appendedChangeLogPart = changeLogPart;

  for (const commit of sortedCommits[type].commits) {
    appendedChangeLogPart = appendedChangeLogPart.concat('- ', commit, '\n');
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

  let newChangeLogPart = `${RELEASE_ENTRY_POINT_PATTERN}\n`;
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

const askVersionIncrement = async () => {
  const response = await prompts({
    type: 'number',
    name: 'value',
    message: 'Do you want to increase the 1=major, 2=minor, 3=patch',
    validate: value =>
      value === 1 || value === 2 || value === 3 ? true : `Choose 1, 2 or 3`
  });

  return response.value;
};

const setCharAt = (str, index, character) => {
  if (index > str.length - 1) return str;
  return str.substr(0, index) + character + str.substr(index + 1);
};

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
      wantedVersionNumber = setCharAt(wantedVersionNumber, 2, '0');
      wantedVersionNumber = setCharAt(wantedVersionNumber, 4, '0');
      break;
    case 2:
      wantedVersionNumber = setCharAt(
        wantedVersionNumber,
        2,
        Number(wantedVersionNumber[2]) + 1
      );
      wantedVersionNumber = setCharAt(wantedVersionNumber, 4, '0');
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
    'Name of your commit types configuration file:',
    DEFAULT_COMMIT_TYPES_CONFIG_FILENAME
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
        DEFAULT_COMMIT_TYPES_CONFIG_CONTENT
      );
    } else {
      logCancelAction();
      return;
    }
  }

  const changeLogFilename = await askFilename(
    'Name of your changelog file:',
    DEFAULT_CHANGELOG_FILENAME
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

  if (!changelogContent.match(`${RELEASE_ENTRY_POINT_PATTERN}\n`)) {
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
    `${RELEASE_ENTRY_POINT_PATTERN}\n`,
    newContent
  );

  fs.writeFileSync(changeLogFilename, newChangelogContent);
  logSuccessReleaseGeneration(changeLogFilename);
})();
