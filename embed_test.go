package assets

import (
	"fmt"
	"io/fs"
	"testing"
)

func TestEmbedFS_HTML(t *testing.T) {
	fmt.Println("------------------------")
	fs.WalkDir(HTML, ".", func(path string, d fs.DirEntry, err error) error {
		fmt.Println(path)
		return nil
	})
	fmt.Println("------------------------")
}
