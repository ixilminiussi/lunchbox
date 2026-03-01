package tui

import (
	"lunchbox/internal/recipe"

	"github.com/charmbracelet/glamour"
)

// RenderPreview generates a styled markdown preview of a RecipeFile.
func RenderPreview(rf *recipe.RecipeFile) (string, error) {
	md := recipe.RenderMarkdown(rf)

	renderer, err := glamour.NewTermRenderer(
		glamour.WithAutoStyle(),
		glamour.WithWordWrap(80),
	)
	if err != nil {
		return md, nil // fallback to raw markdown
	}

	rendered, err := renderer.Render(md)
	if err != nil {
		return md, nil
	}

	return rendered, nil
}
