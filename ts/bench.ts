import * as child_process from "node:child_process";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";

import { Phase, System, phases } from "./system";
import Zokrates from "./systems/zokrates";
import Gnark from "./systems/gnark";
import { createDir, csvDir } from "./fs";

createDir(csvDir);

const systems: System[] = [
    new Zokrates(),
    new Gnark(),
];

const stats = [
    "cputime",
    "walltime",
    "memory",
] as const;

type RunStats = Record<typeof stats[number], string>;

function collectStatistics(lines: string[]): RunStats {
    const results: Partial<RunStats> = {};

    for (const line of lines) {
        const match = line.match(/^(.+?)=(.+)$/);
        if (match === null) {
            if (line === "") {
                continue;
            }
            throw new Error(`unrecognized output from runexec: "${line}"`);
        }

        const [, stat, value] = match;

        switch(stat) {
            case "memory":
            case "cputime":
            case "walltime":
                results[stat] = value.slice(0, -1); // Trim suffix (bytes or seconds)
                break;
            case "returnvalue":
                if (value !== "0") {
                    throw new Error(`run exited with non-zero return value ${value}`);
                }
                break;
            case "terminationreason":
                throw new Error(`benchexec terminated with reason "${value}"`);
            case "exitsignal":
                throw new Error(`run killed with signal "${value}"`);
            case "starttime":
            case "blkio-read":
            case "blkio-write":
                break;
            default:
                if (!stat.startsWith("cputime-cpu")) {
                    throw new Error(`unknown run result with key "${stat}" and value "${value}"`);
                }
        }
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
}, {} as Record<Phase, number>);

for (const system of systems) {
    console.group(system.name);

    const systemDir = system.resultsDir;
    createDir(systemDir);

    system.build();

    for (const run of system.run()) {
        // Acessing the current config via the System seems unidiomatic
        console.group(`${run.phase}: ${system.currentConfig.toString()}`);

        const outDir = path.resolve(systemDir, system.currentConfig.directory);
        createDir(outDir);

        console.log("Start run...");

        const res = child_process.spawnSync(
            "runexec",
            [
                "--read-only-dir",
                "/",
                "--overlay-dir",
                "/home",
                "--output",
                path.resolve(outDir, `${run.phase}.log`),
                "--output-directory",
                outDir,
                "--dir",
                systemDir,
                "--",
                ...run.cmdLine,
            ]);

        console.log("Run ended");

        const out = res.stdout.toString();
        const lines = out.split(os.EOL);

        try {
            const results = collectStatistics(lines);
            const csv = `${system.name},${system.currentConfig.toString()},${stats.map(stat => results[stat]).join(",")}\n`;

            fs.writeSync(resultFiles[run.phase], csv);
        } catch (err) {
            console.log(err);
        }
        console.groupEnd();
    }
    console.groupEnd();
}
