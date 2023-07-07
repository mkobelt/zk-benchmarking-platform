import * as child_process from "node:child_process";

export function startProcess(command: string, args: string[]) {
    return new Promise<void>((resolve, reject) => {
        const res = child_process.spawn(
            command,
            args,
            {
                "stdio": [
                    "ignore",   // Ignore stdin
                    "inherit",  // 
                    "inherit",     
                ],
            }
        );

        res.on("exit", (code, signal) => {
            if (signal !== null) {
                reject(new Error(`${command} interrupted by signal ${signal}`));
                return;
            }

            if (code !== 0) {
                reject(new Error(`${command} returned exit status ${code}`));
                return;
            }

            resolve();
        });

        res.on("error", reject);
    });
}