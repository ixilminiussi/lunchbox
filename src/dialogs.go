package main

import (
	"regexp"
	"strconv"

	tea "github.com/charmbracelet/bubbletea"
	huh "github.com/charmbracelet/huh"
)

type dialogs struct {
	Forms [stateCount]*huh.Form
	State *state
}

func (d dialogs) Init() tea.Cmd {
	var cmds []tea.Cmd

	cmds = append(cmds, d.Forms[New].Init())
	cmds = append(cmds, d.Forms[Home].Init())

	return tea.Batch(cmds...)
}

func (d *dialogs) HandleNext() state {
	switch *d.State {
	case Home:
		*d.State = d.Forms[*d.State].Get("next state").(state)
	}

	return *d.State
}

func (d dialogs) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd

	if d.Forms[*d.State] != nil {
		// Process the form
		form, cmd := d.Forms[*d.State].Update(msg)
		if f, ok := form.(*huh.Form); ok {
			d.Forms[*d.State] = f
			cmds = append(cmds, cmd)
		}

		if d.FormCompleted() {
			d.HandleNext()
		}
	}

	return d, tea.Batch(cmds...)
}
func (d dialogs) FormCompleted() bool {
	return d.Forms[*d.State].State == huh.StateCompleted
}

func (d dialogs) View() string {
	if d.Forms[*d.State] == nil {
		return "not yet implemented"
	}

	return d.Forms[*d.State].View()
}

func NewDialogs(s *state) dialogs {
	d := dialogs{
		State: s,
		Forms: [stateCount]*huh.Form{},
	}

	for i, _ := range d.Forms {
		d.Forms[i] = nil
	}

	d.Forms[Home] = huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[state]().
				Key("next state").
				Title("What do you want to do").
				Options(
					huh.NewOption("Add recipe", New),
					huh.NewOption("List existing recipes", List),
					huh.NewOption("Quit", Quit),
				),
		),
	)

	d.Forms[New] = huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Key("name").
				Title("Name").
				Prompt("? ").
				Placeholder(""),

			huh.NewText().
				Key("description").
				Title("Description"),

			huh.NewInput().
				Key("portions").
				Title("Portions").
				Prompt("? ").
				Validate(isInt),

			huh.NewInput().
				Key("time").
				Title("Time").
				Prompt("min ").
				Validate(isInt),
		),
		huh.NewGroup(
			huh.NewText().
				Key("ingredients").
				Title("Ingredients").
				Placeholder("250g flour, 1 egg..."),

			huh.NewText().
				Key("instructions").
				Title("Instructions").
				Placeholder("Mix ingredients; Put in oven;..."),
		),
	)

	return d
}

func ParseIngredients(str string) ([]ingredient, error) {
	var ingredients []ingredient

	regex := regexp.MustCompile("([0-9]*\\.?[0-9]+)([a-z]*) ([a-z ]+)")
	matches := regex.FindAllStringSubmatch(str, -1)

	for _, match := range matches {
		quant, err := strconv.ParseFloat(match[1], 32)
		if err != nil {
			return nil, err
		}

		ingredients = append(ingredients, ingredient{
			Quantity: float32(quant),
			Unit:     match[2],
			Name:     match[3],
		})
	}

	return ingredients, nil
}

func (d dialogs) GetRecipe() recipe {
	var r recipe

	r.Name = d.Forms[New].GetString("name")
	r.Description = d.Forms[New].GetString("description")
	r.Portions, _ = strconv.Atoi(d.Forms[New].GetString("portions"))
	r.Time, _ = strconv.Atoi(d.Forms[New].GetString("time"))
	r.Ingredients, _ = ParseIngredients(d.Forms[New].GetString("ingredients"))
	return r
}
