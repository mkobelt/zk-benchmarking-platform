import * as path from "node:path";
import * as fs from "node:fs";
import * as child_process from "node:child_process";

import { RunConfig, System } from "./system";

const curves = [
    "bn128",
    "bls12_381",
    "bls12_377",
    "bw6_761",
] as const;

const schemes = [
    "g16",
    "gm17",
    "marlin",
] as const;

type Curve = typeof curves[number];
type Scheme = typeof schemes[number];

class Backend {
    name: string;
    curves: Curve[];
    schemes: Scheme[];

    constructor(
        name: string,
        supportedCurves: Curve[],
        supportedSchemes: Scheme[],
    ) {
        this.name = name;
        this.curves = supportedCurves;
        this.schemes = supportedSchemes;
    }

    supportsCurve(curve: Curve): boolean {
        return this.curves.includes(curve);
    }

    supportsScheme(scheme: Scheme): boolean {
        return this.schemes.includes(scheme);
    }
}

const backends: Backend[] = [
    new Backend(
        "ark",
        [
            "bn128",
            "bls12_381",
            "bls12_377",
            "bw6_761",
        ],
        [
            "g16",
            "gm17",
            "marlin",
        ],
    ),
    new Backend(
        "bellman",
        [
            "bn128",
            "bls12_381",
        ],
        [
            "g16",
        ],
    ),
];

export default class Zokrates extends System {
    private exe = "zokrates";

    constructor() {
        super("zokrates");
    }

    public build(): void {
        console.log("Building ZoKrates from source...");
        const res = child_process.spawnSync(path.resolve(__dirname, "systems/zokrates/install.sh"));
        if (res.status !== 0) {
            throw res.error ?? new Error("Unknown error");
        }
        console.log("Built ZoKrates");

        const exePath = path.resolve(__dirname, "systems/zokrates/source/target/release/zokrates");
        if (!fs.existsSync(exePath)) {
            throw new Error("ZoKrates executable does not exist at expected path");
        }
        this.exe = exePath;
    }

    public *run(): Generator<RunConfig, void, void> {
        for (const curve of curves) {
            for (const scheme of schemes) {
                if (!universalSchemes.includes(scheme)) { continue; }
                const config = `${curve}.${scheme}`;

                yield {
                    "cmdLine": this.cmdLine(
                        "universal-setup",
                        {
                            curve,
                            "proving-scheme": scheme,
                            "size": "18", // TODO Detect from out file, use ark-marlin rust lib
                        },
                    ),
                    config,
                    "phase": "setup",
                    "resultDir": `${curve}/universal-setup/${scheme}`,
                };
            }

            for (const inputFile of inputFiles) {
                const fileName = path.parse(inputFile).name;
                const curveFileConfig = `${curve}.${fileName}`;
                const compileOut = `${curve}/programs/${fileName}`;

                yield {
                    "cmdLine": this.cmdLine(
                        "compile",
                        {
                            "input": inputFile,
                            curve,
                            "stdlib-path": path.resolve(__dirname, "systems/zokrates/source/zokrates_stdlib/stdlib"),
                            "r1cs": "/dev/null",
                        }
                    ),
                    "config": curveFileConfig,
                    "phase": "compile",
                    "resultDir": compileOut,
                };

                for (const backend of backends) {
                    const backendConfig = `${curveFileConfig}.${backend.name}`;
                    if (!backend.supportsCurve(curve)) { continue; }

                    for (const scheme of backend.schemes) {
                        const schemeConfig = `${backendConfig}.${scheme}`;
                        if (!backend.supportsScheme(scheme)) { continue; }

                        const options: Record<string, string> = {};
                        if (universalSchemes.includes(scheme)) {
                            options["universal-setup-path"] = this.getPath(`${curve}/universal-setup/${scheme}/universal_setup.dat`);
                        }

                        yield {
                            "cmdLine": this.cmdLine(
                                "setup",
                                Object.assign(options, {
                                    "input": this.getPath(`${compileOut}/out`),
                                    "backend": backend.name,
                                    "proving-scheme": scheme,
                                }),
                            ),
                            "config": schemeConfig,
                            "phase": "setup",
                            "resultDir": this.getPath(compileOut, `${backend.name}/${scheme}`),
                        };
                    }
                }
            }
        }
    }

    private cmdLine(action: string, options: Record<string, string>): string[] {
        const cmd = [this.exe, action];
        for (const [key, value] of Object.entries(options)) {
            cmd.push(`--${key}`, value);
        }
        return cmd;
    }
}

const universalSchemes: Scheme[] = [
    "marlin",
];

const inputFolder = path.resolve(__dirname, "systems/zokrates/programs");
const inputFiles = fs.readdirSync(inputFolder).map(file => path.resolve(inputFolder, file));
