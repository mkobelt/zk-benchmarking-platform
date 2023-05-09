import * as child_process from "node:child_process";
import * as path from "node:path";

import { RunConfig, System, phases } from "../system";
import { systemsDir } from "../fs";
import { Curve, Scenario, Scenarios, scenarioInputs } from "../config";

const gnarkDir = path.resolve(systemsDir, "gnark/");

const supportedCurves = Object.freeze({
    "bn254": "1",
    "bls12_377": "2",
    "bls12_381": "4",
    "bls24_315": "5",
    "bls24_317": "6",
    "bw6_761": "7",
    "bw6_633": "8",
} as const satisfies Partial<Record<Curve, string>>);

export default class Gnark extends System {
    constructor() {
        super("gnark");
    }

    public build(): void {
        // TODO Handle failure
        child_process.spawnSync("go", ["build", "-C", gnarkDir, "-o", "build/"]);
    }

    public *run(): Generator<RunConfig, void, void> {
        const exe = path.resolve(gnarkDir, "build/gnark");

        yield* this.newConfigLayer(Scenarios, s => s, function*(scenario) {
            yield* this.newConfigLayer(Object.entries(supportedCurves), ([curve]) => curve, function*([curve, curveID]) {
                for (const phase of phases) {
                    const extraArgs: string[] = [];
                    if (phase === "prove") {
                        const {inputs, outputs} = scenarioInputs(scenario, curve as Curve);
                        extraArgs.push(...inputs.concat(outputs));
                    }
                    yield {
                        "cmdLine": [
                            exe,
                            phase,
                            scenario,
                            curveID,
                            this.currentConfig.directory,
                            ...extraArgs,
                        ],
                        phase,
                    }
                }
            });
        });
    }
}
