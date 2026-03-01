package recipe

import (
	"regexp"
	"strings"
)

type MealType string

const (
	Breakfast MealType = "breakfast"
	Lunch     MealType = "lunch"
	Dinner    MealType = "dinner"
	Snack     MealType = "snack"
	Dessert   MealType = "dessert"
)

var MealTypes = []MealType{Breakfast, Lunch, Dinner, Snack, Dessert}

type Difficulty string

const (
	Easy   Difficulty = "easy"
	Medium Difficulty = "medium"
	Hard   Difficulty = "hard"
)

var Difficulties = []Difficulty{Easy, Medium, Hard}

// TagCategory groups related tags for display in the form.
type TagCategory struct {
	Name string
	Tags []string
}

var TagCategories = []TagCategory{
	{"Style / Origin", []string{"traditional", "modern", "fusion", "experimental", "invention", "family-recipe"}},
	{"Atmosphere / Occasion", []string{"cozy", "festive", "fine-dining", "street-food", "luxurious"}},
	{"Flavor / Intensity", []string{"light", "bold", "hearty", "fresh", "spicy"}},
	{"Temperature", []string{"warm", "cold"}},
	{"Technique / Format", []string{"barbecue", "baked", "fried", "air-fried", "slow-cooked", "raw", "one-pot", "shareable", "portable", "plated"}},
	{"Conservation / Shelf-life", []string{"freezer-friendly", "make-ahead", "best-fresh"}},
}

// AllowedTags is the set of all valid tags for quick lookup.
var AllowedTags map[string]bool

func init() {
	AllowedTags = make(map[string]bool)
	for _, cat := range TagCategories {
		for _, t := range cat.Tags {
			AllowedTags[t] = true
		}
	}
}

// TagCategoryIndex returns the index of the category a tag belongs to, or -1.
func TagCategoryIndex(tag string) int {
	for i, cat := range TagCategories {
		for _, t := range cat.Tags {
			if t == tag {
				return i
			}
		}
	}
	return -1
}

type Recipe struct {
	Title      string     `yaml:"title"`
	Servings   int        `yaml:"servings"`
	PrepTime   string     `yaml:"prep_time"`
	CookTime   string     `yaml:"cook_time"`
	Cuisine    string     `yaml:"cuisine,omitempty"`
	MealType   MealType   `yaml:"meal_type"`
	Difficulty Difficulty `yaml:"difficulty"`
	Tags       []string   `yaml:"tags"`
	AddedBy    string     `yaml:"added_by"`
	Source     string     `yaml:"source,omitempty"`
	Image      string     `yaml:"image,omitempty"`
	Ingredients []string  `yaml:"ingredients"`
}

// RecipeFile holds a Recipe plus instructions (which are the markdown body, not frontmatter).
type RecipeFile struct {
	Recipe       Recipe
	Instructions []string // numbered steps
}

var nonAlphaNum = regexp.MustCompile(`[^a-z0-9]+`)
var leadTrailDash = regexp.MustCompile(`^-|-$`)

func Slug(title string) string {
	s := strings.ToLower(title)
	s = nonAlphaNum.ReplaceAllString(s, "-")
	s = leadTrailDash.ReplaceAllString(s, "")
	return s
}
