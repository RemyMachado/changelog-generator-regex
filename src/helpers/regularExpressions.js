export const getVersionRegexp = () => /## \[(\d\.\d\.\d)\]/;

export const cleanGitLogs = gitLogs =>
	gitLogs
		.replace(/.*Merge branch.*\n/g, "")
		.replace(/^"- /gm, "")
		.replace(/"\n/g, "\n");

export const getRidOfCommitTypesRegexp = defaultCommitTypes => {
  let negativeRegexPattern = "^";

  for (const commitType of Object.keys(defaultCommitTypes)) {
    negativeRegexPattern = negativeRegexPattern.concat(
      `(?!\\[${commitType}\\])`
    );
  }
  negativeRegexPattern = negativeRegexPattern.concat(".*");

  return new RegExp(negativeRegexPattern, "gm");
};
