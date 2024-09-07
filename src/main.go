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
	State      *state
	Dialogs    dialogs
	RecipeCard recipeCard
	Width      int
	Height     int
}

func (m model) Init() tea.Cmd {
	var cmds []tea.Cmd

	cmds = append(cmds, m.Dialogs.Init())
	cmds = append(cmds, m.RecipeCard.Init())

	return tea.Batch(cmds...)
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

	switch *m.State {
	case Quit:
		cmds = append(cmds, goodbye(&m))
	case New:
		_, cmd = m.RecipeCard.Update(m.Dialogs.GetRecipe())
		cmds = append(cmds, cmd)
	}

	if *m.State == Quit {
	}

	return m, tea.Batch(cmds...)
}

func (m model) View() string {
	if m.Width == 0 || m.Height == 0 {
		return "Loading..."
	}

	switch *m.State {
	case Quit:
		return ""
	case Home:
		return m.Dialogs.View()
	case New:
		return lipgloss.JoinHorizontal(lipgloss.Top,
			m.Dialogs.View(),
			m.RecipeCard.View(),
		)
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
	m.RecipeCard = NewRecipeCard()

	return m
}

func main() {
	_, err := tea.NewProgram(NewModel()).Run()

	if err != nil {
		fmt.Println("Oh no:", err)
		os.Exit(1)
	}
}
