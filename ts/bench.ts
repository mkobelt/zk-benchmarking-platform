import * as child_process from "node:child_process";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";

import { Phase, System, phases } from "./system";
import Zokrates from "./systems/zokrates";
import Gnark from "./systems/gnark";
import { createDir, csvDir, rootDir } from "./fs";

createDir(csvDir);

const systems: System[] = [
    new Zokrates(),
    new Gnark(),
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
}, {} as Record<Phase, number>);

for (const system of systems) {
    const systemDir = system.resultsDir;
    createDir(systemDir);

    system.build();

    for (const run of system.run()) {
        const outDir = path.resolve(systemDir, system.currentConfig.directory);
        createDir(outDir);

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
        const out = res.stdout.toString();
        const lines = out.split(os.EOL);

        try {
            const results = collectStatistics(lines);
            const csv = `${system.name},${system.currentConfig.toString()},${stats.map(stat => results[stat]).join(",")}\n`;

            fs.writeSync(resultFiles[run.phase], csv);
        } catch (err) {
            console.log(err);
        }
    }
}
