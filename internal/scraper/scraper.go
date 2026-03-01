package scraper

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"

	"lunchbox/internal/recipe"
)

// FetchRecipe fetches a URL and extracts the Recipe JSON-LD into a RecipeFile.
func FetchRecipe(url string) (*recipe.RecipeFile, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; LunchboxBot/1.0)")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("parsing HTML: %w", err)
	}

	ld, err := extractRecipeLD(doc)
	if err != nil {
		return nil, err
	}

	return convertToRecipeFile(ld, url), nil
}

func extractRecipeLD(doc *goquery.Document) (*RecipeLD, error) {
	var found *RecipeLD

	doc.Find(`script[type="application/ld+json"]`).Each(func(_ int, s *goquery.Selection) {
		if found != nil {
			return
		}
		text := strings.TrimSpace(s.Text())
		if text == "" {
			return
		}

		// Try direct Recipe object
		var single RecipeLD
		if json.Unmarshal([]byte(text), &single) == nil && single.Type == "Recipe" {
			found = &single
			return
		}

		// Try @graph array
		var graph struct {
			Graph []json.RawMessage `json:"@graph"`
		}
		if json.Unmarshal([]byte(text), &graph) == nil {
			for _, item := range graph.Graph {
				var r RecipeLD
				if json.Unmarshal(item, &r) == nil && r.Type == "Recipe" {
					found = &r
					return
				}
			}
		}

		// Try plain array
		var arr []json.RawMessage
		if json.Unmarshal([]byte(text), &arr) == nil {
			for _, item := range arr {
				var r RecipeLD
				if json.Unmarshal(item, &r) == nil && r.Type == "Recipe" {
					found = &r
					return
				}
			}
		}
	})

	if found == nil {
		return nil, fmt.Errorf("no Recipe JSON-LD found on this page")
	}
	return found, nil
}

func convertToRecipeFile(ld *RecipeLD, sourceURL string) *recipe.RecipeFile {
	title := cleanText(ld.Name)
	if title == "" {
		title = "Untitled"
	}

	ingredients := make([]string, len(ld.RecipeIngredient))
	for i, ing := range ld.RecipeIngredient {
		ingredients[i] = cleanText(ing)
	}

	return &recipe.RecipeFile{
		Recipe: recipe.Recipe{
			Title:       title,
			Servings:    ParseYield(ld.RecipeYield),
			PrepTime:    ParseTime(ld.PrepTime),
			CookTime:    ParseTime(ld.CookTime),
			Cuisine:     ParseCuisine(ld.RecipeCuisine),
			MealType:    recipe.Dinner,
			Difficulty:  recipe.Medium,
			Tags:        ParseKeywords(ld.Keywords),
			AddedBy:     "Ixil",
			Source:      sourceURL,
			Ingredients: ingredients,
		},
		Instructions: ParseInstructions(ld.RecipeInstructions),
	}
}
