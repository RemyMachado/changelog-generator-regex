export const getChangelogVersionRegexp = () => /## \[(\d+\.\d+\.\d+)\]/;

export const getPackageJsonVersionRegexp = () => /"version": "(\d+\.\d+\.\d+)"/;

export const getPackageJsonTabulationFormatRegexp = () => /{\n(.+?)(?:"|')/;

export const filterOutUselessCommits = commits =>
  commits.map(commit => {
    return commit.replace(/.*Merge branch.*\n/g, "");
  });
