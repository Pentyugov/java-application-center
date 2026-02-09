package service

import (
	"central-desktop/internal/domain"
	"central-desktop/internal/util"
	"context"
	"fmt"
	"log/slog"
	"sync/atomic"
)

type SettingsService struct {
	logger                *slog.Logger
	ctx                   context.Context
	Settings              *domain.AppSettings
	minimizeToTrayOnClose atomic.Bool
}

func NewSettingsService(lg *slog.Logger, ctx context.Context) *SettingsService {
	lg.Info("Initializing settings service")
	appSettings, err := util.InitApplicationSettings()
	if err != nil {
		panic(err)
	}

	s := &SettingsService{
		logger:   lg,
		ctx:      ctx,
		Settings: appSettings,
	}

	s.minimizeToTrayOnClose.Store(appSettings.MinimizeToTrayOnClose)
	return s
}

func (s *SettingsService) GetSettings() *domain.AppSettings {
	return s.Settings
}

func (s *SettingsService) MinimizeToTrayOnClose() bool {
	return s.minimizeToTrayOnClose.Load()
}

func (s *SettingsService) Save(settings *domain.AppSettings) error {
	s.logger.Info("Settings service: Save called")

	if s.Settings.CentralInfoPath != settings.CentralInfoPath {

		oldFilePath, errs := util.CentralInfoFilePath(s.Settings.CentralInfoPath)
		if errs != nil {
			return errs
		}

		_, err := util.MoveFile(oldFilePath, settings.CentralInfoPath)
		if err != nil {
			return fmt.Errorf("не удалось переместить файл по пути: %s", settings.CentralInfoPath)
		}
	}

	settingsPath, err := util.SettingsFilePath()
	if err != nil {
		return err
	}

	err = util.WriteJSON(settingsPath, settings)
	if err != nil {
		return fmt.Errorf("не удалось записать настройки по пути: %s", settingsPath)
	}

	s.Settings.CentralInfoPath = settings.CentralInfoPath
	s.Settings.MinimizeToTrayOnClose = settings.MinimizeToTrayOnClose
	s.Settings.StartQuietMode = settings.StartQuietMode
	s.minimizeToTrayOnClose.Store(settings.MinimizeToTrayOnClose)

	return nil
}
