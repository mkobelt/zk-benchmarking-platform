//go:build scen.eddsa && curve.bls24_315

package eddsa

import (
	"io"

	"github.com/consensys/gnark-crypto/ecc/bls24-315/fr"
	"github.com/consensys/gnark-crypto/ecc/bls24-315/twistededwards/eddsa"
	"github.com/consensys/gnark-crypto/ecc/twistededwards"
	"github.com/consensys/gnark-crypto/hash"
)

var (
	FieldElement   fr.Element
	Signature      eddsa.Signature
	HashFunc       hash.Hash                                    = hash.MIMC_BLS24_315
	EdwardsCurveId twistededwards.ID                            = twistededwards.BLS24_315
	GenerateKey    func(r io.Reader) (*eddsa.PrivateKey, error) = eddsa.GenerateKey
)
