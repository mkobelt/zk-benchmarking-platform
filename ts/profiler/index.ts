import { CommandSequence, PHASES, type Phase } from "../integrations/integration";
import * as path from "node:path";
import * as os from "node:os";
import { createDir, systemOutDir } from "../fs";
import * as child_process from "node:child_process";
import { RunMetrics, isTotal, metrics, writeStatistics } from "./statistics";
import collectMetrics from "./statistics";
import Decimal from "decimal.js";

export default async function profile(systemName: string, cmdSequence: CommandSequence, repeats: number) {
    const systemDir = systemOutDir(systemName);
    createDir(systemDir);

    console.log("Start run...");

    const outDir = path.resolve(systemDir, cmdSequence.config);
    createDir(outDir);

    const allRunResults: Record<Phase, RunMetrics>[] = [];

    for (let i = 0; i < repeats; i++) {
        const runResults = PHASES.reduce((cur, phase) => {
            cur[phase] = metrics.reduce((cur, metric) => {
                cur[metric] = new Decimal(0);
                return cur;
            }, {} as RunMetrics);
            return cur;
        }, {} as Record<Phase, RunMetrics>);

        allRunResults.push(runResults);

        for (const [index, command] of cmdSequence.commands.entries()) {
            const res = child_process.spawn(
                "runexec",
                [
                    "--read-only-dir",
                    "/",
                    "--overlay-dir",
                    "/home",
                    "--output",
                    path.resolve(outDir, `${index}_${command.phase}.log`),
                    "--output-directory",
                    outDir,
                    "--dir",
                    outDir,
                    "--",
                    ...command.command,
                ],
                {
                    "stdio": [
                        "ignore",   // Ignore stdin
                        "pipe",     // 
                        "ignore",
                    ],
                }
            );
    
            const results: Partial<RunMetrics> = {};
    
            await new Promise<void>((resolve, reject) => {
                res.stdout.setEncoding("utf8").on("data", (chunk: string) => {
                    Object.assign(results, collectMetrics(chunk.split(os.EOL)));
                });
    
                res.on("exit", (code, signal) => {
                    if (signal !== null) {
                        reject(new Error(`${command} interrupted by signal ${signal}`));
                        return;
                    }
        
                    if (code !== 0) {
                        reject(new Error(`${command} returned exit status ${code}`));
                        return;
                    }
        
                    resolve();
                });
        
                res.on("error", reject);
            });
    
            if (!isTotal(results)) {
                throw new Error(`Reported metrics are not complete`);
            }

            add(runResults[command.phase], results);
        }
    }

    writeStatistics(systemName, cmdSequence.config, allRunResults, repeats);

    console.log("Run ended");
}

function add(target: RunMetrics, source: RunMetrics) {
    for (const metric of metrics) {
        target[metric] = target[metric].add(source[metric]);
    }
}
