import Decimal from "decimal.js";
import { createDir, csvDir } from "../fs";
import { Command } from "../integrations/integration";
import { Phase, phases } from "../system";
import * as fs from "node:fs";
import * as path from "node:path";

export const metrics = [
    "cputime",
    "walltime",
    "memory",
] as const;

type Metric = typeof metrics[number];

export type RunMetrics = Record<Metric, Decimal>;

export default function collectMetrics(lines: string[]): Partial<RunMetrics> {
    const results: Partial<RunMetrics> = {};

    for (const line of lines) {
        const match = line.match(/^(.+?)=(.+)$/);
        if (match === null) {
            if (line === "") {
                continue;
            }
            throw new Error(`unrecognized output from runexec: "${line}"`);
        }

        const [, metric, value] = match;

        switch(metric) {
            case "memory":
            case "cputime":
            case "walltime":
                results[metric] = new Decimal(value.slice(0, -1)); // Trim suffix (bytes or seconds)
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
                if (!metric.startsWith("cputime-cpu")) {
                    throw new Error(`unknown run result with key "${metric}" and value "${value}"`);
                }
        }
    }

    for (const metric of metrics) {
        if (typeof results[metric] === "undefined") {
            throw new Error(`metric ${metric} not defined in ${results}`);
        }
    }

    return results;
}

export function isTotal(results: Partial<RunMetrics>): results is RunMetrics {
    for (const metric of metrics) {
        if (typeof results[metric] === "undefined") {
            return false;
        }
    }
    return true;
}

const metricsFunctions = metrics.map(stat => [`avg_${stat}`, `sd_${stat}`] as [`avg_${Metric}`, `sd_${Metric}`]);
const csvHeader = `system,config,${metricsFunctions.flat().join(",")}\n`;

createDir(csvDir);

const resultFiles = phases.reduce((obj, phase) => {
    const fd = fs.openSync(path.resolve(csvDir, `${phase}.csv`), "w");
    fs.writeSync(fd, csvHeader);
    obj[phase] = fd;
    return obj;
}, {} as Record<Phase, number>);

function computeStats(results: Record<Metric, Decimal[]>, repeats: number): Record<Metric, {avg: Decimal; sd: Decimal}> {    
    return metrics.reduce((cur, metric) => {
        const avg = results[metric].reduce(
            (acc, cur) => acc.plus(cur),
            new Decimal(0)
        ).div(repeats);
        
        const sd = results[metric].reduce((acc, cur) => {
            return acc.add(cur.sub(avg).pow(2))
        }, new Decimal(0)).div(repeats).sqrt();

        cur[metric] = {
            avg,
            sd,
        }
        return cur;
    }, {} as Record<Metric, {avg: Decimal; sd: Decimal}>);
}

export function writeStatistics(name: string, config: string, allRunResults: Record<Phase, RunMetrics>[], repeats: number) {
    const final = phases.reduce((cur, phase) => {
        cur[phase] = metrics.reduce((cur, metric) => {
            cur[metric] = [];
            return cur;
        }, {} as Record<Metric, Decimal[]>);
        return cur;
    }, {} as Record<Phase, Record<Metric, Decimal[]>>);

    for (const runResults of allRunResults) {
        for (const phase of phases) {
            const run = runResults[phase];
            for (const metric of metrics) {
                final[phase][metric].push(run[metric]);
            }
        }
    }

    for (const phase of phases) {
        const statistics = computeStats(final[phase], repeats);

        const stringStats = metrics.map(metric => {
            const stats = statistics[metric];
            return [stats.avg, stats.sd];
        }).flat().join(",");

        const csv = `${name},${config},${stringStats}\n`;

        fs.writeSync(resultFiles[phase as Phase], csv);
    }
}
