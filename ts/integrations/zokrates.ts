import { z } from "zod";
import { Command, CommandSequence, Integration, PickFromSchema, StatementIO, StatementInstance } from "./integration";
import { AsyncOrSync } from "ts-essentials";
import { AllStatements, allStatements } from "../workload/statement";
import * as child_process from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import { systemsDir } from "../fs";

const zokratesDir = path.resolve(systemsDir, "zokrates/");
const programFolder = path.resolve(zokratesDir, "programs/");

const curves = [
    "bn254",
    "bls12_381",
    "bls12_377",
    "bw6_761",
] as const;

const schemes = [
    "g16",
    "gm17",
    "marlin",
] as const;

const backends = [
    "bellman",
    "ark",
] as const;

const schema = z.object({
    "system": z.object({
        "curve": z.enum(curves),
        "scheme": z.enum(schemes),
        "backend": z.enum(backends),
    }),
    "statement": allStatements,
});

type Schema = typeof schema;
type CWrapper = PickFromSchema<Schema, null>;
type CProvider = PickFromSchema<Schema, "curve" | "scheme" | "backend">;

function createArray(n: bigint, mod: bigint) {
    const arr: string[] = [];
    for (let i = 0; i < 16; i++) {
        arr.push((n % mod).toString());
        n /= mod;
    }
    return arr.reverse();
}

export default new (class extends Integration<
    CWrapper,
    CProvider,
    AllStatements,
    Schema,
    string,
    string
>{
    protected override getInterface(_config: {}): AsyncOrSync<string> {
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
        return exePath;
    }

    protected override getStatement(statementConfig: AllStatements): string {
        if (statementConfig.name === "hash") {
            return `${statementConfig.function}.zok`;
        } else if (statementConfig.name === "signature") {
            return `eddsa.zok`;
        }

        throw new Error("not implemented");
    }

    protected override buildCommands(config: CProvider, statement: StatementInstance<string>, api: string): CommandSequence {
        const configStr = `${statement.statement}/${config.backend}/${config.scheme}/${config.curve}`;

        const commands: Command[] = [
            {
                "phase": "setup",
                "command": this.cmdLine(
                    api,
                    "compile",
                    {
                        "input": path.resolve(programFolder, statement.statement),
                        "curve": config.curve === "bn254" ? "bn128" : config.curve,
                        "stdlib-path": path.resolve(zokratesDir, "source/zokrates_stdlib/stdlib/"),
                        "r1cs": "/dev/null",
                    }
                ),
            },
            {
                "phase": "setup",
                "command": this.cmdLine(
                    api,
                    "setup",
                    {
                        "backend": config.backend,
                        "proving-scheme": config.scheme,
                    },
                ),
            },
            {
                "phase": "prove",
                "command": this.cmdLine(
                    api,
                    "compute-witness",
                    {
                        "arguments": statement.input,
                    },
                ),
            },
            {
                "phase": "prove",
                "command": this.cmdLine(
                    api,
                    "generate-proof",
                    {
                        "backend": config.backend,
                        "proving-scheme": config.scheme,
                    }
                ),
            },
            {
                "phase": "verify",
                "command": this.cmdLine(
                    api,
                    "verify",
                    {
                        "backend": config.backend,
                    }
                ),
            },
        ];

        return {
            commands,
            "config": configStr,
        }
    }

    protected override getStatementInputs(config: z.infer<Schema>): StatementIO {
        const io = super.getStatementInputs(config);

        if (config.statement.name === "signature") {
            // ZoKrates expects the message argument to be split up into 2 arrays of 8 u32's
            const m = !io.input.pop();
            io.input.push(...createArray(BigInt(m), 2n ** 32n));
        }

        return io;
    }

    private cmdLine(exe: string, action: string, options: Record<string, string | string[]>): string[] {
        const cmd = [exe, action];
        for (const [key, value] of Object.entries(options)) {
            const values = Array.isArray(value) ? value : [value];
            cmd.push(`--${key}`, ...values);
        }
        return cmd;
    }

})(
    schema,
);