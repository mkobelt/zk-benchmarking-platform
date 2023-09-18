# zk-benchmarking-platform

A research prototype of an extensible benchmarking platform for Zero-Knowledge Proof (ZKP) implementations.

## Setup

1. Clone this repository with the `--recurse-submodules` flag or run `git submodule update --init` after cloning.
2. Run `npm i` to install the dependencies.
3. Install [BenchExec](https://github.com/sosy-lab/benchexec).
4. If you want to benchmark ZoKrates, also install Rust and Cargo.

## Usage

`npm run bench` starts the benchmark execution with the [`config.json`](config.json) at the repository root.
You can either change this file or instruct the benchmark to use a different config file with the `-c` flag.
The JSON configuration accepts three entries:

`systems` determines the ZKP system instances that should be benchmarked.
For the available options, refer to the [`INTEGRATION_NAMES`](ts/integrations/index.ts#L6) for the `name` property and, depending on the selected system, to either [ZoKrates'](ts/integrations/zokrates.ts#L32) or [gnark's](ts/integrations/gnark.ts#L22) system configuration options.

`statements` allows selecting the instances of the predefined statements (the workload) that the previously selected `systems` should be benchmarked over.
Available options are specified in [`allStatements`](ts/workload/statement.ts#L5).
Note that not all `systems` may support every statement instance.
In this case, the incompatible configuration will be skipped for the run.

`profiler` accepts the configuration of the repetitions of each command that should get benchmarked.
