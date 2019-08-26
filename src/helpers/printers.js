const colorPrint = (text, logColor) => {
  console.log(`${logColor}${text}`);
};

export const printWarning = text => colorPrint(text, LOG_COLOR.FG_YELLOW);

export const printError = text => colorPrint(text, LOG_COLOR.FG_RED);

export const printSuccess = text => colorPrint(text, LOG_COLOR.FG_GREEN);

export const printCancelAction = () => {
  printError("Release generation was cancelled.");
};

export const printSuccessReleaseGeneration = changelogFilename => {
  printSuccess(`Release successfully added to ${changelogFilename} file.`);
};
