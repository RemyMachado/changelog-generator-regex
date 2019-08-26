import fs from "fs";
import STRING from "../../values/STRING";

export const getFileContent = filename => {
  return fs.readFileSync(filename, { encoding: STRING.READ_ENCODING });
};

export const fileExists = filename => {
  return fs.existsSync(filename);
};
