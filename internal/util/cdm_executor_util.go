package util

import (
	"bytes"
	"central-desktop/internal/domain"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"

	"golang.org/x/sys/windows"
)

type CommandResult struct {
	Path    string    `json:"path"`
	PID     int       `json:"pid"`
	Started time.Time `json:"started"`
}

type JavaProcessInfo struct {
	PID  int    `json:"pid"`
	Path string `json:"path"`
}

func RunApplication(appInfo *domain.ApplicationInfo) (*CommandResult, error) {
	if appInfo == nil {
		return nil, fmt.Errorf("appInfo is nil")
	}
	if strings.TrimSpace(appInfo.Path) == "" {
		return nil, fmt.Errorf("appInfo.Path is empty")
	}

	inner := buildInnerCmd(appInfo)
	cmd := exec.Command("cmd.exe", "/C", "start", "", "/min", "cmd", "/K", inner)

	cmd.Env = append(os.Environ(), toEnvList(appInfo.EnvVariables)...)

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start app %s: %w", appInfo.AppName, err)
	}

	return &CommandResult{
		Path:    appInfo.Path,
		PID:     cmd.Process.Pid,
		Started: time.Now(),
	}, nil
}

func RunApplicationSilent(appInfo *domain.ApplicationInfo) (*CommandResult, error) {
	if appInfo == nil {
		return nil, fmt.Errorf("appInfo is nil")
	}
	if strings.TrimSpace(appInfo.Path) == "" {
		return nil, fmt.Errorf("appInfo.Path is empty")
	}

	jarPath := appInfo.Path
	logsDir, err := LogsDir()
	if err != nil {
		return nil, err
	}

	logPath := filepath.Join(logsDir, GetLogFileName(appInfo.AppName))

	if err := RemoveFile(logPath); err != nil {
		return nil, err
	}

	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to create log file %s: %w", logPath, err)
	}

	closeOnError := true
	defer func() {
		if closeOnError {
			_ = logFile.Close()
		}
	}()

	args := make([]string, 0, len(appInfo.AppArguments)+2)
	args = append(args, appInfo.AppArguments...)
	args = append(args, "-jar", jarPath)

	cmd := exec.Command("java", args...)
	cmd.Env = append(os.Environ(), toEnvList(appInfo.EnvVariables)...)
	cmd.Dir = filepath.Dir(appInfo.Path)
	cmd.Stdout = logFile
	cmd.Stderr = logFile

	if runtime.GOOS == "windows" {
		cmd.SysProcAttr = &syscall.SysProcAttr{
			HideWindow: true,
			CreationFlags: windows.CREATE_NO_WINDOW |
				windows.DETACHED_PROCESS,
		}
	}

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start app %s: %w", appInfo.AppName, err)
	}

	closeOnError = false

	return &CommandResult{
		Path:    jarPath,
		PID:     cmd.Process.Pid,
		Started: time.Now(),
	}, nil
}

func buildInnerCmd(appInfo *domain.ApplicationInfo) string {
	var b strings.Builder
	b.WriteString("chcp 1251 & ")
	b.WriteString("java")

	if len(appInfo.AppArguments) > 0 {
		b.WriteString(" ")
		b.WriteString(strings.Join(appInfo.AppArguments, " "))
	}

	b.WriteString(" -jar ")
	b.WriteString(appInfo.Path)
	fmt.Println(b.String())
	return b.String()
}

func toEnvList(vars []domain.EnvVariable) []string {
	out := make([]string, 0, len(vars))
	for _, v := range vars {
		name := strings.TrimSpace(v.Name)
		if name == "" {
			continue
		}
		// Windows env: NAME=VALUE
		out = append(out, name+"="+v.Value)
	}
	return out
}

func ListJavaProcesses() ([]JavaProcessInfo, error) {
	cmd := exec.Command("jps", "-lv")

	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr

	if runtime.GOOS == "windows" {
		cmd.SysProcAttr = &syscall.SysProcAttr{
			HideWindow:    true,
			CreationFlags: windows.CREATE_NO_WINDOW,
		}
	}

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("jps failed: %w: %s", err, stderr.String())
	}

	lines := strings.Split(out.String(), "\n")
	result := make([]JavaProcessInfo, 0)

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}

		pid, err := strconv.Atoi(parts[0])
		if err != nil {
			continue
		}

		command := parts[1]
		if !strings.HasSuffix(strings.ToLower(command), ".jar") {
			continue
		}

		path := command
		if !filepath.IsAbs(path) {
			path, _ = filepath.Abs(path)
		}

		result = append(result, JavaProcessInfo{
			PID:  pid,
			Path: path,
		})
	}

	return result, nil
}

func StopProcess(pid int) error {
	if pid <= 0 {
		return fmt.Errorf("invalid pid: %d", pid)
	}

	handle, err := windows.OpenProcess(windows.PROCESS_TERMINATE, false, uint32(pid))
	if err != nil {
		return fmt.Errorf("failed to open process %d: %w", pid, err)
	}

	defer func() {
		if cErr := windows.CloseHandle(handle); cErr != nil {
			fmt.Printf("warning: failed to close handle for pid %d: %v\n", pid, cErr)
		}
	}()

	if err := windows.TerminateProcess(handle, 1); err != nil {
		return fmt.Errorf("failed to terminate process %d: %w", pid, err)
	}

	return nil
}
