package plugins

import (
	"embed"
)

//go:embed css/plugins.* js/plugins.*
var FS embed.FS
