package main

import (
	"central-desktop/internal/util"
	"context"
	"embed"
	"io"
	"log"
	"log/slog"
	"os"
	"path/filepath"
	"sync/atomic"
	"time"

	"github.com/lutischan-ferenc/systray"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed frontend/dist/central-ui/browser
var assets embed.FS

//go:embed build/tray.ico
var trayIcon []byte

func main() {

	slogger, closeLogs, serr := initLogger()
	if serr != nil {
		panic(serr)
	}

	slogger.Info("Starting JAC application...")
	app := NewApp(slogger, closeLogs)

	var wailsCtx context.Context
	var forceQuit atomic.Bool

	onSecondInstance := func(data options.SecondInstanceData) {
		if wailsCtx == nil {
			return
		}

		runtime.WindowShow(wailsCtx)
		runtime.WindowUnminimise(wailsCtx)

		time.Sleep(30 * time.Millisecond)

		runtime.WindowSetAlwaysOnTop(wailsCtx, true)
		runtime.WindowSetAlwaysOnTop(wailsCtx, false)
	}

	onStartup := func(ctx context.Context) {
		wailsCtx = ctx
		forceQuit.Store(false)

		app.startup(ctx)

		go systray.Run(func() {
			if len(trayIcon) > 0 {
				systray.SetIcon(trayIcon)
			}
			systray.SetTitle("Java Application Center")
			systray.SetTooltip("Java Application Center")

			mShow := systray.AddMenuItem("Показать", "Показать окно")
			mHide := systray.AddMenuItem("Скрыть", "Скрыть окно")
			systray.AddSeparator()
			mQuit := systray.AddMenuItem("Выход", "Закрыть приложение")

			mShow.Click(func() {
				if wailsCtx == nil {
					return
				}
				runtime.WindowShow(wailsCtx)
				runtime.WindowUnminimise(wailsCtx)
			})

			mHide.Click(func() {
				if wailsCtx == nil {
					return
				}
				runtime.WindowHide(wailsCtx)
			})

			mQuit.Click(func() {
				forceQuit.Store(true)
				if wailsCtx != nil {
					runtime.Quit(wailsCtx)
				}
				systray.Quit()
			})

			systray.SetOnDClick(func(menu systray.IMenu) {
				if wailsCtx == nil {
					return
				}
				runtime.WindowShow(wailsCtx)
				runtime.WindowUnminimise(wailsCtx)
			})

			systray.SetOnRClick(func(menu systray.IMenu) {
				_ = menu.ShowMenu()
			})
		}, func() {})
	}

	onBeforeClose := func(ctx context.Context) bool {
		if forceQuit.Load() {
			return false
		}

		if app.deps.Services.SettingsService.MinimizeToTrayOnClose() {
			runtime.WindowHide(ctx)
			return true
		}

		return false
	}

	onShutdown := func(ctx context.Context) {
		app.shutdown(ctx)
		systray.Quit()
	}

	err := wails.Run(&options.App{
		Title:             "Java Application Center",
		Width:             1600,
		Height:            900,
		MinWidth:          1600,
		MinHeight:         900,
		HideWindowOnClose: false,
		DisableResize:     false,
		Fullscreen:        false,
		Frameless:         false,
		StartHidden:       false,
		Assets:            assets,
		LogLevel:          logger.DEBUG,

		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId:               "b9f6c4d8-3a2b-4f4a-9f3a-9a7d0c2d1f55",
			OnSecondInstanceLaunch: onSecondInstance,
		},

		OnStartup:     onStartup,
		OnDomReady:    app.domReady,
		OnBeforeClose: onBeforeClose,
		OnShutdown:    onShutdown,

		Bind: []interface{}{
			app,
		},

		Windows: &windows.Options{
			DisableWindowIcon: false,
		},
	})

	if err != nil {
		log.Fatal(err)
	}
}

func initLogger() (*slog.Logger, func() error, error) {
	if err := util.InitLogsDir(); err != nil {
		return nil, nil, err
	}

	logsDir, err := util.LogsDir()
	if err != nil {
		return nil, nil, err
	}

	logFile, err := os.OpenFile(
		filepath.Join(logsDir, "app.log"),
		os.O_CREATE|os.O_WRONLY|os.O_APPEND,
		0644,
	)
	if err != nil {
		return nil, nil, err
	}

	opts := &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}

	handler := slog.NewJSONHandler(io.MultiWriter(logFile, os.Stdout), opts)
	slogger := slog.New(handler)

	closeFn := func() error {
		return logFile.Close()
	}

	return slogger, closeFn, nil
}
