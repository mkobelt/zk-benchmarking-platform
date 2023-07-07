import { parseCli, parseConfig } from "./configurator";
import { INTEGRATIONS, getRun } from "./integrations";
import profile from "./profiler";

(async () => {
    const cliConfig = parseCli();
    const res = parseConfig(cliConfig.configPath);

    for (const config of res.systems) {
        for (const runset of res.statements) {
            const runs = await INTEGRATIONS[config.name].run(config, runset);
            if (runs === null) {
                console.warn("Skipping run");
                continue;
            }

            await profile(config.name, runs, res.profiler.repeats);
        }
    }
})();
