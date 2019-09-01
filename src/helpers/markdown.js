import { getTwoDigitsDate } from "./date";

export const getDatedVersionMarkdown = version => {
  const { year, month, day } = getTwoDigitsDate();

  return `## [${version}] - ${year}-${month}-${day}\n`;
};

export const getSectionTitleMarkdown = (sortedCommits, type) => {
  return `### ${type}: ${sortedCommits[type].commits.length}\n>_${sortedCommits[type].description}_\n`;
};

export const commitsToMarkdown = commits =>
  commits.map(commit => `- ${commit}\n`);
