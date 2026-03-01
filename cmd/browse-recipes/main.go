package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/charmbracelet/bubbles/list"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"

	"lunchbox/internal/recipe"
	"lunchbox/internal/tui"
)

type state int

const (
	stateList state = iota
	stateView
	stateEdit
	stateConfirmDelete
)

// recipeItem implements list.Item for the bubbles list.
type recipeItem struct {
	rf *recipe.RecipeFile
}

func (i recipeItem) Title() string       { return i.rf.Recipe.Title }
func (i recipeItem) FilterValue() string {
	r := i.rf.Recipe
	parts := []string{
		r.Title,
		r.Cuisine,
		strings.Join(r.Tags, " "),
		string(r.MealType),
		string(r.Difficulty),
		strings.Join(r.Ingredients, " "),
	}
	return strings.Join(parts, " ")
}
func (i recipeItem) Description() string {
	r := i.rf.Recipe
	parts := []string{}
	if r.Cuisine != "" {
		parts = append(parts, r.Cuisine)
	}
	parts = append(parts, string(r.MealType), string(r.Difficulty))
	if r.PrepTime != "" && r.PrepTime != "0 min" {
		parts = append(parts, "prep: "+r.PrepTime)
	}
	if r.CookTime != "" && r.CookTime != "0 min" {
		parts = append(parts, "cook: "+r.CookTime)
	}
	return strings.Join(parts, " | ")
}

// Messages
type recipesLoaded struct {
	recipes []*recipe.RecipeFile
	err     error
}

type recipeSaved struct {
	err error
}

type recipeDeleted struct {
	err error
}

type model struct {
	state    state
	list     list.Model
	viewport viewport.Model
	form     *huh.Form
	formRes  *tui.FormResult
	paths    *recipe.Paths
	current  *recipe.RecipeFile
	err      error
	width    int
	height   int

	confirmDelete string // "y" or "n"
}

func initialModel() model {
	paths, err := recipe.NewPaths()
	l := list.New(nil, list.NewDefaultDelegate(), 0, 0)
	l.Title = "Recipes"
	l.SetShowStatusBar(true)
	l.SetFilteringEnabled(true)

	return model{
		state: stateList,
		list:  l,
		paths: paths,
		err:   err,
	}
}

func (m model) Init() tea.Cmd {
	if m.err != nil {
		return tea.Quit
	}
	return loadRecipes(m.paths)
}

func loadRecipes(paths *recipe.Paths) tea.Cmd {
	return func() tea.Msg {
		recipes, err := paths.ListRecipes()
		return recipesLoaded{recipes: recipes, err: err}
	}
}

func saveRecipeCmd(paths *recipe.Paths, rf *recipe.RecipeFile) tea.Cmd {
	return func() tea.Msg {
		_, err := paths.SaveRecipe(rf)
		return recipeSaved{err: err}
	}
}

func deleteRecipeCmd(paths *recipe.Paths, rf *recipe.RecipeFile) tea.Cmd {
	return func() tea.Msg {
		err := paths.DeleteRecipe(rf)
		return recipeDeleted{err: err}
	}
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.list.SetSize(msg.Width, msg.Height)
		if m.state == stateView {
			m.viewport.Width = msg.Width
			m.viewport.Height = msg.Height - 3
		}
		return m, nil

	case recipesLoaded:
		if msg.err != nil {
			m.err = msg.err
			return m, tea.Quit
		}
		items := make([]list.Item, len(msg.recipes))
		for i, rf := range msg.recipes {
			items[i] = recipeItem{rf: rf}
		}
		m.list.SetItems(items)
		return m, nil

	case recipeSaved:
		if msg.err != nil {
			m.err = msg.err
		}
		// Reload and go back to view
		m.state = stateView
		m.showViewport()
		return m, loadRecipes(m.paths)

	case recipeDeleted:
		if msg.err != nil {
			m.err = msg.err
		}
		m.state = stateList
		m.current = nil
		return m, loadRecipes(m.paths)

	case tea.KeyMsg:
		switch m.state {
		case stateList:
			switch msg.String() {
			case "enter":
				if item, ok := m.list.SelectedItem().(recipeItem); ok {
					m.current = item.rf
					m.state = stateView
					m.showViewport()
					return m, nil
				}
			case "q", "ctrl+c":
				return m, tea.Quit
			}

		case stateView:
			switch msg.String() {
			case "e":
				m.formRes = tui.NewFormResult(m.current)
				m.form = tui.BuildForm(m.formRes)
				m.state = stateEdit
				return m, m.form.Init()
			case "d":
				m.state = stateConfirmDelete
				m.confirmDelete = ""
				return m, nil
			case "q", "esc":
				m.state = stateList
				m.current = nil
				return m, nil
			default:
				var cmd tea.Cmd
				m.viewport, cmd = m.viewport.Update(msg)
				return m, cmd
			}

		case stateConfirmDelete:
			switch msg.String() {
			case "y":
				return m, deleteRecipeCmd(m.paths, m.current)
			case "n", "esc":
				m.state = stateView
				return m, nil
			}
		}
	}

	// Update form in edit state
	if m.state == stateEdit && m.form != nil {
		form, cmd := m.form.Update(msg)
		if f, ok := form.(*huh.Form); ok {
			m.form = f

			if m.form.State == huh.StateCompleted {
				m.current = tui.ApplyFormResult(m.formRes, m.current)
				m.state = stateView
				return m, saveRecipeCmd(m.paths, m.current)
			}
			if m.form.State == huh.StateAborted {
				m.state = stateView
				return m, nil
			}
		}
		return m, cmd
	}

	// Update list
	if m.state == stateList {
		var cmd tea.Cmd
		m.list, cmd = m.list.Update(msg)
		return m, cmd
	}

	return m, nil
}

func (m *model) showViewport() {
	preview, _ := tui.RenderPreview(m.current)
	m.viewport = viewport.New(m.width, m.height-3)
	m.viewport.SetContent(preview)
}

func (m model) View() string {
	if m.err != nil {
		return tui.Error.Render("Error: "+m.err.Error()) + "\n"
	}

	switch m.state {
	case stateList:
		return m.list.View()

	case stateView:
		help := tui.HelpStyle.Render("  [e] edit  [d] delete  [q/esc] back  [↑/↓] scroll")
		return m.viewport.View() + "\n" + help

	case stateEdit:
		if m.form != nil {
			return m.form.View()
		}
		return ""

	case stateConfirmDelete:
		title := ""
		if m.current != nil {
			title = m.current.Recipe.Title
		}
		style := lipgloss.NewStyle().Padding(1, 2)
		return style.Render(
			tui.Error.Render("Delete \""+title+"\"?") + "\n\n" +
				"Press [y] to confirm, [n] to cancel",
		)
	}

	return ""
}

func main() {
	p := tea.NewProgram(initialModel(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}
}
