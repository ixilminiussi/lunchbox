package scraper

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// RecipeLD maps Schema.org Recipe fields using json.RawMessage for flexible types.
type RecipeLD struct {
	Type               string          `json:"@type"`
	Name               string          `json:"name"`
	RecipeYield        json.RawMessage `json:"recipeYield"`
	PrepTime           string          `json:"prepTime"`
	CookTime           string          `json:"cookTime"`
	RecipeCuisine      json.RawMessage `json:"recipeCuisine"`
	Keywords           json.RawMessage `json:"keywords"`
	RecipeIngredient   []string        `json:"recipeIngredient"`
	RecipeInstructions json.RawMessage `json:"recipeInstructions"`
	Image              json.RawMessage `json:"image"`
}

// ParseYield extracts servings as an int from various formats.
func ParseYield(raw json.RawMessage) int {
	if raw == nil {
		return 4
	}

	// Try string
	var s string
	if json.Unmarshal(raw, &s) == nil {
		return extractNumber(s)
	}

	// Try array of strings
	var arr []string
	if json.Unmarshal(raw, &arr) == nil && len(arr) > 0 {
		return extractNumber(arr[0])
	}

	// Try number
	var n int
	if json.Unmarshal(raw, &n) == nil {
		return n
	}

	return 4
}

var numberRegex = regexp.MustCompile(`\d+`)

func extractNumber(s string) int {
	m := numberRegex.FindString(s)
	if m == "" {
		return 4
	}
	n, _ := strconv.Atoi(m)
	if n == 0 {
		return 4
	}
	return n
}

// ParseCuisine extracts a cuisine string.
func ParseCuisine(raw json.RawMessage) string {
	if raw == nil {
		return ""
	}

	var s string
	if json.Unmarshal(raw, &s) == nil {
		return s
	}

	var arr []string
	if json.Unmarshal(raw, &arr) == nil && len(arr) > 0 {
		return arr[0]
	}

	return ""
}

// ParseKeywords extracts tags from keywords field.
func ParseKeywords(raw json.RawMessage) []string {
	if raw == nil {
		return nil
	}

	// Try array
	var arr []string
	if json.Unmarshal(raw, &arr) == nil {
		var result []string
		for _, k := range arr {
			k = strings.TrimSpace(strings.ToLower(k))
			if k != "" {
				result = append(result, k)
			}
		}
		return result
	}

	// Try comma-separated string
	var s string
	if json.Unmarshal(raw, &s) == nil {
		var result []string
		for _, k := range strings.Split(s, ",") {
			k = strings.TrimSpace(strings.ToLower(k))
			if k != "" {
				result = append(result, k)
			}
		}
		return result
	}

	return nil
}

// InstructionStep represents a HowToStep in JSON-LD.
type InstructionStep struct {
	Type string `json:"@type"`
	Text string `json:"text"`
}

// ParseInstructions extracts instruction steps from various formats.
func ParseInstructions(raw json.RawMessage) []string {
	if raw == nil {
		return nil
	}

	// Try array of objects (HowToStep)
	var steps []InstructionStep
	if json.Unmarshal(raw, &steps) == nil {
		var result []string
		for _, s := range steps {
			text := cleanText(s.Text)
			if text != "" {
				result = append(result, text)
			}
		}
		if len(result) > 0 {
			return result
		}
	}

	// Try array of strings
	var strSteps []string
	if json.Unmarshal(raw, &strSteps) == nil {
		var result []string
		for _, s := range strSteps {
			text := cleanText(s)
			if text != "" {
				result = append(result, text)
			}
		}
		return result
	}

	// Try array of HowToSection containing itemListElement
	var sections []struct {
		Type            string          `json:"@type"`
		ItemListElement json.RawMessage `json:"itemListElement"`
	}
	if json.Unmarshal(raw, &sections) == nil {
		var result []string
		for _, sec := range sections {
			var secSteps []InstructionStep
			if json.Unmarshal(sec.ItemListElement, &secSteps) == nil {
				for _, s := range secSteps {
					text := cleanText(s.Text)
					if text != "" {
						result = append(result, text)
					}
				}
			}
		}
		if len(result) > 0 {
			return result
		}
	}

	return nil
}

// ParseImage extracts the best image URL.
func ParseImage(raw json.RawMessage) string {
	if raw == nil {
		return ""
	}

	// Try string
	var s string
	if json.Unmarshal(raw, &s) == nil {
		return s
	}

	// Try array of strings
	var arr []string
	if json.Unmarshal(raw, &arr) == nil && len(arr) > 0 {
		return arr[0]
	}

	// Try object with url field
	var obj struct {
		URL string `json:"url"`
	}
	if json.Unmarshal(raw, &obj) == nil && obj.URL != "" {
		return obj.URL
	}

	// Try array of objects
	var objArr []struct {
		URL string `json:"url"`
	}
	if json.Unmarshal(raw, &objArr) == nil && len(objArr) > 0 {
		return objArr[0].URL
	}

	return ""
}

// ParseTime converts an ISO 8601 duration (e.g., PT2H30M) to a readable string.
func ParseTime(iso string) string {
	if iso == "" {
		return "0 min"
	}
	re := regexp.MustCompile(`PT(?:(\d+)H)?(?:(\d+)M)?`)
	match := re.FindStringSubmatch(iso)
	if match == nil {
		return iso
	}
	h, _ := strconv.Atoi(match[1])
	m, _ := strconv.Atoi(match[2])
	if h > 0 && m > 0 {
		return fmt.Sprintf("%dh %dmin", h, m)
	}
	if h > 0 {
		return fmt.Sprintf("%dh", h)
	}
	return fmt.Sprintf("%d min", m)
}

var whitespace = regexp.MustCompile(`\s+`)

func cleanText(s string) string {
	return strings.TrimSpace(whitespace.ReplaceAllString(s, " "))
}
