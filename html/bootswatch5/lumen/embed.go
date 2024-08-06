package lumen

import (
	"embed"
)

//go:embed *.css *.scss *.map
var FS embed.FS
