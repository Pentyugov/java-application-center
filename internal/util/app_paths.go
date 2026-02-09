package util

import (
	"fmt"
	"os"
	"path/filepath"
)

const (
	AppName = "JAC"
)

func RoamingAppDir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("ошибка получения UserConfigDir: %w", err)
	}
	return filepath.Join(base, AppName), nil
}

func LogsDir() (string, error) {
	roamingAppDir, err := RoamingAppDir()
	if err != nil {
		return "", fmt.Errorf("ошибка получения RoamingAppDir: %w", err)
	}

	return filepath.Join(roamingAppDir, "logs"), nil
}

func SettingsFilePath() (string, error) {
	dir, err := RoamingAppDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "settings.json"), nil
}

func CentralInfoFilePath(dir string) (string, error) {
	if stat, err := os.Stat(dir); err != nil || !stat.IsDir() {
		return "", fmt.Errorf("directory error: %w", err)
	}
	return filepath.Join(dir, "central-info.json"), nil
}

func BuildCentralInfoFilePath(folderPath string) string {
	return filepath.Join(folderPath, "central-info.json")
}

func BuildGitDirPath(dir string) string {
	return filepath.Join(dir, ".git")
}
