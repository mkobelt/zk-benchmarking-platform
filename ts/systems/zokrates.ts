import * as path from "node:path";
import * as fs from "node:fs";
import * as child_process from "node:child_process";

import { Config, RunConfig, System } from "../system";
import { systemsDir } from "../fs";

const zokratesDir = path.resolve(systemsDir, "zokrates/");
const programFolder = path.resolve(zokratesDir, "programs/");
const programFiles = fs.readdirSync(programFolder)
    .filter(file => path.extname(file) === ".zok")
    .map(file => {
        const inputFile = path.resolve(programFolder, `${path.parse(file).name}.inputs`);
        if (!fs.existsSync(inputFile)) {
            throw new Error(`Inputs for program ${file} do not exist`);
        }
        return {
            "program": path.resolve(programFolder, file),
            "inputs": inputFile,
        }
    });

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
        const res = child_process.spawnSync(path.resolve(zokratesDir, "install.sh"));
        if (res.status !== 0) {
            throw res.error ?? new Error("Unknown error");
        }
        console.log("Built ZoKrates");

        const exePath = path.resolve(zokratesDir, "source/target/release/zokrates");
        if (!fs.existsSync(exePath)) {
            throw new Error("ZoKrates executable does not exist at expected path");
        }
        this.exe = exePath;
    }

    public *run(): Generator<RunConfig, void, void> {
        yield* this.newConfigLayer(curves, curve => curve, function*(curve) {
            yield* this.newEmptyConfigLayer("universal-setup", function*() {
                yield* this.newConfigLayer(schemes, scheme => scheme, function*(scheme) {
                    yield {
                        "cmdLine": this.cmdLine(
                            "universal-setup",
                            {
                                curve,
                                "proving-scheme": scheme,
                                "size": "18", // TODO Detect from out file, use ark-marlin rust lib
                            },
                        ),
                        "phase": "setup",
                    };
                });
            });

            yield* this.newEmptyConfigLayer("programs", function*() {
                yield* this.newConfigLayer(programFiles, ({program}) => path.parse(program).name, function*({program, inputs}) {
                    const compileDir = this.currentConfig.directory;
                    
                    yield {
                        "cmdLine": this.cmdLine(
                            "compile",
                            {
                                "input": program,
                                curve,
                                "stdlib-path": path.resolve(zokratesDir, "source/zokrates_stdlib/stdlib/"),
                                "r1cs": "/dev/null",
                            }
                        ),
                        "phase": "compile",
                    };
    
                    yield {
                        "cmdLine": this.cmdLine(
                            "compute-witness",
                            {
                                "abi-spec": path.join(compileDir, "abi.json"),
                                "arguments": fs.readFileSync(inputs, "utf-8").split(" "),
                                "input": path.join(compileDir, "out"),
                            },
                        ),
                        "phase": "prove",
                    }

                    yield* this.newConfigLayer(backends, ({name}) => name, function*(backend) {
                        if (!backend.supportsCurve(curve)) { return; }

                        yield* this.newConfigLayer(backend.schemes, scheme => scheme, function*(scheme) {
                            if (!backend.supportsScheme(scheme)) { return; }

                            const options: Record<string, string> = {};
                            if (universalSchemes.includes(scheme)) {
                                options["universal-setup-path"] = `${curve}/universal-setup/${scheme}/universal_setup.dat`;
                            }

                            yield {
                                "cmdLine": this.cmdLine(
                                    "setup",
                                    Object.assign(options, {
                                        "input": path.join(compileDir, "out"),
                                        "backend": backend.name,
                                        "proving-scheme": scheme,
                                    }),
                                ),
                                "phase": "setup",
                            };

                            yield {
                                "cmdLine": this.cmdLine(
                                    "generate-proof",
                                    {
                                        "backend": backend.name,
                                        "input": path.join(compileDir, "out"),
                                        "proving-key-path": path.join(this.currentConfig.directory, "proving.key"),
                                        "proving-scheme": scheme,
                                        "witness": path.join(compileDir, "witness"),
                                    }
                                ),
                                "phase": "prove",
                            }

                            yield {
                                "cmdLine": this.cmdLine(
                                    "verify",
                                    {
                                        "backend": backend.name,
                                        "proof-path": path.join(this.currentConfig.directory, "proof.json"),
                                        "verification-key-path": path.join(this.currentConfig.directory, "verification.key"),
                                    }
                                ),
                                "phase": "verify",
                                "config": new Config(),
                            }
                        });
                    });
                });
            });
        });
    }

    private cmdLine(action: string, options: Record<string, string | string[]>): string[] {
        const cmd = [this.exe, action];
        for (const [key, value] of Object.entries(options)) {
            const values = Array.isArray(value) ? value : [value];
            cmd.push(`--${key}`, ...values);
        }
        return cmd;
    }
}

const universalSchemes: Scheme[] = [
    "marlin",
];
