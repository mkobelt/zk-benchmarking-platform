import { z } from "zod";
import { StatementConfig, allStatements, statementInputs } from "../workload/statement";
import type {AsyncOrSync, Writable} from "ts-essentials";
import { supportedCurves } from "./gnark";

export type Command = {
    command: string[];
    phase: "setup" | "prove" | "verify";
};

export type CommandSequence = {
    commands: Command[];
    config: string;
};

export type Curve = "bn128" | "bn254" | "bls12_377" | "bls12_381" | "bls24_315" | "bls24_317" | "bw6_761" | "bw6_633";

export type MultiConfig = {
    [P in string]: unknown[] | MultiConfig;
};

export type PickSchema<SystemSchema extends z.ZodTypeAny, Props extends keyof z.infer<SystemSchema> | null> =
    [Props] extends [keyof z.infer<SystemSchema>]
        ? Pick<z.infer<SystemSchema>, Props>
        : {};

export type SingleConfig<C extends MultiConfig> = {
    [P in keyof C]: C[P] extends (infer E)[]
        ? E
        : C[P] extends MultiConfig
            ? SingleConfig<C[P]>
            : never
}

type Test = z.infer<z.ZodObject<{curve: z.ZodEnum<Writable<typeof supportedCurves>>}>>;

export type StatementInstance<U> = {
    statement: U;
    input: string[];
    output: string[];
}

type SimplifiedObject<T> = z.ZodObject<z.ZodRawShape, z.UnknownKeysParam, z.ZodTypeAny, T, T>;

export abstract class Integration<
    CProvider extends Record<string, unknown>,
    CWrapper extends Record<string, unknown>,
    SSystem extends SimplifiedObject<CProvider & CWrapper & {curve: Curve}>,
    Interface,
    Statement,
> {
    public constructor(
        public readonly systemSchema: SSystem,
    ) {}

    protected abstract getInterface(config: CProvider): AsyncOrSync<Interface>;
    protected abstract getStatementName(statementConfig: StatementConfig): Statement;
    protected abstract buildCommands(config: CWrapper, statement: StatementInstance<Statement>, api: Interface): AsyncOrSync<CommandSequence>;

    protected abstract getStatementInstance(statementConfig: StatementConfig, systemConfig: z.infer<SSystem>): StatementInstance<Statement>;

    protected abstract isValidConfig(systemConfig: CProvider & CWrapper, runset: StatementConfig): boolean;

    public async run(userConfig: unknown, statementConfig: StatementConfig): Promise<CommandSequence | null> {
        const systemConfig = this.systemSchema.parse(userConfig);
        if (!this.isValidConfig(systemConfig, statementConfig)) { return null; }

        // TODO Reuse results of previously run identical commands
        return this.buildCommands(
            systemConfig,
            this.getStatementInstance(statementConfig, systemConfig),
            await this.getInterface(systemConfig),
        );
    }
}

function getAllCombinations<T extends MultiConfig>(input: T): SingleConfig<T>[] {
    const keys = Object.keys(input);
    const combinations: SingleConfig<T>[] = [];

    if (keys.length === 0) {
        combinations.push({} as SingleConfig<T>); // Add empty object combination if input is empty
        return combinations;
      }
  
    function generateCombinations(index: number, currentCombination: SingleConfig<T>) {
        const key = keys[index];
        const value = input[key];
    
        if (Array.isArray(value)) {
            for (const element of value) {
                const combination = { ...currentCombination, [key]: element };
                if (index === keys.length - 1) {
                    combinations.push(combination);
                } else {
                    generateCombinations(index + 1, combination);
                }
            }
        } else {
            for (const nestedCombination of getAllCombinations(value)) {
                const combination = { ...currentCombination, [key]: nestedCombination };
                if (index === keys.length - 1) {
                    combinations.push(combination);
                } else {
                    generateCombinations(index + 1, combination);
                }
            }
        }
    }
  
    generateCombinations(0, {} as SingleConfig<T>);
  
    return combinations;
}
