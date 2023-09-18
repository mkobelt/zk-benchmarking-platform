import * as si from "systeminformation";

export default async function collectSytemInformation(): Promise<string> {
    return JSON.stringify(await si.getAllData(), null, 4);
}