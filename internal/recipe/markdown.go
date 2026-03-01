package recipe

import (
	"bufio"
	"fmt"
	"os"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

// ParseFile reads a recipe markdown file from disk.
func ParseFile(path string) (*RecipeFile, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	return ParseMarkdown(data)
}

// ParseMarkdown parses a recipe from raw markdown bytes.
func ParseMarkdown(data []byte) (*RecipeFile, error) {
	content := string(data)

	// Split on frontmatter delimiters
	parts := strings.SplitN(content, "---", 3)
	if len(parts) < 3 {
		return nil, fmt.Errorf("invalid frontmatter: expected --- delimiters")
	}

	frontmatter := strings.TrimSpace(parts[1])
	body := strings.TrimSpace(parts[2])

	var r Recipe
	if err := yaml.Unmarshal([]byte(frontmatter), &r); err != nil {
		return nil, fmt.Errorf("parsing frontmatter: %w", err)
	}

	instructions := parseInstructions(body)

	return &RecipeFile{
		Recipe:       r,
		Instructions: instructions,
	}, nil
}

var stepRegex = regexp.MustCompile(`^\d+\.\s+`)

func parseInstructions(body string) []string {
	var steps []string
	scanner := bufio.NewScanner(strings.NewReader(body))
	var current strings.Builder

	for scanner.Scan() {
		line := scanner.Text()
		if stepRegex.MatchString(line) {
			if current.Len() > 0 {
				steps = append(steps, strings.TrimSpace(current.String()))
				current.Reset()
			}
			current.WriteString(stepRegex.ReplaceAllString(line, ""))
		} else if strings.TrimSpace(line) != "" && current.Len() > 0 {
			current.WriteString(" " + strings.TrimSpace(line))
		}
	}
	if current.Len() > 0 {
		steps = append(steps, strings.TrimSpace(current.String()))
	}
	return steps
}

// RenderMarkdown produces the markdown file content matching the existing format.
func RenderMarkdown(rf *RecipeFile) string {
	var b strings.Builder
	r := rf.Recipe

	b.WriteString("---\n")

	// Title
	b.WriteString(fmt.Sprintf("title: %q\n", r.Title))

	// Servings
	b.WriteString(fmt.Sprintf("servings: %d\n", r.Servings))

	// Times
	b.WriteString(fmt.Sprintf("prep_time: %q\n", r.PrepTime))
	b.WriteString(fmt.Sprintf("cook_time: %q\n", r.CookTime))

	// Cuisine
	b.WriteString(fmt.Sprintf("cuisine: %q\n", r.Cuisine))

	// Classification
	b.WriteString(fmt.Sprintf("meal_type: %s\n", r.MealType))
	b.WriteString(fmt.Sprintf("difficulty: %s\n", r.Difficulty))

	// Tags - inline flow style [a, b, c]
	b.WriteString("tags: [")
	b.WriteString(strings.Join(r.Tags, ", "))
	b.WriteString("]\n")

	// Attribution
	b.WriteString(fmt.Sprintf("added_by: %s\n", r.AddedBy))
	if r.Source != "" {
		b.WriteString(fmt.Sprintf("source: %q\n", r.Source))
	}
	if r.Image != "" {
		b.WriteString(fmt.Sprintf("image: %q\n", r.Image))
	}

	// Ingredients - block list
	b.WriteString("ingredients:\n")
	for _, ing := range r.Ingredients {
		b.WriteString(fmt.Sprintf("  - %s\n", ing))
	}

	b.WriteString("---\n\n")

	// Instructions
	b.WriteString("## Instructions\n\n")
	for i, step := range rf.Instructions {
		b.WriteString(fmt.Sprintf("%d. %s\n\n", i+1, step))
	}

	return b.String()
}
