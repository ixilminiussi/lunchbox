package recipe

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Paths holds resolved directories for the project.
type Paths struct {
	Root       string
	RecipesDir string
	ImagesDir  string
}

// FindProjectRoot walks up from cwd looking for go.mod.
func FindProjectRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("could not find project root (no go.mod found)")
		}
		dir = parent
	}
}

// NewPaths creates a Paths from the project root.
func NewPaths() (*Paths, error) {
	root, err := FindProjectRoot()
	if err != nil {
		return nil, err
	}
	return &Paths{
		Root:       root,
		RecipesDir: filepath.Join(root, "src", "data", "recipes"),
		ImagesDir:  filepath.Join(root, "public", "images"),
	}, nil
}

// ListRecipes reads all .md files in RecipesDir and parses them.
func (p *Paths) ListRecipes() ([]*RecipeFile, error) {
	entries, err := filepath.Glob(filepath.Join(p.RecipesDir, "*.md"))
	if err != nil {
		return nil, err
	}

	var recipes []*RecipeFile
	for _, entry := range entries {
		rf, err := ParseFile(entry)
		if err != nil {
			continue // skip unparseable files
		}
		recipes = append(recipes, rf)
	}
	return recipes, nil
}

// SaveRecipe writes a RecipeFile to disk.
func (p *Paths) SaveRecipe(rf *RecipeFile) (string, error) {
	if err := os.MkdirAll(p.RecipesDir, 0o755); err != nil {
		return "", err
	}

	slug := Slug(rf.Recipe.Title)
	path := filepath.Join(p.RecipesDir, slug+".md")
	content := RenderMarkdown(rf)

	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return "", err
	}
	return path, nil
}

// DeleteRecipe removes the .md file and optionally the image for a recipe.
func (p *Paths) DeleteRecipe(rf *RecipeFile) error {
	slug := Slug(rf.Recipe.Title)
	mdPath := filepath.Join(p.RecipesDir, slug+".md")
	if err := os.Remove(mdPath); err != nil {
		return err
	}

	// Try to remove the image too
	if rf.Recipe.Image != "" {
		imgPath := filepath.Join(p.Root, "public", strings.TrimPrefix(rf.Recipe.Image, "/"))
		os.Remove(imgPath) // ignore error - image may not exist
	}
	return nil
}

// DownloadImage fetches an image URL and saves it to public/images/<slug>.<ext>.
func (p *Paths) DownloadImage(imageURL, slug string) (string, error) {
	if err := os.MkdirAll(p.ImagesDir, 0o755); err != nil {
		return "", err
	}

	// Determine extension from URL
	parsed, err := url.Parse(imageURL)
	if err != nil {
		return "", err
	}
	ext := filepath.Ext(parsed.Path)
	if ext == "" || len(ext) > 5 {
		ext = ".jpg"
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(imageURL)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("image download failed: %s", resp.Status)
	}

	filename := slug + ext
	destPath := filepath.Join(p.ImagesDir, filename)
	f, err := os.Create(destPath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	if _, err := io.Copy(f, resp.Body); err != nil {
		return "", err
	}

	return "/images/" + filename, nil
}
