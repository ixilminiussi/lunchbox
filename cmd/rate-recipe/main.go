package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/charmbracelet/bubbles/list"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"

	"lunchbox/internal/auth"
	"lunchbox/internal/recipe"
	"lunchbox/internal/tui"
)

type state int

const (
	stateList state = iota
	stateRate
	stateDone
)

type recipeItem struct {
	rf *recipe.RecipeFile
}

func (i recipeItem) Title() string { return i.rf.Recipe.Title }
func (i recipeItem) FilterValue() string {
	r := i.rf.Recipe
	parts := []string{r.Title, r.Cuisine, string(r.MealType)}
	return strings.Join(parts, " ")
}
func (i recipeItem) Description() string {
	r := i.rf.Recipe
	parts := []string{}
	if r.Cuisine != "" {
		parts = append(parts, r.Cuisine)
	}
	parts = append(parts, string(r.MealType), string(r.Difficulty))
	// Show current rating if any
	for user, rating := range r.Ratings {
		parts = append(parts, fmt.Sprintf("%s: %s", user, strings.Repeat("★", rating)+strings.Repeat("☆", 5-rating)))
	}
	return strings.Join(parts, " | ")
}

type recipesLoaded struct {
	recipes []*recipe.RecipeFile
	err     error
}

type recipeSaved struct {
	title string
	err   error
}

type model struct {
	state   state
	user    string
	list    list.Model
	paths   *recipe.Paths
	current *recipe.RecipeFile
	rating  string
	err     error
	saved   string
	width   int
	height  int
}

func initialModel(user string) model {
	paths, err := recipe.NewPaths()
	l := list.New(nil, list.NewDefaultDelegate(), 0, 0)
	l.Title = fmt.Sprintf("Rate recipes (as %s)", user)
	l.SetShowStatusBar(true)
	l.SetFilteringEnabled(true)

	return model{
		state: stateList,
		user:  user,
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

func saveRating(paths *recipe.Paths, rf *recipe.RecipeFile) tea.Cmd {
	return func() tea.Msg {
		_, err := paths.SaveRecipe(rf)
		return recipeSaved{title: rf.Recipe.Title, err: err}
	}
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.list.SetSize(msg.Width, msg.Height)
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
			return m, tea.Quit
		}
		m.saved = msg.title
		m.state = stateDone
		return m, tea.Quit

	case tea.KeyMsg:
		switch m.state {
		case stateList:
			switch msg.String() {
			case "enter":
				if item, ok := m.list.SelectedItem().(recipeItem); ok {
					m.current = item.rf
					// Pre-fill with current rating
					current := 0
					if m.current.Recipe.Ratings != nil {
						if r, ok := m.current.Recipe.Ratings[strings.ToLower(m.user)]; ok {
							current = r
						}
					}
					m.rating = fmt.Sprintf("%d", current)
					m.state = stateRate
					return m, nil
				}
			case "q", "ctrl+c":
				return m, tea.Quit
			}

		case stateRate:
			switch msg.String() {
			case "1", "2", "3", "4", "5":
				rating := int(msg.String()[0] - '0')
				if m.current.Recipe.Ratings == nil {
					m.current.Recipe.Ratings = make(map[string]int)
				}
				m.current.Recipe.Ratings[strings.ToLower(m.user)] = rating
				return m, saveRating(m.paths, m.current)
			case "0":
				// Remove rating
				if m.current.Recipe.Ratings != nil {
					delete(m.current.Recipe.Ratings, strings.ToLower(m.user))
				}
				return m, saveRating(m.paths, m.current)
			case "q", "esc":
				m.state = stateList
				m.current = nil
				return m, nil
			}
		}
	}

	if m.state == stateList {
		var cmd tea.Cmd
		m.list, cmd = m.list.Update(msg)
		return m, cmd
	}

	return m, nil
}

func (m model) View() string {
	if m.err != nil {
		return tui.Error.Render("Error: "+m.err.Error()) + "\n"
	}

	switch m.state {
	case stateList:
		return m.list.View()

	case stateRate:
		title := ""
		currentRating := 0
		if m.current != nil {
			title = m.current.Recipe.Title
			if m.current.Recipe.Ratings != nil {
				if r, ok := m.current.Recipe.Ratings[strings.ToLower(m.user)]; ok {
					currentRating = r
				}
			}
		}

		stars := strings.Repeat("★", currentRating) + strings.Repeat("☆", 5-currentRating)

		style := lipgloss.NewStyle().Padding(1, 2)
		return style.Render(
			tui.Title.Render(title)+"\n\n"+
				"Current rating: "+tui.Accent.Render(stars)+"\n\n"+
				"Press [1-5] to rate, [0] to clear, [esc] to cancel",
		)

	case stateDone:
		return ""
	}

	return ""
}

func ensureAuth() string {
	user := auth.LoadUser()
	if user != "" {
		return user
	}
	var selected string
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("Who are you?").
				Options(
					huh.NewOption("Ixil", "Ixil"),
					huh.NewOption("Mathilde", "Mathilde"),
				).
				Value(&selected),
		),
	)
	if err := form.Run(); err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}
	if err := auth.SaveUser(selected); err != nil {
		fmt.Fprintln(os.Stderr, "Warning: could not save config:", err)
	}
	return selected
}

func main() {
	user := ensureAuth()
	p := tea.NewProgram(initialModel(user), tea.WithAltScreen())
	m, err := p.Run()
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}

	if final, ok := m.(model); ok {
		if final.err != nil {
			fmt.Fprintln(os.Stderr, tui.Error.Render("Error: "+final.err.Error()))
			os.Exit(1)
		}
		if final.saved != "" {
			fmt.Println(tui.Success.Render("Rated: " + final.saved))
		}
	}
}
