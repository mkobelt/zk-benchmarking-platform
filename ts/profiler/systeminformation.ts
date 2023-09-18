import * as si from "systeminformation";

export default async function collectSytemInformation(): Promise<string> {
    const data = await si.get({
        "system": "manufacturer, model, version, sku, virtual, virtualHost, raspberry",
        "bios": "vendor, version, releaseDate, revision, features",
        "baseboard": "manufacturer, model, version, assetTag, memMax, memSlots",
        "cpu": "*",
        "mem": "*",
        "os": "platform, distro, release, codename, kernel, arch, build, servicepack, uefi",
        "processes": "all, running, blocked, sleeping, unknown",
        "currentLoad": "currentLoad",
        "diskLayout": "type, name, vendor, size, totalCylinders, totalHeads, totalTracks, totalSectors, tracksPerCylinder, sectorsPerTrack, bytesPerSector, firmwareRevision, interfaceType, smartStatus, temperature",
    });

    return JSON.stringify(data, null, 4);
}