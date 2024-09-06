package main

import (
	"fmt"
	"os"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	lipgloss "github.com/charmbracelet/lipgloss"
)

type state int

const (
	Home state = iota
	New
	Preview
	List
	Edit
	Save
	Quit

	// not a state, counts the amount of states specified before
	stateCount
)

const (
	Width  = 80
	Height = 50
)

type model struct {
	State   *state
	Dialogs dialogs
	Width   int
	Height  int
}

func (m model) Init() tea.Cmd {
	return m.Dialogs.Init()
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if *m.State == Quit {
		return m, tea.Quit
	}

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.Width = min(msg.Width, Width)
		m.Height = min(msg.Height, Height)

	case tea.KeyMsg:
		switch msg.String() {
		case "esc":
			return m, goodbye(&m)
		}
	}

	var cmds []tea.Cmd
	_, cmd := m.Dialogs.Update(msg)
	cmds = append(cmds, cmd)

	if *m.State == Quit {
		cmds = append(cmds, goodbye(&m))
	}

	return m, tea.Batch(cmds...)
}

func (m model) View() string {
	if m.Width == 0 || m.Height == 0 {
		return "Loading..."
	}

	if *m.State == Quit {
		return ""
	}

	return m.Dialogs.View()
}

func goodbye(m *model) tea.Cmd {
	*m.State = Quit

	return tea.Tick(time.Millisecond*100, func(time.Time) tea.Msg {
		return tickMsg{}
	})
}

func NewModel() model {
	m := model{}
	s := Home
	m.State = &s
	m.Dialogs = NewDialogs(m.State)

	return m
}

func main() {
	_, err := tea.NewProgram(NewModel()).Run()

	if err != nil {
		fmt.Println("Oh no:", err)
		os.Exit(1)
	}
}
