import { z } from "zod";
import reporterConfig from "../reporter/config";
import profilerConfig from "../profiler/config";
import { INTEGRATIONS, INTEGRATION_SCHEMAS } from "../integrations";
import { allStatements } from "../workload/statement";

const schema = z.object({
    "systems": z.array(INTEGRATION_SCHEMAS).nonempty(),
    "statements": z.array(allStatements).nonempty(),
    "profiler": profilerConfig,
    "reporter": reporterConfig.optional(),
});

export default schema;
