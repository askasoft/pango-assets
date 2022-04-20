package bootswatch3

import (
	"fmt"
	"io/fs"
	"path/filepath"
	"testing"
)

func TestEmbedFS_HTML(t *testing.T) {
	fmt.Println("------------------------")
	fs.WalkDir(FS, ".", func(path string, d fs.DirEntry, err error) error {
		fmt.Println(path)
		if filepath.Ext(path) == ".go" {
			t.Errorf("go source file embedded: %s", path)
		}
		return nil
	})
	fmt.Println("------------------------")
}
