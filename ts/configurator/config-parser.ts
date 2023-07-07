import {readFileSync} from "node:fs";
import configSchema from "./config-aggregator";

export default function parse(configPath: string) {
    let json;
    try {
        json = readConfig(configPath);
    } catch(err) {
        throw new Error("Reading config failed", {
            "cause": err,
        });
    }

    return configSchema.parse(json);
}

function readConfig(configPath: string) {
    const rawConfig = readFileSync(configPath, {
        "encoding": "utf-8",
    });

    return JSON.parse(rawConfig);
}
