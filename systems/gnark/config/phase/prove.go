//go:build phase.prove

package phase

import (
	"log"
	"os"

	"github.com/consensys/gnark/backend"
	"github.com/consensys/gnark/backend/groth16"
	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/std/math/bits"
	"github.com/mkobelt/zk-benchmarking-platform/systems/gnark/config/curve"
	"github.com/mkobelt/zk-benchmarking-platform/systems/gnark/io"
	"github.com/mkobelt/zk-benchmarking-platform/systems/gnark/scenario"
)

func Phase() {
	scen := scenario.IScenario
	curveId := curve.Curve

	if err := scen.Assign(os.Args[1:]); err != nil {
		log.Fatalf("Assign values: %v", err)
	}

	witness, err := frontend.NewWitness(scen, curveId.ScalarField())
	if err != nil {
		log.Fatalf("Compute witness: %v", err)
	}

	cs := groth16.NewCS(curveId)
	io.ReadFrom(cs, io.CsFile)

	pk := groth16.NewProvingKey(curveId)
	io.ReadFrom(pk, io.PkFile)

	proof, err := groth16.Prove(cs, pk, witness, backend.WithHints(bits.NBits))
	if err != nil {
		log.Fatalf("Generate proof: %v", err)
	}

	publicWitness, err := witness.Public()
	if err != nil {
		log.Fatalf("Public witness computation: %v", err)
	}

	io.WriteTo(proof, io.ProofFile)
	io.WriteTo(publicWitness, io.WtnFile)
}
