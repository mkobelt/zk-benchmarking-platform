//go:build phase.verify

package phase

import (
	"log"

	"github.com/consensys/gnark/backend/groth16"
	"github.com/consensys/gnark/backend/witness"
	"github.com/mkobelt/zk-benchmarking-platform/systems/gnark/config/curve"
	"github.com/mkobelt/zk-benchmarking-platform/systems/gnark/io"
)

func Phase() {
	curveId := curve.Curve

	proof := groth16.NewProof(curveId)
	io.ReadFrom(proof, io.ProofFile)

	vk := groth16.NewVerifyingKey(curveId)
	io.ReadFrom(vk, io.VkFile)

	publicWitness, err := witness.New(curveId.ScalarField())
	if err != nil {
		log.Fatalf("Create witness: %v", err)
	}
	io.ReadFrom(publicWitness, io.WtnFile)

	if err := groth16.Verify(proof, vk, publicWitness); err != nil {
		log.Fatalf("Proof verification: %v", err)
	}
}
