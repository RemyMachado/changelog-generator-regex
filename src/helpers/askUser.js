import prompts from "prompts";
import STRING from "../values/STRING";
import VERSION from "../values/VERSION";

export const askWantDefaultChangelog = async filename => {
  const response = await prompts({
    type: "confirm",
    name: "value",
    message: `Do you want '${filename}' to be created with a default changelog ?`,
    initial: true
  });

  return response.value;
};

export const askVersionIncrementType = async () => {
  const response = await prompts({
    type: "number",
    name: "value",
    message: "Do you want to increase the 1=major, 2=minor, 3=patch",
    validate: value =>
      value === VERSION.MAJOR ||
      value === VERSION.MINOR ||
      value === VERSION.PATCH
        ? true
        : `Choose 1, 2 or 3`
  });

  return response.value;
};

export const askFilename = async (message, initial) => {
  const response = await prompts({
    type: "text",
    name: "filename",
    message,
    initial
  });

  return response.filename;
};

export const askWantDefaultConfig = async filename => {
  const response = await prompts({
    type: "confirm",
    name: "value",
    message: `Do you want '${filename}' to be created with default commit types ?`,
    initial: true
  });

  return response.value;
};

export const askLastCommitRegex = async initial => {
  const response = await prompts({
    type: "text",
    name: "inputPattern",
    message: `Regular expression to match the last commit (excluded)`,
    initial
  });

  if (response.inputPattern) {
    if (response.inputPattern instanceof RegExp) {
      return response.inputPattern;
    }

    const flags = response.inputPattern.replace(/.*\/([gimsuy]*)$/, "$1");
    const pattern = response.inputPattern.replace(
      new RegExp("^/(.*?)/" + flags + "$"),
      "$1"
    );
    return new RegExp(pattern, flags);
  }

  return response;
};
