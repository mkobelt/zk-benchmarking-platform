export const Curves = Object.freeze([
    "bn128",
    "bn254",
    "bls12_377",
    "bls12_381",
    "bls24_315",
    "bls24_317",
    "bw6_761",
    "bw6_633",
] as const);
export type Curve = typeof Curves[number];

export const Scenarios = Object.freeze([
    "mimc",
] as const);
export type Scenario = typeof Scenarios[number];

type InOut = {
    inputs: string[];
    outputs: string[];
};

const scenarioIO = Object.freeze({
    "mimc": mimcInputs,
} as const satisfies Record<Scenario, (curve: Curve) => InOut | undefined>);

export function scenarioInputs(scenario: Scenario, curve: Curve): InOut {
    const ret = scenarioIO[scenario](curve);
    if (typeof ret === "undefined") {
        throw new Error(`arguments for scenario "${scenario}" for curve "${curve}" not implemented`);
    }
    return ret;
}

function mimcInputs(curve: Curve): InOut | undefined {
    const input = ["1"];
    switch(curve) {
        case "bn128":
            return {"inputs": input, "outputs": [""]};
        case "bn254":
            return {"inputs": input, "outputs": ["18045289051299654077710208499747278752099041449041972372412271818361923969579"]};
        case "bls12_377":
            return {"inputs": input, "outputs": ["6145395493319860668016347858812770023447391082436850637703433811806758341511"]};
        case "bls12_381":
            return {"inputs": input, "outputs": ["35137972692771717943992759113612269767581262500164574105059686144346651628747"]};
        case "bls24_315":
            return {"inputs": input, "outputs": ["10675032186594769102008327189341124254282922948344351042425259179324447064949"]};
        case "bls24_317":
            return {"inputs": input, "outputs": ["24073899436647966469753768012435382607114076207060896642383805613711216650410"]};
        case "bw6_761":
            return {"inputs": input, "outputs": ["52462813434563329468569976771684427598929511969142750251201358722364231678191421315668519831414213234535031229629"]};
        case "bw6_633":
            return {"inputs": input, "outputs": ["14997157209685850100394117856716406588017694194285850582469002077951986274150591220709168187062"]};
    }
}
