package io

import (
	"io"
	"log"
	"os"
)

func WriteTo(i io.WriterTo, fileName string) {
	file, err := os.Create(fileName)
	if err != nil {
		log.Fatalf(`Create file "%s": %v`, fileName, err)
	}

	if _, err = i.WriteTo(file); err != nil {
		log.Fatalf(`Write to "%s": %v`, fileName, err)
	}
}

func ReadFrom[T io.ReaderFrom](obj T, fileName string) {
	file, err := os.Open(fileName)
	if err != nil {
		log.Fatalf(`Open file "%s": %v`, fileName, err)
	}

	if _, err = obj.ReadFrom(file); err != nil {
		log.Fatalf(`Read from "%s": %v`, fileName, err)
	}
}
