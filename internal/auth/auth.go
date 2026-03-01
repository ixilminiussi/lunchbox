package auth

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

var ValidUsers = []string{"Ixil", "Mathilde"}

type Config struct {
	User string `yaml:"user"`
}

func configPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "lunchbox", "config.yaml"), nil
}

// LoadUser reads the saved user from the config file.
// Returns empty string if not configured yet.
func LoadUser() string {
	p, err := configPath()
	if err != nil {
		return ""
	}
	data, err := os.ReadFile(p)
	if err != nil {
		return ""
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return ""
	}
	return cfg.User
}

// SaveUser writes the user choice to the config file.
func SaveUser(user string) error {
	p, err := configPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return err
	}
	cfg := Config{User: user}
	data, err := yaml.Marshal(&cfg)
	if err != nil {
		return err
	}
	return os.WriteFile(p, data, 0o644)
}

// IsValid checks if a username is one of the allowed users.
func IsValid(user string) bool {
	for _, u := range ValidUsers {
		if strings.EqualFold(u, user) {
			return true
		}
	}
	return false
}

// Normalise returns the canonical casing for a user name.
func Normalise(user string) string {
	for _, u := range ValidUsers {
		if strings.EqualFold(u, user) {
			return u
		}
	}
	return user
}

// FormatPrompt returns a string listing valid users for display.
func FormatPrompt() string {
	return fmt.Sprintf("Who are you? (%s)", strings.Join(ValidUsers, " / "))
}
