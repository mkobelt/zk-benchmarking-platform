import * as path from "node:path";
import * as fs from "node:fs";

import {resultDir} from "./main";

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

const universalSchemes: Scheme[] = [
    "marlin",
];

function cmdLine(action: string, options: Record<string, string>): string[] {
    const cmd = ["zokrates", action];
    for (const [key, value] of Object.entries(options)) {
        cmd.push(`--${key}`, value);
    }
    return cmd;
}

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

const inputFolder = path.resolve(__dirname, "systems/zokrates/");
const inputFiles = fs.readdirSync(inputFolder).map(file => path.resolve(inputFolder, file));

function* runs(): Generator<{
    cmdLine: string[];
    config: string;
}, void, void> {
    for (const curve of curves) {
        for (const scheme of schemes) {
            if (!universalSchemes.includes(scheme)) { continue; }
            const config = `${curve}.${scheme}`;

            yield {
                "cmdLine": cmdLine(
                    "universal-setup",
                    {
                        "universal-setup-path": `${config}.universal_setup.dat`,
                        curve,
                        "proving-scheme": scheme,
                        "size": "18", // TODO Detect from out file, use ark-marlin rust lib
                    },
                ),
                config,
            };
        }

        for (const inputFile of inputFiles) {
            const fileName = path.parse(inputFile).name;
            const curveFileConfig = `${curve}.${fileName}`;
            const compileOutput = `${curveFileConfig}.out`;
            const abi = `${curveFileConfig}.abi.json`;

            yield {
                "cmdLine": cmdLine(
                    "compile",
                    {
                        "input": inputFile,
                        "output": compileOutput,
                        curve,
                        "stdlib-path": "/home/max/.zokrates/stdlib",
                        "abi-spec": abi,
                        "r1cs": "/dev/null",
                    }
                ),
                "config": curveFileConfig,
            };

            for (const backend of backends) {
                const backendConfig = `${curveFileConfig}.${backend.name}`;
                if (!backend.supportsCurve(curve)) { continue; }

                for (const scheme of backend.schemes) {
                    const schemeConfig = `${backendConfig}.${scheme}`;
                    if (!backend.supportsScheme(scheme)) { continue; }

                    const provingKey = `${schemeConfig}.proving.key`;
                    const verificationKey = `${schemeConfig}.verification.key`;

                    const options: Record<string, string> = {};
                    if (universalSchemes.includes(scheme)) {
                        options["universal-setup-path"] = path.resolve(resultDir, `${curve}.${scheme}.universal_setup.dat`);
                    }

                    yield {
                        "cmdLine": cmdLine(
                            "setup",
                            Object.assign(options, {
                                "input": path.resolve(resultDir, compileOutput),
                                "proving-key-path": provingKey,
                                "verification-key-path": verificationKey,
                                "backend": backend.name,
                                "proving-scheme": scheme,
                            }),
                        ),
                        "config": schemeConfig,
                    };
                }
            }
        }
    }
}

export default {
    runs,
};
