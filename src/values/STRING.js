const STRING = {
  PACKAGE_JSON_FILENAME: "package.json",
  DEFAULT_CHANGELOG_FILENAME: "CHANGELOG.md",
  DEFAULT_CONFIG_FILENAME: ".changelog-generator-regex-config.js",
  READ_ENCODING: "utf-8",
  DEFAULT_VERSION: "0.0.0",
  GIT_LOG_ARGUMENTS: ["--pretty=format:%s by @%an"],
  RELEASE_ENTRY_POINT_PATTERN:
    "_---> Here is the next release entry point <---_",
  NOT_RECOGNIZED_COMMITS_DESCRIPTION: "not recognized commit type",
  DEFAULT_CHANGELOG_CONTENT: `# Changelog\n
Each commit should match a \`regular expression\`:\n\n`,
  DEFAULT_CONFIG_CONTENT: `const DEFAULT_CONFIG = {
  feat: {
    regex: /\\[feat\\]/,
    description: "new feature"
  },
  chore: {
    regex: /\\[chore\\]/,
    description: "maintain/improve existing features"
  },
  docs: {
    regex: /\\[docs\\]/,
    description: "document anything related to the project"
  },
  fix: {
    regex: /\\[fix\\]/,
    description: "correct a bug"
  },
  refactor: {
    regex: /\\[refactor\\]/,
    description: "improve code without changing behavior"
  },
  style: {
    regex: /\\[style\\]/,
    description: "format, add missing semi colons, fix linter warnings..."
  },
  test: {
    regex: /\\[test\\]/,
    description: "unit tests"
  },
  STOP: /\\[\\d+\\.\\d+\\.\\d+\\]/,
  IGNORE: [/.*Merge branch.*\\n/g]
};

export default DEFAULT_CONFIG;
`
};

export default STRING;
