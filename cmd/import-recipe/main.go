package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/charmbracelet/bubbles/spinner"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"

	"lunchbox/internal/auth"
	"lunchbox/internal/recipe"
	"lunchbox/internal/scraper"
	"lunchbox/internal/tui"
)

type state int

const (
	stateLoading state = iota
	stateForm
	statePreview
	stateSaving
	stateDone
)

// Messages
type recipeFetched struct {
	rf  *recipe.RecipeFile
	err error
}

type recipeSaved struct {
	path string
	err  error
}

type model struct {
	state    state
	url      string
	user     string
	rf       *recipe.RecipeFile
	formRes  *tui.FormResult
	form     *huh.Form
	spinner  spinner.Model
	viewport viewport.Model
	preview  string
	paths    *recipe.Paths
	err      error
	saved    string
	width    int
	height   int
}

func initialModel(url string, user string) model {
	s := spinner.New()
	s.Spinner = spinner.Dot
	s.Style = lipgloss.NewStyle().Foreground(lipgloss.Color("212"))

	paths, err := recipe.NewPaths()

	return model{
		state:   stateLoading,
		url:     url,
		user:    user,
		spinner: s,
		paths:   paths,
		err:     err,
	}
}

func (m model) Init() tea.Cmd {
	if m.err != nil {
		return tea.Quit
	}
	return tea.Batch(
		m.spinner.Tick,
		fetchRecipe(m.url),
	)
}

func fetchRecipe(url string) tea.Cmd {
	return func() tea.Msg {
		rf, err := scraper.FetchRecipe(url)
		return recipeFetched{rf: rf, err: err}
	}
}

func saveRecipe(paths *recipe.Paths, rf *recipe.RecipeFile, imageURL string) tea.Cmd {
	return func() tea.Msg {
		// Download image if available
		if imageURL != "" {
			slug := recipe.Slug(rf.Recipe.Title)
			imgPath, err := paths.DownloadImage(imageURL, slug)
			if err == nil {
				rf.Recipe.Image = imgPath
			}
		}

		path, err := paths.SaveRecipe(rf)
		return recipeSaved{path: path, err: err}
	}
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		if m.state == statePreview {
			m.viewport.Width = msg.Width
			m.viewport.Height = msg.Height - 4
		}
		return m, nil

	case tea.KeyMsg:
		switch m.state {
		case statePreview:
			switch msg.String() {
			case "y":
				m.state = stateSaving
				// Extract image URL before saving (save will download it)
				imageURL := ""
				if m.rf != nil {
					imageURL = m.rf.Recipe.Image
					m.rf.Recipe.Image = "" // will be set after download
				}
				return m, saveRecipe(m.paths, m.rf, imageURL)
			case "e":
				m.formRes = tui.NewFormResult(m.rf)
				m.form = tui.BuildForm(m.formRes)
				m.state = stateForm
				return m, m.form.Init()
			case "n", "q":
				return m, tea.Quit
			default:
				var cmd tea.Cmd
				m.viewport, cmd = m.viewport.Update(msg)
				return m, cmd
			}
		case stateDone:
			return m, tea.Quit
		}

	case recipeFetched:
		if msg.err != nil {
			m.err = msg.err
			return m, tea.Quit
		}
		m.rf = msg.rf
		// Pre-fill AddedBy with logged-in user
		m.rf.Recipe.AddedBy = m.user
		m.formRes = tui.NewFormResult(m.rf)
		m.form = tui.BuildForm(m.formRes)
		m.state = stateForm
		return m, m.form.Init()

	case recipeSaved:
		if msg.err != nil {
			m.err = msg.err
			return m, tea.Quit
		}
		m.saved = msg.path
		m.state = stateDone
		return m, tea.Quit

	case spinner.TickMsg:
		if m.state == stateLoading {
			var cmd tea.Cmd
			m.spinner, cmd = m.spinner.Update(msg)
			return m, cmd
		}
	}

	// Update form
	if m.state == stateForm && m.form != nil {
		form, cmd := m.form.Update(msg)
		if f, ok := form.(*huh.Form); ok {
			m.form = f

			if m.form.State == huh.StateCompleted {
				m.rf = tui.ApplyFormResult(m.formRes, m.rf)
				return m, m.showPreview()
			}
		}
		return m, cmd
	}

	return m, nil
}

func (m *model) showPreview() tea.Cmd {
	preview, _ := tui.RenderPreview(m.rf)
	m.preview = preview
	m.viewport = viewport.New(m.width, m.height-4)
	m.viewport.SetContent(preview)
	m.state = statePreview
	return nil
}

func (m model) View() string {
	if m.err != nil {
		return tui.Error.Render("Error: "+m.err.Error()) + "\n"
	}

	switch m.state {
	case stateLoading:
		return fmt.Sprintf("\n  %s Fetching recipe from %s...\n", m.spinner.View(), m.url)

	case stateForm:
		if m.form != nil {
			return m.form.View()
		}
		return ""

	case statePreview:
		help := tui.HelpStyle.Render("  [y] save  [e] edit  [n] cancel  [↑/↓] scroll")
		return m.viewport.View() + "\n" + help

	case stateSaving:
		return "\n  Saving recipe...\n"

	case stateDone:
		var b strings.Builder
		b.WriteString("\n")
		b.WriteString(tui.Success.Render("  Recipe saved to: "+m.saved) + "\n")
		b.WriteString(tui.Subtle.Render("  Review the file, then: git add + commit + push") + "\n\n")
		return b.String()
	}

	return ""
}

func ensureAuth() string {
	user := auth.LoadUser()
	if user != "" {
		return user
	}

	// First-time setup: ask who they are
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
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "Usage: go run ./cmd/import-recipe <url>")
		os.Exit(1)
	}

	user := ensureAuth()
	url := os.Args[1]
	p := tea.NewProgram(initialModel(url, user), tea.WithAltScreen())
	m, err := p.Run()
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}

	// Print final output after alt screen exits
	if final, ok := m.(model); ok {
		if final.err != nil {
			fmt.Fprintln(os.Stderr, tui.Error.Render("Error: "+final.err.Error()))
			os.Exit(1)
		}
		if final.saved != "" {
			fmt.Println(tui.Success.Render("Recipe saved to: " + final.saved))
			fmt.Println(tui.Subtle.Render("Review the file, then: git add + commit + push"))
		}
	}
}
