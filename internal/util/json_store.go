package util

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

func ReadJSON[T any](filePath string) (*T, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("read file %s: %w", filePath, err)
	}

	var v T
	if err := json.Unmarshal(data, &v); err != nil {
		return nil, fmt.Errorf("unmarshal json %s: %w", filePath, err)
	}

	return &v, nil
}

func WriteJSON[T any](filePath string, v *T) error {
	if v == nil {
		return errors.New("value is nil")
	}

	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("mkdir %s: %w", dir, err)
	}

	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal json: %w", err)
	}
	data = append(data, '\n')

	if err := os.WriteFile(filePath, data, 0o644); err != nil {
		return fmt.Errorf("write file %s: %w", filePath, err)
	}

	return nil
}

func ReadOrCreateJSON[T any](filePath string, defaultFactory func() *T) (*T, error) {
	v, err := ReadJSON[T](filePath)
	if err == nil {
		return v, nil
	}

	if !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}

	if defaultFactory == nil {
		return nil, fmt.Errorf("defaultFactory is nil for %s", filePath)
	}

	def := defaultFactory()
	if err := WriteJSON(filePath, def); err != nil {
		return nil, err
	}

	return def, nil
}
