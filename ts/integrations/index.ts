import { z } from "zod";
import Gnark from "./gnark";
import Zokrates from "./zokrates";
import { StatementConfig } from "../workload/statement";
import { Integration } from "./integration";

export const INTEGRATION_NAMES = [
    "gnark",
    "zokrates",
] as const;

export const INTEGRATIONS = {
    "gnark": Gnark,
    "zokrates": Zokrates,
} as const satisfies Record<typeof INTEGRATION_NAMES[number], Integration<any, any, any, any, any>>;

export const INTEGRATION_SCHEMAS = z.object({
    "name": z.enum(INTEGRATION_NAMES),
}).passthrough();

type T = z.infer<typeof INTEGRATION_SCHEMAS>

export function getRun(config: z.infer<typeof INTEGRATION_SCHEMAS>, statementConfig: StatementConfig) {
    switch(config.name) {
        case "gnark":
            return Gnark.run(config, statementConfig);
        case "zokrates":
            return Zokrates.run(config, statementConfig);
    }
}
