import { parseCli, parseConfig } from "./configurator";
import { INTEGRATIONS } from "./integrations";
import { profileRunConfig, writeSystemInformation } from "./profiler";

(async () => {
    const cliConfig = parseCli();
    const res = parseConfig(cliConfig.configPath);

    await writeSystemInformation();

    for (const systemConfig of res.systems) {
        for (const statementConfig of res.statements) {
            const config = {
                "system": systemConfig,
                "statement": statementConfig,
            };

            const runs = await INTEGRATIONS[systemConfig.name].run(config);
            if (runs === null) {
                console.warn("Skipping run");
                continue;
            }

            await profileRunConfig(systemConfig.name, runs, res.profiler.repeats);
        }
    }
})();
