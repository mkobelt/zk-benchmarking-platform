//go:build scen.eddsa && curve.bw6_761

package eddsa

import (
	"io"

	"github.com/consensys/gnark-crypto/ecc/bw6-761/fr"
	"github.com/consensys/gnark-crypto/ecc/bw6-761/twistededwards/eddsa"
	"github.com/consensys/gnark-crypto/ecc/twistededwards"
	"github.com/consensys/gnark-crypto/hash"
)

var (
	FieldElement   fr.Element
	Signature      eddsa.Signature
	HashFunc       hash.Hash                                    = hash.MIMC_BW6_761
	EdwardsCurveId twistededwards.ID                            = twistededwards.BW6_761
	GenerateKey    func(r io.Reader) (*eddsa.PrivateKey, error) = eddsa.GenerateKey
)
