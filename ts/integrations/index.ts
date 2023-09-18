import { z } from "zod";
import Gnark from "./gnark";
import Zokrates from "./zokrates";
import { Integration } from "./integration";

const INTEGRATION_NAMES = [
    "gnark",
    "zokrates",
] as const;

export const INTEGRATIONS = {
    "gnark": Gnark,
    "zokrates": Zokrates,
} as const satisfies Record<typeof INTEGRATION_NAMES[number], Integration<any, any, any, any, any, any>>;

export const INTEGRATION_SCHEMAS = z.object({
    "name": z.enum(INTEGRATION_NAMES),
}).passthrough();
