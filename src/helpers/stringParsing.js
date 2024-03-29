import VERSION from "../values/VERSION";
import {
  getChangelogVersionRegexp,
  getPackageJsonTabulationFormatRegexp,
  getPackageJsonVersionRegexp
} from "./regularExpressions";
import { commandResultToString, execCommand } from "./system/exec";
import STRING from "../values/STRING";
import { printWarning } from "./printers";
import {
  commitsToMarkdown,
  getDatedVersionMarkdown,
  getSectionTitleMarkdown
} from "./markdown";

export const findMatchFromContent = (content, regex) => {
  return content.match(regex);
};

export const incrementVersion = (version, versionType) => {
  const versionParts = version.split(".");

  switch (versionType) {
    case VERSION.MAJOR:
      versionParts[0] = Number(versionParts[0]) + 1;
      versionParts[1] = 0;
      versionParts[2] = 0;
      break;
    case VERSION.MINOR:
      versionParts[1] = Number(versionParts[1]) + 1;
      versionParts[2] = 0;
      break;
    case VERSION.PATCH:
      versionParts[2] = Number(versionParts[2]) + 1;
      break;
    default:
      return undefined;
  }

  return versionParts.join(".");
};

const getGitLogsString = () =>
  commandResultToString(
    execCommand("git", ["log", ...STRING.GIT_LOG_ARGUMENTS])
  );

export const getGitCommits = depthLimitRegex => {
  const entireGitLogs = getGitLogsString();

  const indexOfLastReleaseCommit = entireGitLogs.search(depthLimitRegex);

  let retrievedCommitsString = entireGitLogs;

  if (indexOfLastReleaseCommit === -1) {
    printWarning(
      `Regular expression '${depthLimitRegex}' wasn't found. Every commit has been processed.`
    );
  } else {
    // keep only new release changes
    retrievedCommitsString = entireGitLogs.substring(
      0,
      indexOfLastReleaseCommit
    );
  }

  return retrievedCommitsString.split("\n");
};

export const sortCommitsPerType = (config, commits) => {
  const sortedCommits = {};
  let untypedCommits = commits;

  for (const [name, type] of Object.entries(config)) {
    const commitTypeRegex = new RegExp(type.regex, "gm");

    const matchedCommits = commits.filter(commit =>
      commit.match(commitTypeRegex)
    );

    untypedCommits = untypedCommits.filter(
      untypedCommit => !matchedCommits.includes(untypedCommit)
    );

    const typeLessMatchedCommits =
      matchedCommits &&
      matchedCommits.map(commit => commit.replace(type.regex, ""));

    sortedCommits[name] = { description: type.description };
    sortedCommits[name].commits = typeLessMatchedCommits || [];
  }

  sortedCommits.untyped = {
    description: STRING.NOT_RECOGNIZED_COMMITS_DESCRIPTION,
    commits: untypedCommits
  };

  return sortedCommits;
};

export const getDefaultChangelogHeader = config => {
  /* Header before the release entry point */
  let defaultChangelog = STRING.DEFAULT_CHANGELOG_CONTENT;

  for (const type of Object.values(config)) {
    defaultChangelog = defaultChangelog.concat(
      `- \`${type.regex.toString()}\` ${type.description}\n`
    );
  }

  defaultChangelog = defaultChangelog.concat(
    `\n${STRING.RELEASE_ENTRY_POINT_PATTERN}\n`
  );

  return defaultChangelog;
};

export const getLastReleaseVersion = content => {
  const lastVersionResponse = findMatchFromContent(
    content,
    getPackageJsonVersionRegexp()
  );

  // lastVersionResponse contains whole regexp result
  if (lastVersionResponse && lastVersionResponse.length >= 2) {
    return lastVersionResponse[1];
  }

  return STRING.DEFAULT_VERSION;
};

export const genReleaseContent = (version, content, sortedCommits) => {
  let newChangeLogContent = `${STRING.RELEASE_ENTRY_POINT_PATTERN}\n`;

  newChangeLogContent = newChangeLogContent.concat(
    getDatedVersionMarkdown(version)
  );

  for (const type of Object.keys(sortedCommits)) {
    if (sortedCommits[type].commits.length > 0) {
      const sectionTitleMarkdown = getSectionTitleMarkdown(sortedCommits, type);

      // append the title (markdown format)
      newChangeLogContent = newChangeLogContent.concat(sectionTitleMarkdown);

      // append the commits (markdown format)
      newChangeLogContent = newChangeLogContent.concat(
        commitsToMarkdown(sortedCommits[type].commits).join("")
      );
    }
  }

  return newChangeLogContent;
};

export const getPackageJsonTabulationFormat = packageJsonContent => {
  const formatResponse = findMatchFromContent(
    packageJsonContent,
    getPackageJsonTabulationFormatRegexp()
  );

  // lastVersionResponse contains whole regexp result
  if (formatResponse && formatResponse.length >= 2) {
    return formatResponse[1];
  }

  return "\t";
};
