import * as path from "node:path";
import { resultsDir } from "./fs";

export const phases = ["compile", "setup", "prove", "verify"] as const;
export type Phase = typeof phases[number];

export class Config {
    private readonly paths: string[] = [];
    private readonly excluded = new Set<string>();

    public push(path: string, exclude = false): void {
        this.paths.push(path);

        if (exclude) {
            this.excluded.add(path);
        }
    }

    public pop(amount = 1): void {
        for (let i = 0; i < amount; i++) {
            const popped = this.paths.pop();
            if (typeof popped !== "undefined" && this.excluded.has(popped)) {
                this.excluded.delete(popped);
            }
        }
    }

    public toString(): string {
        return this.paths
            .filter(p => !this.excluded.has(p))
            .join(".");
    }

    public get directory(): string {
        return path.join(...this.paths);
    }
}

export type RunConfig = {
    cmdLine: string[];
    phase: Phase;
};

export abstract class System {
    public readonly name: string;

    public readonly resultsDir: string;
    public readonly currentConfig = new Config();

    constructor(name: string) {
        this.name = name;
        this.resultsDir = path.resolve(resultsDir, name);
    }

    public abstract run(): Generator<RunConfig, void, void>;
    public abstract build(): void;

    protected *newConfigLayer<T>(values: readonly T[], extractor: (t: T) => string, fn: (this: this, v: T) => Generator<RunConfig, void, void>): Generator<RunConfig, void, void> {
        for (const value of values) {
            this.currentConfig.push(extractor(value));
            yield* fn.call(this, value);
            this.currentConfig.pop();
        }
    }

    protected *newEmptyConfigLayer(name: string, fn: (this: this) => Generator<RunConfig, void, void>): Generator<RunConfig, void, void> {
        this.currentConfig.push(name, true);
        yield* fn.call(this);
        this.currentConfig.pop();
    }
}
