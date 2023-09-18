import { z } from "zod";
import { CommandSequence, Integration, PHASES, PickFromSchema, StatementInstance } from "./integration";
import * as path from "node:path"
import { systemsDir } from "../fs";
import { startProcess } from "../process";
import { AllStatements, allStatements, statementInputs } from "../workload/statement";
import { AsyncOrSync, UnreachableCaseError } from "ts-essentials";

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

const schema = z.object({
    "system": z.object({
        "curve": z.enum(supportedCurves),
    }),
    "statement": allStatements,
});

type Schema = typeof schema;
type CWrapper = PickFromSchema<Schema, "curve">;
type CProvider = PickFromSchema<Schema, null>;

export default new (class extends Integration<
    CWrapper,
    CProvider,
    AllStatements,
    Schema,
    void,
    string
> {
    protected override getInterface(_config: CProvider): AsyncOrSync<void> {}

    protected override getStatement(statementConfig: AllStatements): string {
        switch(statementConfig.name) {
            case "hash":
                return `${statementConfig.function}`;
            case "signature":
                return `eddsa`;
            default:
                throw new UnreachableCaseError(statementConfig);
        }
    }

    protected override async buildCommands(config: CWrapper, statement: StatementInstance<string>, _api: void): Promise<CommandSequence> {
        const commands = await Promise.all(PHASES.map(async phase => {
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
    schema,
);
