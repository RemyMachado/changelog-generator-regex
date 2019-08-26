import fs from "fs";

export const writeToFile = (filename, content) => {
  fs.writeFileSync(filename, content);
};
