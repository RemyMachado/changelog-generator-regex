export const getVersionRegexp = () => /## \[(\d\.\d\.\d)\]/;

export const filterOutUselessCommits = commits =>
  commits.map(commit => {
    return commit.replace(/.*Merge branch.*\n/g, "");
  });
