#! /usr/bin/env node

import appRoot from "app-root-path";

import { fileExists, getFileContent } from "./helpers/system/read";
import { writeToFile } from "./helpers/system/write";
import {
  filterOutUselessCommits,
  getPackageJsonVersionRegexp
} from "./helpers/regularExpressions";
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
  sortCommitsPerType,
  getPackageJsonTabulationFormat
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
    return 1;
  }

  const configAbsolutePath = appRoot.resolve(configFilename);

  if (!fileExists(configAbsolutePath)) {
    printWarning(`'${configAbsolutePath}' not found.`);

    if (await askWantDefaultConfig(configFilename)) {
      writeToFile(configAbsolutePath, STRING.DEFAULT_CONFIG_CONTENT);
    } else {
      printCancelAction();
      return 1;
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
    return 1;
  }

  let changelogContent;
  const changelogAbsolutePath = appRoot.resolve(changelogFilename);

  if (fileExists(changelogAbsolutePath)) {
    changelogContent = getFileContent(changelogFilename);
  } else {
    printWarning(`'${changelogAbsolutePath}' not found.`);

    if (!(await askWantDefaultChangelog(changelogFilename))) {
      printCancelAction();
      return 1;
    }

    changelogContent = getDefaultChangelogHeader(config);

    writeToFile(changelogAbsolutePath, changelogContent);
  }

  /* ---Retrieve version--- */
  const packageJsonAbsolutePath = appRoot.resolve(STRING.PACKAGE_JSON_FILENAME);
  const packageJsonContent = getFileContent(packageJsonAbsolutePath);
  const packageJsonVersion = getLastReleaseVersion(packageJsonContent);
  const versionNotFound = packageJsonVersion === STRING.DEFAULT_VERSION;

  if (versionNotFound) {
    printWarning("package.json version not found.");
  }

  printNormal(`The current version of your project is ${packageJsonVersion}`);

  const versionIncrementType = await askVersionIncrementType();

  const wantedReleaseVersion = incrementVersion(
    packageJsonVersion,
    versionIncrementType
  );

  if (!wantedReleaseVersion) {
    printCancelAction();
    return 1;
  }

  printNormal(`Selection: ${packageJsonVersion} -> ${wantedReleaseVersion}`);

  /* ---Verify changelog entry point existence--- */
  if (!changelogContent.match(`${STRING.RELEASE_ENTRY_POINT_PATTERN}\n`)) {
    printError(`ERROR:\tCouldn't find entry point inside ${changelogFilename}`);
    return 1;
  }

  /* ---Git logs depth to analyze--- */
  const lastCommitPattern = await askLastCommitPattern();

  if (!lastCommitPattern) {
    printCancelAction();
    return 1;
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

  /* ---Update the package.json--- */
  let newPackageJsonContent = "";

  if (versionNotFound) {
    const packageJsonTabulationFormat = getPackageJsonTabulationFormat(
      packageJsonContent
    );

    newPackageJsonContent = packageJsonContent.replace(
      "{\n",
      `{\n${packageJsonTabulationFormat}"version": "${wantedReleaseVersion}",\n`
    );
  } else {
    newPackageJsonContent = packageJsonContent.replace(
      getPackageJsonVersionRegexp(),
      `"version": "${wantedReleaseVersion}"`
    );
  }

  writeToFile(packageJsonAbsolutePath, newPackageJsonContent);

  /* ---Insert the new content--- */
  const newChangelogContent = changelogContent.replace(
    `${STRING.RELEASE_ENTRY_POINT_PATTERN}\n`,
    newContent
  );

  writeToFile(changelogFilename, newChangelogContent);
  printSuccessReleaseGeneration(
    changelogFilename,
    packageJsonVersion,
    wantedReleaseVersion
  );

  return 0;
})();
