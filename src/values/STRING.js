const STRING = {
  PACKAGE_JSON_FILENAME: "package.json",
  DEFAULT_CHANGELOG_FILENAME: "CHANGELOG.md",
  DEFAULT_CONFIG_FILENAME: ".changelog-generator-config.js",
  READ_ENCODING: "utf-8",
  DEFAULT_VERSION: "0.0.0",
  GIT_LOG_ARGUMENTS: ["--pretty=format:%s by @%an"],
  DEFAULT_GIT_LOG_STOP_PATTERN: "\\[\\d+\\.\\d+\\.\\d+\\]",
  RELEASE_ENTRY_POINT_PATTERN:
    "_---> Here is the next release entry point <---_",
  NOT_RECOGNIZED_COMMITS_DESCRIPTION: "not recognized commit type",
  DEFAULT_CHANGELOG_CONTENT: `# Changelog\n
Each commit has to be one of the following [\`type\`]:\n\n`,
  DEFAULT_CONFIG_CONTENT: `const DEFAULT_COMMIT_TYPES = {
  feat: 'new feature',
  chore: 'maintain/improve existing features',
  docs: 'document anything related to the project',
  fix: 'correct a bug',
  refactor: 'improve code without changing behavior',
  style: 'format, add missing semi colons, fix linter warnings...',
  test: 'unit tests'
};

export default DEFAULT_COMMIT_TYPES;
`
};

export default STRING;
