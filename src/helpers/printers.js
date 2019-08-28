import LOG_COLOR from "../values/LOG_COLOR";

const colorPrint = (text, logColor) => {
  console.log(`${logColor}${text}`);
};

export const printNormal = text => console.log(text);

export const printWarning = text => colorPrint(text, LOG_COLOR.FG_YELLOW);

export const printError = text => colorPrint(text, LOG_COLOR.FG_RED);

export const printSuccess = text => colorPrint(text, LOG_COLOR.FG_GREEN);

export const printCancelAction = () => {
  printError("Release generation was cancelled.");
};

export const printSuccessReleaseGeneration = (
  changelogFilename,
  oldVersion,
  newVersion
) => {
  printSuccess(
    `Release successfully added to ${changelogFilename} file and package.json.\n${oldVersion} -> ${newVersion}`
  );
};
