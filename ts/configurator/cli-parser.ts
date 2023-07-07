import * as commandLineArgs from "command-line-args";

const DEFAULT_CONFIG_PATH = "config.json";

export type CliConfig = {
    configPath: string;
};

export default function parse(): CliConfig {
    const opts = commandLineArgs([
        {
            "name": "config",
            "alias": "c",
            "defaultOption": true,
            "defaultValue": DEFAULT_CONFIG_PATH,
        }
    ]);

    return {
        "configPath": opts.config,
    };
}