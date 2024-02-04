package bootswatch4

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
)

func TestEmbedFS(t *testing.T) {
	os.Remove("_actual.out")
	os.Remove("_expect.out")

	afs := []string{}
	fs.WalkDir(FS, ".", func(path string, d fs.DirEntry, err error) error {
		if filepath.Ext(path) == ".go" {
			t.Errorf("go source file embedded: %s", path)
		}
		afs = append(afs, strings.ReplaceAll(path, "\\", "/"))
		return nil
	})
	sort.Strings(afs)

	wfs := []string{}
	filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		fmt.Println(path)
		base := filepath.Base(path)
		ext := filepath.Ext(base)
		if !strings.HasPrefix(base, "__debug_bin") && ext != ".go" {
			wfs = append(wfs, strings.ReplaceAll(path, "\\", "/"))
		}
		return nil
	})
	sort.Strings(wfs)

	os.WriteFile("_actual.out", []byte(strings.Join(afs, "\n")), os.FileMode(666))
	os.WriteFile("_expect.out", []byte(strings.Join(wfs, "\n")), os.FileMode(666))

	fmt.Println("------------------------")
	for i, a := range afs {
		fmt.Printf("[%d] %s\n", i, a)
		if i >= len(wfs) {
			t.Fatalf("[%d] = %v, want %v", i, a, "")
		}
		if a != wfs[i] {
			t.Fatalf("[%d] = %v, want %v", i, a, wfs[i])
		}
	}
	if len(afs) != len(wfs) {
		t.Fatalf("file count = %v, want %v", len(afs), len(wfs))
	}
	fmt.Println("------------------------")

	os.Remove("_actual.out")
	os.Remove("_expect.out")
}
