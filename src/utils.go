package main

import (
	"strconv"
)

type tickMsg struct{}

func isInt(str string) error {
	_, err := strconv.ParseUint(str, 10, 32)
	return err
}

func isNum(str string) error {
	_, err := strconv.ParseFloat(str, 32)
	return err
}
