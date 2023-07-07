import * as path from "node:path";
import * as fs from "node:fs";

export const rootDir = path.resolve(__dirname, "../");
export const systemsDir = path.resolve(rootDir, "systems/");
export const resultsDir = path.resolve(rootDir, "results/");
export const csvDir = path.resolve(resultsDir, "csv/");

export function createDir(path: string) {
    try {
        fs.mkdirSync(path, {"recursive": true});
    } catch(err) {
        if (typeof err !== "object" || err === null || !("code" in err) || err.code !== "EEXIST") {
            throw err;
        }
    }
}

export function systemOutDir(system: string) {
    return path.resolve(resultsDir, "systems", system);
}
