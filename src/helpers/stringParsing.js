import VERSION from "../values/VERSION";
import { getVersionRegexp } from "./regularExpressions";

export const getVersionFromContent = content => {
  return content.match(getVersionRegexp);
};

export const incrementVersion = (version, versionType) => {
  const versionParts = version.split(".");

  switch (versionType) {
    case VERSION.MAJOR:
      versionParts[0] = Number(versionParts[0]) + 1;
      versionParts[1] = 0;
      versionParts[2] = 0;
      break;
    case VERSION.MINOR:
      versionParts[1] = Number(versionParts[1]) + 1;
      versionParts[2] = 0;
      break;
    case VERSION.PATCH:
      versionParts[2] = Number(versionParts[2]) + 1;
      break;
    default:
      return undefined;
  }

  return versionParts.join(".");
};
