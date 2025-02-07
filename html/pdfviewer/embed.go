package pdfviewer

import (
	"embed"
)

//go:embed *.css *.mjs *.html LICENSE */*
var FS embed.FS
