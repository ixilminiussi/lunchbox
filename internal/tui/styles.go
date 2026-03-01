package tui

import "github.com/charmbracelet/lipgloss"

var (
	Accent  = lipgloss.NewStyle().Foreground(lipgloss.Color("212"))
	Subtle  = lipgloss.NewStyle().Foreground(lipgloss.Color("241"))
	Success = lipgloss.NewStyle().Foreground(lipgloss.Color("78"))
	Error   = lipgloss.NewStyle().Foreground(lipgloss.Color("196"))
	Bold    = lipgloss.NewStyle().Bold(true)

	Box = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("241")).
		Padding(1, 2)

	Title = lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("212")).
		MarginBottom(1)

	HelpStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("241")).
			MarginTop(1)
)
