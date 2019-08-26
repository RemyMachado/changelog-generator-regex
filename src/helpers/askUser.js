import prompts from "prompts";
import STRING from "../values/STRING";
import VERSION from "../values/VERSION";

export const askAutomaticDefaultChangelog = async filename => {
  const response = await prompts({
    type: "confirm",
    name: "value",
    message: `Do you want '${filename}' to be created with a default changelog ?`,
    initial: true
  });

  return response.value;
};

export const askVersionTypeIncrement = async () => {
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

export const askAutomaticDefaultCommitTypesConfig = async filename => {
  const response = await prompts({
    type: "confirm",
    name: "value",
    message: `Do you want '${filename}' to be created with default commit types ?`,
    initial: true
  });

  return response.value;
};

export const askLastCommitPattern = async () => {
  const response = await prompts({
    type: "text",
    name: "pattern",
    message: `Regular expression to match the 'STOP' commit (not included) ?`,
    initial: STRING.DEFAULT_GIT_LOG_STOP_PATTERN
  });

  return response.pattern;
};
