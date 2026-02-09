package util

import (
	"central-desktop/internal/domain"
	"central-desktop/internal/dto"
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func DefaultAppSettings() *domain.AppSettings {

	ciPath, err := RoamingAppDir()
	if err != nil {
		panic(err)
	}

	return &domain.AppSettings{
		ApplicationStartingDelaySec: 15,
		CentralInfoPath:             ciPath,
		MinimizeToTrayOnClose:       false,
		StartQuietMode:              false,
	}
}

func DefaultCentralInfo() *domain.CentralInfo {
	return &domain.CentralInfo{
		GlobalVariables:  []domain.EnvVariable{},
		ApplicationInfos: []domain.ApplicationInfo{},
	}
}

func PickJarFile(ctx context.Context) (string, error) {
	path, err := runtime.OpenFileDialog(ctx, runtime.OpenDialogOptions{
		Title: "Выберите JAR файл",
		Filters: []runtime.FileFilter{
			{DisplayName: "Java Archive (*.jar)", Pattern: "*.jar"},
			{DisplayName: "All files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

func PickCentralInfoFolder(ctx context.Context) (string, error) {
	path, err := runtime.OpenDirectoryDialog(ctx, runtime.OpenDialogOptions{
		Title: "Выберите папку Central Info",
	})
	if err != nil {
		return "", err
	}

	if path == "" {
		return "", nil
	}

	return path, nil
}

func HasGitFolder(appDir string) (bool, error) {
	info, err := os.Stat(BuildGitDirPath(appDir))
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}

	return info.IsDir(), nil
}

func HasMaven(appDir string) (bool, error) {
	info, err := os.Stat(filepath.Join(appDir, "pom.xml"))
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}

	return !info.IsDir(), nil
}

func PickBaseApplicationFolder(ctx context.Context) (*dto.PickBaseApplicationFolderDTO, error) {
	baseDir, err := runtime.OpenDirectoryDialog(ctx, runtime.OpenDialogOptions{
		Title: "Выберите папку c .git",
	})
	if err != nil {
		return nil, err
	}
	if baseDir == "" {
		return nil, nil
	}

	jarPaths, err := ScanJars(baseDir)
	if err != nil {
		return nil, err
	}
	if len(jarPaths) < 1 {
		return nil, errors.New("в выбранной директории не найдено ни одного .jar файла")
	}

	return &dto.PickBaseApplicationFolderDTO{
		BaseDir:  baseDir,
		JarPaths: jarPaths,
	}, nil

}

func InitApplicationSettings() (*domain.AppSettings, error) {
	path, err := SettingsFilePath()
	if err != nil {
		return nil, err
	}

	appSettings, err := ReadOrCreateJSON[domain.AppSettings](path, DefaultAppSettings)
	if err != nil {
		return nil, fmt.Errorf("init settings from %s: %w", path, err)
	}

	return appSettings, nil
}

func InitLogsDir() error {
	logsDir, err := LogsDir()
	if err != nil {
		return err
	}

	if err := os.MkdirAll(logsDir, 0o755); err != nil {
		return fmt.Errorf("ошибка при создании папки %s: %w", logsDir, err)
	}
	return nil
}

func ReadOrCreateCentralInfo(dir string) (*domain.CentralInfo, error) {
	path, err := CentralInfoFilePath(dir)
	if err != nil {
		return nil, err
	}

	info, err := ReadOrCreateJSON[domain.CentralInfo](path, DefaultCentralInfo)
	if err != nil {
		return nil, fmt.Errorf("init central info from %s: %w", path, err)
	}

	return info, nil
}

func MoveFile(srcPath string, dstDir string) (string, error) {
	if _, err := os.Stat(srcPath); err != nil {
		return "", fmt.Errorf("source file error: %w", err)
	}

	if stat, err := os.Stat(dstDir); err != nil || !stat.IsDir() {
		return "", fmt.Errorf("destination directory error: %w", err)
	}

	dstPath := filepath.Join(dstDir, filepath.Base(srcPath))

	// Пытаемся просто переименовать (быстро, если в пределах одного диска)
	err := os.Rename(srcPath, dstPath)
	if err == nil {
		return dstPath, nil
	}

	// Если rename не сработал (например, другой диск) — копируем вручную
	if err := copyFile(srcPath, dstPath); err != nil {
		return "", err
	}

	// Удаляем оригинал после успешного копирования
	if err := os.Remove(srcPath); err != nil {
		return "", err
	}

	return dstPath, nil
}

func copyFile(src, dst string) (err error) {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer func() {
		if cerr := sourceFile.Close(); err == nil && cerr != nil {
			err = cerr
		}
	}()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer func() {
		if cerr := destFile.Close(); err == nil && cerr != nil {
			err = cerr
		}
	}()

	if _, err = io.Copy(destFile, sourceFile); err != nil {
		return err
	}

	info, err := os.Stat(src)
	if err == nil {
		err = os.Chmod(dst, info.Mode())
	}

	return err
}

func RemoveFile(pathToFile string) error {
	const attempts = 10
	const delay = 150 * time.Millisecond

	var lastErr error
	for i := 0; i < attempts; i++ {
		err := os.Remove(pathToFile)
		if err == nil || os.IsNotExist(err) {
			return nil
		}
		lastErr = err
		time.Sleep(delay)
	}
	return fmt.Errorf("не удалось удалить файл логов: %s после %d попыток: %w", pathToFile, attempts, lastErr)
}

func ScanJars(baseDir string) ([]string, error) {
	if baseDir == "" {
		return nil, fmt.Errorf("baseDir is empty")
	}

	var jars []string

	err := filepath.WalkDir(baseDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() {
			return nil
		}

		if strings.EqualFold(filepath.Ext(d.Name()), ".jar") {
			absPath, absErr := filepath.Abs(path)
			if absErr != nil {
				return absErr
			}
			jars = append(jars, absPath)
		}

		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("scan jars in %s: %w", baseDir, err)
	}

	return jars, nil
}

func GetLogFileName(appName string) string {
	return fmt.Sprintf("jac-%s.log", appName)
}

func openFile(filePath string) (*os.File, error) {
	return os.Open(filePath)
}
