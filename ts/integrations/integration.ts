import { z } from "zod";
import { AllStatements, statementInputs } from "../workload/statement";
import type { AsyncOrSync } from "ts-essentials";

export const PHASES = ["setup", "prove", "verify"] as const;
export type Phase = typeof PHASES[number];

export type Command = {
    command: string[];
    phase: "setup" | "prove" | "verify";
};

export type CommandSequence = {
    commands: Command[];
    config: string;
};

export type Curve = "bn128" | "bn254" | "bls12_377" | "bls12_381" | "bls24_315" | "bls24_317" | "bw6_761" | "bw6_633";

export type PickFromSchema<Schema extends z.ZodType<RunConfig<unknown, unknown>>, Props extends keyof z.infer<Schema>["system"] | null> =
    [Props] extends [keyof z.infer<Schema>["system"]]
        ? Pick<z.infer<Schema>["system"], Props>
        : {};

export type StatementIO = {
    input: string[];
    output: string[];
}

export type StatementInstance<U> = {
    statement: U;
} & StatementIO;

export type RunConfig<System, Statement> = {
    "system": System;
    "statement": Statement;
}

export abstract class Integration<
    CProvider extends Record<string, unknown>,
    CWrapper extends Record<string, unknown>,
    CStatement extends AllStatements,
    Schema extends z.ZodType<RunConfig<CProvider & CWrapper, CStatement>>,
    Interface,
    Statement,
> {
    public constructor(
        public readonly systemSchema: Schema,
    ) {}

    protected abstract getInterface(config: CProvider): AsyncOrSync<Interface>;
    protected abstract getStatement(statementConfig: AllStatements): Statement;
    protected abstract buildCommands(config: CWrapper, statement: StatementInstance<Statement>, api: Interface): AsyncOrSync<CommandSequence>;

    protected getStatementInputs(config: z.infer<Schema>): StatementIO {
        return statementInputs(config);
    }

    private getStatementInstance(config: z.infer<Schema>): StatementInstance<Statement> {
        const io = this.getStatementInputs(config);

        return {
            "statement": this.getStatement(config.statement),
            "input": io.input,
            "output": io.output,
        };
    };

    public async run(config: RunConfig<Record<string, unknown>, AllStatements>): Promise<CommandSequence | null> {
        const systemConfig = this.systemSchema.safeParse(config);
        if (!systemConfig.success) {
            return null;
        }

        // TODO Reuse results of previously run identical commands
        return this.buildCommands(
            systemConfig.data.system,
            this.getStatementInstance(systemConfig.data),
            await this.getInterface(systemConfig.data.system),
        );
    }
}
