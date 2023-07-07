//go:build scen.mimc

package scenario

import (
	"errors"

	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/std/hash/mimc"
)

type mimcScenario struct {
	PreImage frontend.Variable
	Image    frontend.Variable `gnark:",public"`
}

func (scen *mimcScenario) Assign(args []string) error {
	if len(args) != 2 {
		return errors.New("require preimage and image arguments")
	}

	scen.PreImage = args[0]
	scen.Image = args[1]

	return nil
}

func (scen *mimcScenario) Define(api frontend.API) error {
	circ, err := mimc.NewMiMC(api)
	if err != nil {
		return err
	}

	circ.Write(scen.PreImage)

	api.AssertIsEqual(circ.Sum(), scen.Image)

	return nil
}

var IScenario Scenario = &mimcScenario{}
