import { UnreachableCaseError } from "ts-essentials";
import { z } from "zod";
import { RunConfig, StatementIO } from "../integrations/integration";

export const allStatements = z.discriminatedUnion("name", [
    z.object({
        "name": z.literal("hash"),
        "function": z.enum(["sha256", "mimc"]),
    }),
    z.object({
        "name": z.literal("signature"),
        "type": z.literal("eddsa"),
    }),
]);

export type AllStatements = z.infer<typeof allStatements>;

export function statementInputs(config: RunConfig<Record<string, unknown>, AllStatements>): StatementIO {
    switch (config.statement.name) {
        case "hash":
            switch (config.statement.function) {
                case "sha256":
                    return {
                        "input": ["alsdkjkf"],
                        "output": ["aolsdjf"],
                    };
                case "mimc": {
                    let image: string;
                    switch(config.system.curve) {
                        case "bls12_377":
                            image = "1683808678237589890991940660402320082539960358730885270986867502922067028343";
                            break;
                        case "bls12_381":
                            image = "9609944517377197017437138930324005647583071543726368180316669152326447041177";
                            break;
                        case "bls24_315":
                            image = "8292564672613974561778331694868743899755316462218397557784097073783444491614";
                            break;
                        case "bls24_317":
                            image = "18620627322597581227961491848331383812143930512558561572383082896994412368445";
                            break;
                        case "bn128":
                            image = "123";
                            break;
                        case "bn254":
                            image = "13248831399819789889404171255535350089059524493356144500109438146102501272052";
                            break;
                        case "bw6_633":
                            image = "36965077899919274687803581679180675583437477955815006193859650118462307729421763313661869955637";
                            break;
                        case "bw6_761":
                            image = "160432259944223943634951850830609913414856793063347309293008303627868452429703157366913315547528893131012420194897";
                            break;
                        default:
                            throw new Error("Unknown curve");
                    }

                    return {
                        "input": ["2500529438769068184939310842255337777019455354716472599427671106327738757593"],
                        "output": [image],
                    }
                }
                default:
                    throw new UnreachableCaseError(config.statement.function);
            }
        case "signature":
            return {
                "input": [
                    "10041775272610680597649138558111867140088287599035431170728241228669634925671",
                    "19045584355489137154300255038437027652180257880634202059955435891798466344432",
                    "14517916597883362893064608394843629693674165114908520112595055382047085957383",
                    "14897476871502190904409029696666322856887678969656209656241038339251270171395",
                    "16668832459046858928951622951481252834155254151733002984053501254009901876174",
                    "11908494008557430893638745225033142136929183395599991460993160940994523916657640981651909087138130190920320833227914842955780438350735473049230499968480372",
                ],
                "output": [],
            }
        default:
            throw new UnreachableCaseError(config.statement);
    }
}
