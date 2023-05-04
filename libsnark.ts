import * as path from "node:path";

import {createDir, phases} from "./main";
import {type RunConfig, System} from "./system";

const curves = ["alt_bn128", "bn128", "edwards"] as const;

export default class LibSnark extends System {
    constructor() {
        super("libsnark");
    }

    public *run(): Generator<RunConfig, void, void> {
        for (const curve of curves) {
            const resultsPath = this.getPath(curve);
            createDir(resultsPath);
    
            for (const phase of phases) {
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
