package main

import (
	tea "github.com/charmbracelet/bubbletea"
)

type ingredient struct {
    quantity int    `json:"quantity"`
    unit     string `json:"unit"`
    name     string `json:"name"`
}

type recipe struct {
    name         string       `json:"name"`
    description  string       `json:"description"`
    portions     int          `json:"portions"`
    time         int          `json:"time"`
    ingredients  []ingredient `json:"ingredients"`
    instructions []string     `json:"instruction"`
}

type recipeCard struct {
    recipe recipe
    width  int
    height int
}

func (m recipeCard) Init() tea.Cmd {
    return nil
}

func (m recipeCard) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    return m, nil
}

func (m recipeCard) View() string {
    return ""
}
