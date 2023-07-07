package main

import (
	"os"

	"github.com/consensys/gnark/logger"
	"github.com/mkobelt/zk-benchmarking-platform/systems/gnark/config/phase"
	"github.com/rs/zerolog"
)

func main() {
	// Overwrite gnark's default logger to disable color output since the benchmark tool writes stdout to a file
	output := zerolog.ConsoleWriter{Out: os.Stdout, NoColor: true, TimeFormat: "15:04:05"}
	newLogger := zerolog.New(output).With().Timestamp().Logger()
	logger.Set(newLogger)

	phase.Phase()
}
