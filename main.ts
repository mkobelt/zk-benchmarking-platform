import * as child_process from "node:child_process";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";

import zokrates from "./zokrates";

export const resultDir = path.resolve(__dirname, "results/");

enum Phase {
    COMPILE,
    SETUP,
    COMPUTE_WITNESS,
    PROVE,
    VERIFY,
};

export interface Run<
    I extends Run | null = null,
    O extends Record<string, unknown> = {},
> {
    cmdLine: I extends Run ? (input: I["output"]) => string : string;
    config: string;
    output: I extends Run ? (prevOutputs: I["output"]) => I["output"] & O : O;
};

export type CompileRun = Run<null, {
    out: string;
}>;
export type SetupRun = Run<CompileRun, {
    provingKey: string;
    verificationKey: string;
}>;
export type WitnessRun = Run<CompileRun, {
    witness: string;
}>;

export type System = {
    runs: () => Generator<{
        cmdLine: string[];
        config: string;
    }, void, void>
}

const SYSTEMS: System[] = [
    zokrates,
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

(async() => {
    for (const system of SYSTEMS) {
        for (const run of system.runs()) {
            const res = child_process.spawnSync(
                "runexec",
                [
                    "--read-only-dir",
                    "/",
                    "--overlay-dir",
                    "/home",
                    "--output-directory",
                    resultDir,
                    "--",
                    ...run.cmdLine,
                ]);
            const out = res.stdout.toString();
            const lines = out.split(os.EOL);

            try {
                const results = collectStatistics(lines);

                const csv = `${stats.join(",")}\n${stats.map(stat => results[stat]).join(",")}`;
                fs.writeFileSync(path.resolve(resultDir, `${run.config}.csv`), csv);
            } catch (err) {
                console.log(err);
            } finally {
                fs.renameSync(path.resolve(__dirname, "output.log"), path.resolve(resultDir, `${run.config}.log`));
            }
        }
    }
})();
