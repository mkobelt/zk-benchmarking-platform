import { z } from "zod";
import { CommandSequence, Integration, PickSchema, StatementInstance } from "./integration";
import * as path from "node:path"
import { systemsDir } from "../fs";
import { phases } from "../system";
import { startProcess } from "../process";
import { StatementConfig, statementInputs } from "../workload/statement";
import { AsyncOrSync } from "ts-essentials";

const gnarkDir = path.resolve(systemsDir, "gnark/");

export const supportedCurves = [
    "bn254",
    "bls12_377",
    "bls12_381",
    "bls24_315",
    "bls24_317",
    "bw6_761",
    "bw6_633",
] as const;

const systemSchema = z.object({
    "curve": z.enum(supportedCurves),
});

type CWrapper = PickSchema<typeof systemSchema, "curve">;
type CProvider = PickSchema<typeof systemSchema, null>;

export default new (class extends Integration<
    CWrapper,
    CProvider,
    typeof systemSchema,
    void,
    string
> {
    protected getStatementInstance(statementConfig: StatementConfig, systemConfig: CWrapper & CProvider): StatementInstance<string> {
        const io = statementInputs(statementConfig, systemConfig);

        if (typeof io.preImage !== "undefined") {
            return {
                "statement": this.getStatementName(statementConfig),
                "input": [io.preImage],
                "output": [io.image],
            }
        }

        return {
            "statement": this.getStatementName(statementConfig),
            "input": [...io.r, io.s, ...io.a, io.m],
            "output": [],
        }
    }
    protected isValidConfig(_systemConfig: CWrapper & CProvider, runset: StatementConfig): boolean {
        switch(runset.name) {
            case "hash":
                switch(runset.function) {
                    case "mimc":
                        return true;
                    default:
                        return false;
                }
            case "signature":
                return true;
            default:
                return false;
        }
    }
    protected getInterface(_config: CProvider): AsyncOrSync<void> {}

    protected override getStatementName(statementConfig: StatementConfig): string {
        switch(statementConfig.name) {
            case "hash":
                return `${statementConfig.function}`;
            case "signature":
                return `eddsa`;
            case "set_membership":
                throw new Error("not implemented");
        }
    }

    protected override async buildCommands(config: CWrapper, statement: StatementInstance<string>, _api: void): Promise<CommandSequence> {
        const commands = await Promise.all(phases.map(async phase => {
            const extraArgs: string[] = [];
            if (phase === "prove") {
                extraArgs.push(
                    ...statement.input,
                    ...statement.output,
                );
            }

            const exe = path.join("build", `${statement.statement}_${phase}_${config.curve}`);

            await startProcess(
                "go",
                [
                    "build",
                    "-C",
                    gnarkDir,
                    "-o",
                    exe,
                    "-tags",
                    `scen.${statement.statement},phase.${phase},curve.${config.curve}`,
                ],
            )

            return {
                "command": [
                    path.resolve(gnarkDir, exe),
                    ...extraArgs,
                ],
                phase,
                "config": path.join(statement.statement, config.curve),
            }
        }));

        return {
            commands,
            "config": path.join(statement.statement, config.curve),
        };
    }
})(
    systemSchema,
);
