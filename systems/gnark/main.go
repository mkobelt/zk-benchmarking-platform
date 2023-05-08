package main

import (
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"

	"github.com/consensys/gnark-crypto/ecc"
	"github.com/consensys/gnark/backend/groth16"
	"github.com/consensys/gnark/backend/witness"
	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/frontend/cs/r1cs"
	"github.com/consensys/gnark/logger"
	"github.com/mkobelt/zk-benchmarking-platform/systems/gnark/scenario"
	"github.com/rs/zerolog"
)

const (
	csFile    string = "constraint_system"
	pkFile           = "proving.key"
	vkFile           = "verification.key"
	proofFile        = "proof"
	wtnFile          = "witness"
)

var curveID ecc.ID
var inDir string
var scen scenario.Scenario
var scenarioArgs []string

func main() {
	args := os.Args

	if len(args) < 5 {
		log.Fatalf(`Usage: %s phase scenario curveID inDir [scenarioArgs...]`, args[0])
	}

	var phaseFn func()
	switch phase := args[1]; phase {
	case "compile":
		phaseFn = compile
	case "setup":
		phaseFn = setup
	case "prove":
		phaseFn = prove
	case "verify":
		phaseFn = verify
	default:
		log.Fatalf(`Unknown phase %s`, phase)
	}

	switch s := args[2]; s {
	case "mimc":
		scen = &scenario.MimcScenario{}
	default:
		log.Fatalf(`Unknown scenario "%s"`, s)
	}

	curveID = getCurveID(args[3])
	inDir = args[4]
	scenarioArgs = args[5:]

	// Overwrite gnark's default logger to disable color output since the benchmark tool writes stdout to a file
	output := zerolog.ConsoleWriter{Out: os.Stdout, NoColor: true, TimeFormat: "15:04:05"}
	newLogger := zerolog.New(output).With().Timestamp().Logger()
	logger.Set(newLogger)

	phaseFn()
}

func getCurveID(curveIDStr string) ecc.ID {
	curveIDInt, err := strconv.Atoi(curveIDStr)
	if err != nil {
		log.Fatalf("Convert curve string to integer: %v", err)
	}

	return ecc.ID(curveIDInt)
}

func compile() {
	cs, err := frontend.Compile(curveID.ScalarField(), r1cs.NewBuilder, scen)
	if err != nil {
		log.Fatalf("Compile circuit: %v", err)
	}

	writeTo(cs, csFile)
}

func setup() {
	cs := groth16.NewCS(curveID)
	readFrom(cs, csFile)

	pk, vk, err := groth16.Setup(cs)
	if err != nil {
		log.Fatalf("Setup Groth: %v", err)
	}

	writeTo(pk, pkFile)
	writeTo(vk, vkFile)
}

func prove() {
	if err := scen.Assign(scenarioArgs); err != nil {
		log.Fatalf("Assign values: %v", err)
	}

	witness, err := frontend.NewWitness(scen, curveID.ScalarField())
	if err != nil {
		log.Fatalf("Compute witness: %v", err)
	}

	cs := groth16.NewCS(curveID)
	readFrom(cs, csFile)

	pk := groth16.NewProvingKey(curveID)
	readFrom(pk, pkFile)

	proof, err := groth16.Prove(cs, pk, witness)
	if err != nil {
		log.Fatalf("Generate proof: %v", err)
	}

	publicWitness, err := witness.Public()
	if err != nil {
		log.Fatalf("Public witness computation: %v", err)
	}

	writeTo(proof, proofFile)
	writeTo(publicWitness, wtnFile)
}

func verify() {
	proof := groth16.NewProof(curveID)
	readFrom(proof, proofFile)

	vk := groth16.NewVerifyingKey(curveID)
	readFrom(vk, vkFile)

	publicWitness, err := witness.New(curveID.ScalarField())
	if err != nil {
		log.Fatalf("Create witness: %v", err)
	}
	readFrom(publicWitness, wtnFile)

	if err := groth16.Verify(proof, vk, publicWitness); err != nil {
		log.Fatalf("Proof verification: %v", err)
	}
}

func writeTo(i io.WriterTo, fileName string) {
	file, err := os.Create(fileName)
	if err != nil {
		log.Fatalf(`Create file "%s": %v`, fileName, err)
	}

	if _, err = i.WriteTo(file); err != nil {
		log.Fatalf(`Write to "%s": %v`, fileName, err)
	}
}

func readFrom[T io.ReaderFrom](obj T, fileName string) {
	file, err := os.Open(filepath.Join(inDir, fileName))
	if err != nil {
		log.Fatalf(`Open file "%s": %v`, fileName, err)
	}

	if _, err = obj.ReadFrom(file); err != nil {
		log.Fatalf(`Read from "%s": %v`, fileName, err)
	}
}
