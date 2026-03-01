package tui

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/charmbracelet/huh"

	"lunchbox/internal/auth"
	"lunchbox/internal/recipe"
)

// FormResult holds the intermediate string values from the form.
type FormResult struct {
	Title         string
	Servings      string
	PrepTime      string
	CookTime      string
	Cuisine       string
	MealType      string
	Difficulty    string
	TagSelections [][]string // one slice per TagCategory
	AddedBy       string
	Source        string
	Ingredients   string
	Instructions  string
}

// NewFormResult creates a FormResult from an existing RecipeFile.
func NewFormResult(rf *recipe.RecipeFile) *FormResult {
	r := rf.Recipe

	// Distribute existing tags into per-category selections
	tagSels := make([][]string, len(recipe.TagCategories))
	for i := range tagSels {
		tagSels[i] = []string{}
	}
	for _, t := range r.Tags {
		t = strings.TrimSpace(strings.ToLower(t))
		idx := recipe.TagCategoryIndex(t)
		if idx >= 0 {
			tagSels[idx] = append(tagSels[idx], t)
		}
	}

	return &FormResult{
		Title:         r.Title,
		Servings:      strconv.Itoa(r.Servings),
		PrepTime:      r.PrepTime,
		CookTime:      r.CookTime,
		Cuisine:       r.Cuisine,
		MealType:      string(r.MealType),
		Difficulty:    string(r.Difficulty),
		TagSelections: tagSels,
		AddedBy:       r.AddedBy,
		Source:        r.Source,
		Ingredients:   strings.Join(r.Ingredients, "\n"),
		Instructions:  strings.Join(rf.Instructions, "\n\n"),
	}
}

// ApplyFormResult converts form strings back into a RecipeFile.
func ApplyFormResult(fr *FormResult, original *recipe.RecipeFile) *recipe.RecipeFile {
	servings, _ := strconv.Atoi(fr.Servings)
	if servings <= 0 {
		servings = 4
	}

	var tags []string
	for _, sel := range fr.TagSelections {
		tags = append(tags, sel...)
	}

	var ingredients []string
	for _, line := range strings.Split(fr.Ingredients, "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			ingredients = append(ingredients, line)
		}
	}

	var instructions []string
	for _, block := range strings.Split(fr.Instructions, "\n\n") {
		block = strings.TrimSpace(block)
		if block != "" {
			instructions = append(instructions, block)
		}
	}

	rf := &recipe.RecipeFile{
		Recipe: recipe.Recipe{
			Title:       fr.Title,
			Servings:    servings,
			PrepTime:    fr.PrepTime,
			CookTime:    fr.CookTime,
			Cuisine:     fr.Cuisine,
			MealType:    recipe.MealType(fr.MealType),
			Difficulty:  recipe.Difficulty(fr.Difficulty),
			Tags:        tags,
			AddedBy:     fr.AddedBy,
			Source:      fr.Source,
			Ingredients: ingredients,
		},
		Instructions: instructions,
	}

	// Preserve image from original if present
	if original != nil {
		rf.Recipe.Image = original.Recipe.Image
	}

	return rf
}

// buildTagGroup creates a form group with one multi-select per tag category.
func buildTagGroup(fr *FormResult) *huh.Group {
	var fields []huh.Field
	for i, cat := range recipe.TagCategories {
		options := make([]huh.Option[string], len(cat.Tags))
		for j, t := range cat.Tags {
			options[j] = huh.NewOption(t, t)
		}
		fields = append(fields, huh.NewMultiSelect[string]().
			Title(cat.Name).
			Options(options...).
			Value(&fr.TagSelections[i]))
	}
	return huh.NewGroup(fields...).Title("Tags")
}

// buildAddedByField creates a select field for the recipe author.
func buildAddedByField(fr *FormResult) *huh.Select[string] {
	options := make([]huh.Option[string], len(auth.ValidUsers))
	for i, u := range auth.ValidUsers {
		options[i] = huh.NewOption(u, u)
	}
	// Ensure the current value is valid; default to the first user
	valid := false
	for _, u := range auth.ValidUsers {
		if strings.EqualFold(fr.AddedBy, u) {
			fr.AddedBy = u
			valid = true
			break
		}
	}
	if !valid {
		fr.AddedBy = auth.ValidUsers[0]
	}
	return huh.NewSelect[string]().
		Title("Added By").
		Options(options...).
		Value(&fr.AddedBy)
}

// BuildForm creates a Huh form for editing a recipe.
func BuildForm(fr *FormResult) *huh.Form {
	mealTypeOptions := make([]huh.Option[string], len(recipe.MealTypes))
	for i, mt := range recipe.MealTypes {
		mealTypeOptions[i] = huh.NewOption(string(mt), string(mt))
	}

	difficultyOptions := make([]huh.Option[string], len(recipe.Difficulties))
	for i, d := range recipe.Difficulties {
		difficultyOptions[i] = huh.NewOption(string(d), string(d))
	}

	return huh.NewForm(
		// Group 1: Basic info
		huh.NewGroup(
			huh.NewInput().
				Title("Title").
				Value(&fr.Title),
			huh.NewInput().
				Title("Servings").
				Value(&fr.Servings).
				Validate(func(s string) error {
					n, err := strconv.Atoi(s)
					if err != nil || n <= 0 {
						return fmt.Errorf("must be a positive number")
					}
					return nil
				}),
			huh.NewInput().
				Title("Prep Time").
				Placeholder("e.g. 10 min").
				Value(&fr.PrepTime),
			huh.NewInput().
				Title("Cook Time").
				Placeholder("e.g. 20 min").
				Value(&fr.CookTime),
		).Title("Basic Info"),

		// Group 2: Classification
		huh.NewGroup(
			huh.NewInput().
				Title("Cuisine").
				Placeholder("e.g. Italian").
				Value(&fr.Cuisine),
			huh.NewSelect[string]().
				Title("Meal Type").
				Options(mealTypeOptions...).
				Value(&fr.MealType),
			huh.NewSelect[string]().
				Title("Difficulty").
				Options(difficultyOptions...).
				Value(&fr.Difficulty),
		).Title("Classification"),

		// Group 3: Tags (multi-select per category)
		buildTagGroup(fr),

		// Group 4: Attribution
		huh.NewGroup(
			buildAddedByField(fr),
			huh.NewInput().
				Title("Source URL").
				Value(&fr.Source),
		).Title("Attribution"),

		// Group 5: Ingredients
		huh.NewGroup(
			huh.NewText().
				Title("Ingredients").
				Description("One per line").
				Value(&fr.Ingredients),
		).Title("Ingredients"),

		// Group 6: Instructions
		huh.NewGroup(
			huh.NewText().
				Title("Instructions").
				Description("Steps separated by blank lines").
				Value(&fr.Instructions),
		).Title("Instructions"),
	)
}
