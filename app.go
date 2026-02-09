package main

import (
	"central-desktop/internal/app"
	"central-desktop/internal/domain"
	"central-desktop/internal/dto"
	"central-desktop/internal/service"
	"central-desktop/internal/util"
	"context"
	"log/slog"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx       context.Context
	deps      *app.Deps
	Logger    *slog.Logger
	closeLogs func() error
}

func NewApp(slogger *slog.Logger, closeLogFunc func() error) *App {
	return &App{
		Logger:    slogger,
		closeLogs: closeLogFunc,
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.deps = initDeps(ctx, a.Logger)
}

func (a *App) shutdown(_ context.Context) {
	a.StopAllApplications()
	if a.closeLogs != nil {
		_ = a.closeLogs()
	}
}

func (a *App) domReady(ctx context.Context) {
	runtime.WindowMaximise(ctx)
}

func (a *App) GetCentralInfoDTO() (res *dto.CentralInfoDTO) {
	res, err := a.deps.Services.CentralService.GetCentralInfoDTO()
	if err != nil {
		a.logError(err)
	}
	return
}

func (a *App) Save(info *domain.CentralInfo) (res *dto.CentralInfoDTO) {
	res, err := a.deps.Services.CentralService.Save(info)
	if err != nil {
		a.logError(err)
	}
	return
}

func (a *App) RunAll() {
	a.deps.Services.CentralService.RunAll()
}

func (a *App) RunApplication(appName string) (res *util.CommandResult) {
	res, err := a.deps.Services.CentralService.RunApplication(appName)
	if err != nil {
		a.logError(err)
	}
	return
}

func (a *App) StopApplication(appName string) {
	err := a.deps.Services.CentralService.StopApplication(appName)
	if err != nil {
		a.logError(err)
	}
}

func (a *App) StopAllApplications() {
	err := a.deps.Services.CentralService.StopAllApplications()
	if err != nil {
		a.logError(err)
	}
}

func (a *App) GetRunningProcesses() (res []*dto.RunningProcessDTO) {
	res, err := a.deps.Services.CentralService.GetRunningProcesses()
	if err != nil {
		a.logError(err)
	}
	return
}

func (a *App) PickJarFile() (res string) {
	res, err := util.PickJarFile(a.ctx)
	if err != nil {
		a.logError(err)
	}
	return
}

func (a *App) PickGitFolder() (res string) {
	res, err := util.PickGitFolder(a.ctx)
	if err != nil {
		a.logError(err)
	}
	return
}

func (a *App) PickCentralInfoFolder() (res string) {
	res, err := util.PickCentralInfoFolder(a.ctx)
	if err != nil {
		a.logError(err)
	}
	return res
}

func (a *App) GetSettings() *domain.AppSettings {
	return a.deps.Services.SettingsService.GetSettings()
}

func (a *App) SaveSettings(settings *domain.AppSettings) {
	err := a.deps.Services.SettingsService.Save(settings)
	if err != nil {
		a.logError(err)
	}
}

func (a *App) StartLogStreaming(appName string) {
	err := a.deps.Services.CentralService.StartLog(a.deps.LogTailer, appName)
	if err != nil {
		a.logError(err)
	}
}

func (a *App) logError(err error) {
	a.deps.Logger.Error(err.Error())
	util.NotifyError(a.ctx, "Ошибка", err.Error())
}

func (a *App) StopLogStreaming() {
	a.deps.Services.CentralService.StopLog(a.deps.LogTailer)
}

func (a *App) GetGitBranches(appName string) (res *domain.Branches) {
	res, err := a.deps.Services.CentralService.GetGitBranches(appName)
	if err != nil {
		a.logError(err)
	}
	a.Logger.Info("Git branches: ", "app", appName, "branches", res)
	return
}

func (a *App) CheckoutBranch(appName string, branch string) {
	err := a.deps.Services.CentralService.CheckoutBranch(appName, branch)
	if err != nil {
		a.logError(err)
	}
	return
}

func initDeps(ctx context.Context, logger *slog.Logger) *app.Deps {

	services := initServices(logger, ctx)

	return &app.Deps{
		Services:  services,
		Logger:    logger,
		LogTailer: util.NewLogTailer(),
	}
}

func initServices(logger *slog.Logger, ctx context.Context) *service.Services {
	settingsService := service.NewSettingsService(logger, ctx)
	gitService := service.NewGitService(logger, ctx)

	return &service.Services{
		CentralService:  service.NewCentralService(logger, settingsService, gitService, ctx),
		SettingsService: settingsService,
		GitService:      gitService,
	}
}
