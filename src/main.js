#! /usr/bin/env node

import appRoot from "app-root-path";

import { fileExists, getFileContent } from "./helpers/system/read";
import { writeToFile } from "./helpers/system/write";
import { filterOutUselessCommits } from "./helpers/regularExpressions";
import {
  askWantDefaultChangelog,
  askWantDefaultConfig,
  askFilename,
  askLastCommitPattern,
  askVersionIncrementType
} from "./helpers/askUser";
import {
  genReleaseContent,
  getDefaultChangelogHeader,
  getGitCommits,
  getLastReleaseVersion,
  incrementVersion,
  sortCommitsPerType
} from "./helpers/stringParsing";
import {
  printCancelAction,
  printError,
  printNormal,
  printSuccessReleaseGeneration,
  printWarning
} from "./helpers/printers";
import STRING from "./values/STRING";

/* AUTOMATIC CALL: */
(async () => {
  /* ---Retrieve config--- */
  const configFilename = await askFilename(
    "Name of your commit types configuration file (optional)",
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

  /* ---Retrieve changelog--- */
  const changelogFilename = await askFilename(
    "Name of your changelog file (optional)",
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

    changelogContent = getDefaultChangelogHeader(config);

    writeToFile(changelogAbsolutePath, changelogContent);
  }

  /* ---Retrieve version--- */
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

  /* ---Verify changelog entry point existence--- */
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

  /* ---Retrieve commits--- */
  const gitCommits = getGitCommits(lastCommitPattern);
  const filteredCommits = filterOutUselessCommits(gitCommits);

  const sortedCommits = sortCommitsPerType(config, filteredCommits);

  const newContent = genReleaseContent(
    wantedReleaseVersion,
    changelogContent,
    sortedCommits
  );

  /* ---Insert the new content--- */
  const newChangelogContent = changelogContent.replace(
    `${STRING.RELEASE_ENTRY_POINT_PATTERN}\n`,
    newContent
  );

  writeToFile(changelogFilename, newChangelogContent);
  printSuccessReleaseGeneration(changelogFilename);
})();
