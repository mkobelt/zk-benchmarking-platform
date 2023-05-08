package scenario

import "github.com/consensys/gnark/frontend"

type Scenario interface {
	frontend.Circuit

	Assign(args []string) error
}
