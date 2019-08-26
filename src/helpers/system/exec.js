import { spawnSync } from "child_process";

export const execCommand = (command, args) => {
  return spawnSync(command, args);
};

export const commandResultToString = commandResult =>
  commandResult.stdout.toString();
