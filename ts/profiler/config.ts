import { z } from "zod";

const config = z.object({
    "repeats": z.number().positive(),
});

export default config;
