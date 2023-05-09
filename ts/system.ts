import * as path from "node:path";
import { phases } from "./bench";
import { resultsDir } from "./fs";

export type RunConfig = {
    cmdLine: string[];
    config: string;
    phase: typeof phases[number];
    resultDir: string;
};

export abstract class System {
    public readonly name: string;

    private readonly resultsDir: string;

    constructor(name: string) {
        this.name = name;
        this.resultsDir = path.resolve(resultsDir, name);
    }

    public abstract run(): Generator<RunConfig, void, void>;
    public abstract build(): void;

    public resolveResultDir(...p: string[]): string {
        return path.resolve(this.resultsDir, ...p);
    }
}