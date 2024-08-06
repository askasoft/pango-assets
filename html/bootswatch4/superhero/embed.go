package superhero

import (
	"embed"
)

//go:embed *.css *.scss
var FS embed.FS
