//go:build scen.eddsa

package scenario

import (
	"crypto/rand"
	"fmt"
	"math/big"

	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/std/algebra/twistededwards"
	"github.com/consensys/gnark/std/hash/mimc"
	"github.com/consensys/gnark/std/signature/eddsa"
	eddsa_config "github.com/mkobelt/zk-benchmarking-platform/systems/gnark/config/statement/eddsa"
)

type eddsaCircuit struct {
	PublicKey eddsa.PublicKey   `gnark:",public"`
	Signature eddsa.Signature   `gnark:",public"`
	Message   frontend.Variable `gnark:",public"`
}

func (scen *eddsaCircuit) Assign(args []string) error {
	hFunc := eddsa_config.HashFunc.New()

	privateKey, err := eddsa_config.GenerateKey(rand.Reader)
	if err != nil {
		return fmt.Errorf("generate EdDSA key pair: %w", err)
	}

	publicKey := privateKey.PublicKey

	randomElement, err := eddsa_config.FieldElement.SetRandom()
	if err != nil {
		return fmt.Errorf("sample random field element: %w", err)
	}
	msg := randomElement.Marshal()

	rawSignature, err := privateKey.Sign(msg, hFunc)
	if err != nil {
		return fmt.Errorf("sign message: %w", err)
	}

	sig := &eddsa_config.Signature
	_, err = sig.SetBytes(rawSignature)
	if err != nil {
		return fmt.Errorf("set bytes: %w", err)
	}

	scen.Signature = eddsa.Signature{R: twistededwards.Point{X: sig.R.X, Y: sig.R.Y}, S: new(big.Int).SetBytes(sig.S[:])}
	scen.PublicKey = eddsa.PublicKey{A: twistededwards.Point{X: publicKey.A.X, Y: publicKey.A.Y}}
	scen.Message = msg

	return nil
}

func (circuit *eddsaCircuit) Define(api frontend.API) error {
	edCurve, err := twistededwards.NewEdCurve(api, eddsa_config.EdwardsCurveId)
	if err != nil {
		return err
	}

	hash, err := mimc.NewMiMC(api)
	if err != nil {
		return err
	}

	return eddsa.Verify(edCurve, circuit.Signature, circuit.Message, circuit.PublicKey, &hash)
}

var IScenario Scenario = &eddsaCircuit{}
