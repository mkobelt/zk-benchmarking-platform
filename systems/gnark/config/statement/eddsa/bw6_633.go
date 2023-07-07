//go:build scen.eddsa && curve.bw6_633

package eddsa

import (
	"io"

	"github.com/consensys/gnark-crypto/ecc/bw6-633/fr"
	"github.com/consensys/gnark-crypto/ecc/bw6-633/twistededwards/eddsa"
	"github.com/consensys/gnark-crypto/ecc/twistededwards"
	"github.com/consensys/gnark-crypto/hash"
)

var (
	FieldElement   fr.Element
	Signature      eddsa.Signature
	HashFunc       hash.Hash                                    = hash.MIMC_BW6_633
	EdwardsCurveId twistededwards.ID                            = twistededwards.BW6_633
	GenerateKey    func(r io.Reader) (*eddsa.PrivateKey, error) = eddsa.GenerateKey
)
