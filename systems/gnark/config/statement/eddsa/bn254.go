//go:build scen.eddsa && curve.bn254

package eddsa

import (
	"io"

	"github.com/consensys/gnark-crypto/ecc/bn254/fr"
	"github.com/consensys/gnark-crypto/ecc/bn254/twistededwards/eddsa"
	"github.com/consensys/gnark-crypto/ecc/twistededwards"
	"github.com/consensys/gnark-crypto/hash"
)

var (
	FieldElement   fr.Element
	Signature      eddsa.Signature
	HashFunc       hash.Hash                                    = hash.MIMC_BN254
	EdwardsCurveId twistededwards.ID                            = twistededwards.BN254
	GenerateKey    func(r io.Reader) (*eddsa.PrivateKey, error) = eddsa.GenerateKey
)
