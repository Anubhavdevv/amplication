import {
  CreateServerDockerComposeDBParams,
  EventNames,
  Module,
} from "@amplication/code-gen-types";
import { promises as fs } from "fs";
import path from "path";
import { prepareYamlFile } from "../../util/prepare-yaml-file";

import pluginWrapper from "../../plugin-wrapper";
import { DOCKER_COMPOSE_DB_FILE_NAME } from "../constants";
import DsgContext from "../../dsg-context";

export async function createDockerComposeDBFile(): Promise<Module[]> {
  const filePath = path.resolve(__dirname, DOCKER_COMPOSE_DB_FILE_NAME);

  const eventParams: CreateServerDockerComposeDBParams = {
    fileContent: await fs.readFile(filePath, "utf-8"),
    outputFileName: DOCKER_COMPOSE_DB_FILE_NAME.replace(".template", ""),
    updateProperties: [],
  };

  return pluginWrapper(
    createDockerComposeDBFileInternal,
    EventNames.CreateServerDockerComposeDB,
    eventParams
  );
}

async function createDockerComposeDBFileInternal(
  eventParams: CreateServerDockerComposeDBParams
): Promise<Module[]> {
  const { serverDirectories } = DsgContext.getInstance;
  const preparedFile = prepareYamlFile(
    eventParams.fileContent,
    eventParams.updateProperties
  );

  return [
    {
      path: path.join(
        serverDirectories.baseDirectory,
        eventParams.outputFileName
      ),
      code: preparedFile,
    },
  ];
}
