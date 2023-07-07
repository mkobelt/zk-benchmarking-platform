//go:build phase.setup

package phase

import (
	"fmt"
	"log"

	"github.com/consensys/gnark/backend/groth16"
	"github.com/consensys/gnark/backend/hint"
	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/frontend/cs/r1cs"
	"github.com/mkobelt/zk-benchmarking-platform/systems/gnark/config/curve"
	"github.com/mkobelt/zk-benchmarking-platform/systems/gnark/io"
	"github.com/mkobelt/zk-benchmarking-platform/systems/gnark/scenario"
)

func Phase() {
	cs, err := frontend.Compile(curve.Curve.ScalarField(), r1cs.NewBuilder, scenario.IScenario)
	if err != nil {
		log.Fatalf("Compile circuit: %v", err)
	}

	pk, vk, err := groth16.Setup(cs)
	if err != nil {
		log.Fatalf("Setup Groth: %v", err)
	}

	for i := 0; i < len(hint.GetRegistered()); i++ {
		fmt.Println(hint.Name(hint.GetRegistered()[i]))
	}

	io.WriteTo(cs, io.CsFile)
	io.WriteTo(pk, io.PkFile)
	io.WriteTo(vk, io.VkFile)
}
