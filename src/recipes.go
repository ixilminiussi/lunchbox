package main

import (
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
	lipgloss "github.com/charmbracelet/lipgloss"
)

type ingredient struct {
	Quantity float32 `json:"quantity"`
	Unit     string  `json:"unit"`
	Name     string  `json:"name"`
}

type recipe struct {
	Name         string       `json:"name"`
	Description  string       `json:"description"`
	Portions     int          `json:"portions"`
	Time         int          `json:"time"`
	Ingredients  []ingredient `json:"ingredients"`
	Instructions []string     `json:"instruction"`
}

var NullRecipe = recipe{
	Name:         "",
	Description:  "",
	Portions:     0,
	Time:         0,
	Ingredients:  []ingredient{},
	Instructions: []string{},
}

type recipeCard struct {
	Recipe recipe
	Width  int
	Height int
}

func (r recipeCard) Init() tea.Cmd {
	return nil
}

func (r *recipeCard) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case recipe:
		r.Recipe = msg
	}
	return r, nil
}

func (r recipeCard) View() string {
	titleCard := lipgloss.JoinVertical(lipgloss.Left,
		lipgloss.JoinHorizontal(lipgloss.Left,
			r.Recipe.Name,
			" - ",
			fmt.Sprintf("%d min", r.Recipe.Time)),
		r.Recipe.Description)

	ingredientsCard := lipgloss.JoinVertical(lipgloss.Left,
		fmt.Sprintf("Ingredients for %d portions", r.Recipe.Portions))

	instructionsCard := lipgloss.JoinVertical(lipgloss.Left,
		"Instructions")

	return lipgloss.JoinVertical(lipgloss.Left, titleCard, ingredientsCard, instructionsCard)
}

func NewRecipeCard() recipeCard {
	return recipeCard{
		Recipe: NullRecipe,
	}
}
