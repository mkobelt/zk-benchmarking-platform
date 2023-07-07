//go:build scen.eddsa && curve.bls24_317

package eddsa

import (
	"io"

	"github.com/consensys/gnark-crypto/ecc/bls24-317/fr"
	"github.com/consensys/gnark-crypto/ecc/bls24-317/twistededwards/eddsa"
	"github.com/consensys/gnark-crypto/ecc/twistededwards"
	"github.com/consensys/gnark-crypto/hash"
)

var (
	FieldElement   fr.Element
	Signature      eddsa.Signature
	HashFunc       hash.Hash                                    = hash.MIMC_BLS24_317
	EdwardsCurveId twistededwards.ID                            = twistededwards.BLS24_317
	GenerateKey    func(r io.Reader) (*eddsa.PrivateKey, error) = eddsa.GenerateKey
)
