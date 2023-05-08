import * as path from "node:path";
import * as child_process from "node:child_process";

import {createDir, phases} from "./main";
import {type RunConfig, System} from "./system";

const curves = ["alt_bn128", "bn128", "edwards"] as const;

export default class Libsnark extends System {
    constructor() {
        super("libsnark");
    }

    public build(): void {
        // libsnark will be built directly with the executables in the compile step
    }

    public *run(): Generator<RunConfig, void, void> {
        for (const curve of curves) {
            const resultsPath = this.resolveResultDir(curve);
            createDir(resultsPath);

            for (const phase of phases) {
                compileExe(curve, phase);

                const exePath = path.resolve(__dirname, "systems/libsnark/programs/build", `${curve}_${phase}`);
                yield {
                    "cmdLine": [exePath, resultsPath],
                    "config": curve,
                    phase,
                    "resultDir": curve,
                }
            }
        }
    }
}

function compileExe(curve: string, phase: string): void {
    child_process.spawnSync(`${path.resolve(__dirname, "systems/libsnark/programs/compile.sh")} ${curve}_${phase}`);
}
