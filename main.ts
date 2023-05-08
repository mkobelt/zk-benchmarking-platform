import * as child_process from "node:child_process";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";

import { System } from "./system";
import Libsnark from "./libsnark";
import Zokrates from "./zokrates";

export function createDir(path: string) {
    try {
        fs.mkdirSync(path, {"recursive": true});
    } catch(err) {
        if (typeof err !== "object" || err === null || !("code" in err) || err.code !== "EEXIST") {
            throw err;
        }
    }
}

const resultDir = path.resolve(__dirname, "results");
const csvDir = path.resolve(resultDir, "csv");
createDir(csvDir);

export const phases = ["compile", "setup", "prove", "verify"] as const;

const SYSTEMS: System[] = [
    new Libsnark(),
    new Zokrates(),
];

const stats = [
    "cputime",
    "returnvalue",
    "walltime",
    "memory",
] as const;

const regex = new RegExp(`^(${stats.join("|")})=(.+)`);

type RunStats = Record<typeof stats[number], string>;

function collectStatistics(lines: string[]): RunStats {
    const results: Partial<RunStats> = {};

    for (const line of lines) {
        const match = line.match(regex);
        if (match === null) { continue; }

        const stat = match[1] as keyof RunStats;
        const value = match[2];

        results[stat] = value;
    }

    for (const stat of stats) {
        if (typeof results[stat] === "undefined") {
            throw new Error(`stat ${stat} not defined in ${results}`);
        }
    }

    return results as RunStats;
}

const csvHeader = `system,config,${stats.join(",")}\n`;

const resultFiles = phases.reduce((obj, phase) => {
    const fd = fs.openSync(path.resolve(csvDir, `${phase}.csv`), "w");
    fs.writeSync(fd, csvHeader);
    obj[phase] = fd;
    return obj;
}, {} as Record<typeof phases[number], number>);

for (const system of SYSTEMS) {
    const systemDir = system.resolveResultDir();
    createDir(systemDir);

    system.build();

    for (const run of system.run()) {
        const outDir = system.resolveResultDir(run.resultDir);
        createDir(outDir);

        const res = child_process.spawnSync(
            "runexec",
            [
                "--read-only-dir",
                "/",
                "--overlay-dir",
                "/home",
                "--output-directory",
                outDir,
                "--",
                ...run.cmdLine,
            ]);
        const out = res.stdout.toString();
        const lines = out.split(os.EOL);

        try {
            const results = collectStatistics(lines);
            const csv = `${system.name},${run.config},${stats.map(stat => results[stat]).join(",")}\n`;

            fs.writeSync(resultFiles[run.phase], csv);
        } catch (err) {
            console.log(err);
        } finally {
            fs.renameSync(path.resolve(__dirname, "output.log"), path.resolve(outDir, `${run.phase}.log`));
        }
    }
}
