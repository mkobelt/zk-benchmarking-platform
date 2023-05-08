import * as child_process from "node:child_process";
import * as path from "node:path";

import { RunConfig, System } from "./system";
import { phases } from "./main";

const gnarkDir = path.resolve(__dirname, "systems/gnark");

const scenarios = Object.freeze([
    "mimc",
] as const);

const supportedCurves = Object.freeze({
    "bn254": "1",
    "bls12_377": "2",
    "bls12_381": "4",
    "bls24_315": "5",
    "bls24_317": "6",
    "bw6_761": "7",
    "bw6_633": "8",
} as const);

type Scenario = typeof scenarios[number];
type Curve = keyof typeof supportedCurves;

const scenarioInputs = Object.freeze({
    "mimc": mimcInputs,
}) satisfies Record<Scenario, (curve: Curve) => string[]>;

function mimcInputs(curve: Curve): string[] {
    switch(curve) {
        case "bn254":
            return ["1", "18045289051299654077710208499747278752099041449041972372412271818361923969579"];
        case "bls12_377":
            return ["1", "6145395493319860668016347858812770023447391082436850637703433811806758341511"];
        case "bls12_381":
            return ["1", "35137972692771717943992759113612269767581262500164574105059686144346651628747"];
        case "bls24_315":
            return ["1", "10675032186594769102008327189341124254282922948344351042425259179324447064949"];
        case "bls24_317":
            return ["1", "24073899436647966469753768012435382607114076207060896642383805613711216650410"];
        case "bw6_761":
            return ["1", "52462813434563329468569976771684427598929511969142750251201358722364231678191421315668519831414213234535031229629"];
        case "bw6_633":
            return ["1", "14997157209685850100394117856716406588017694194285850582469002077951986274150591220709168187062"];
    }
}

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

        for (const scenario of scenarios) {
            for (const [curve, curveID] of Object.entries(supportedCurves)) {
                const outDir = `${scenario}/${curve}`;

                for (const phase of phases) {
                    const extraArgs: string[] = [];
                    if (phase === "prove") {
                        extraArgs.push(...scenarioInputs[scenario](curve as Curve));
                    }
                    yield {
                        "cmdLine": [
                            exe,
                            phase,
                            scenario,
                            curveID,
                            this.resolveResultDir(outDir),
                            ...extraArgs,
                        ],
                        "config": `${scenario}.${curve}`,
                        phase,
                        "resultDir": outDir,
                    }
                }
            }
        }
    }
}
