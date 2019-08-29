export const getChangelogVersionRegexp = () => /## \[(\d+\.\d+\.\d+)\]/;

export const getPackageJsonVersionRegexp = () => /"version": "(\d+\.\d+\.\d+)"/;

export const getPackageJsonTabulationFormatRegexp = () => /{\n(.+?)(?:"|')/;

export const getDefaultGitLogStopRegex = () => /^.*\[\d+\.\d+\.\d+\].*$/m;

export const filterOutUselessCommits = (commits, configIgnoreRegexps) =>
  commits
    .map(commit => {
      return configIgnoreRegexps.reduce((accumulator, currentRegex) => {
        return accumulator.replace(currentRegex, "");
      }, commit);
    })
    .filter(commit => commit !== "");
