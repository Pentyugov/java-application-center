package service

import (
	"central-desktop/internal/domain"
	"central-desktop/internal/dto"
	"central-desktop/internal/mapper"
	"central-desktop/internal/util"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"path/filepath"
	"sort"
	"strings"
	"sync/atomic"
	"time"
)

type CentralService struct {
	logger           *slog.Logger
	centralInfo      *domain.CentralInfo
	runAllInProgress atomic.Bool
	ctx              context.Context
	settingsService  *SettingsService
	gitService       *GitService
}

func NewCentralService(lg *slog.Logger, ss *SettingsService, gs *GitService, ctx context.Context) *CentralService {
	lg.Info("Initializing central service")
	ci, err := util.ReadOrCreateCentralInfo(ss.Settings.CentralInfoPath)
	if err != nil {
		panic(err)
	}

	return &CentralService{
		logger:          lg,
		settingsService: ss,
		gitService:      gs,
		centralInfo:     ci,
		ctx:             ctx,
	}
}

func (s *CentralService) GetCentralInfoDTO() (*dto.CentralInfoDTO, error) {
	ciDTO := mapper.ToCentralInfoDTO(s.centralInfo)
	err := s.setPIDInfo(&ciDTO.ApplicationInfos)
	if err != nil {
		return nil, err
	}
	return &ciDTO, nil
}

func (s *CentralService) Save(info *domain.CentralInfo) (*dto.CentralInfoDTO, error) {
	sort.Slice(info.ApplicationInfos, func(i, j int) bool {
		return info.ApplicationInfos[i].StartOrder < info.ApplicationInfos[j].StartOrder
	})
	s.centralInfo = info

	err := util.WriteJSON(util.BuildCentralInfoFilePath(s.settingsService.Settings.CentralInfoPath), info)
	if err != nil {
		return nil, err
	}

	return s.GetCentralInfoDTO()
}

func (s *CentralService) RunAll() {
	// защита от повторного запуска
	if !s.runAllInProgress.CompareAndSwap(false, true) {
		s.logger.Warn("RunAll already in progress")
		return
	}

	go func() {
		defer s.runAllInProgress.Store(false)

		duration := time.Duration(s.settingsService.Settings.ApplicationStartingDelaySec) * time.Second

		apps := s.centralInfo.ApplicationInfos
		for i, info := range apps {
			if info.IsActive {
				_, err := s.RunApplication(info.AppName)
				if err != nil {
					msg := fmt.Sprintf("ошибка при запуске приложения %s: %s", info.AppName, err)
					util.NotifyError(s.ctx, "Ошибка", msg)
					s.logger.Error("run application failed", "app", info.AppName, "err", err)
				}

				if i < len(apps)-1 {
					time.Sleep(duration)
				}
			}

		}
	}()
}

func (s *CentralService) RunApplication(appName string) (*util.CommandResult, error) {
	found, err := s.getAppInfoByName(appName)
	if err != nil {
		return nil, err
	}

	processes, err := util.ListJavaProcesses()
	if err != nil {
		util.NotifyError(s.ctx, "Ошибка", "Не удалось получить список приложений")
		return nil, err
	}

	for _, process := range processes {
		if process.Path == found.Path {
			return nil, errors.New(fmt.Sprintf("Приложение %s уже запущено", appName))
		}
	}

	runFunc := util.RunApplication
	if s.settingsService.Settings.StartQuietMode {
		runFunc = util.RunApplicationSilent
	}

	cr, err := runFunc(found)
	if err != nil {
		return nil, fmt.Errorf("запуск приложения %s не удался", appName)
	}

	util.NotifyInfo(s.ctx, appName, "Приложение запускается")
	return cr, nil
}

func (s *CentralService) StopApplication(appName string) error {
	processes, err := s.GetRunningProcesses()
	if err != nil {
		return err
	}

	for _, process := range processes {
		if process.Name == appName {
			err := util.StopProcess(process.PID)
			if err != nil {
				return err
			}
			util.NotifySuccess(s.ctx, process.Name, "Приложение остановлено")
			return nil
		}
	}

	return fmt.Errorf("не удалось найти процесс для приложения: %s", appName)
}

func (s *CentralService) StopAllApplications() error {
	processes, err := s.GetRunningProcesses()
	if err != nil {
		return err
	}
	for _, process := range processes {
		err := util.StopProcess(process.PID)
		if err != nil {
			util.NotifyError(s.ctx, process.Name, "Ошибка при остановке приложения")
		}
		util.NotifySuccess(s.ctx, process.Name, "Приложение остановлено")
	}
	return nil
}

func (s *CentralService) GetRunningProcesses() ([]*dto.RunningProcessDTO, error) {
	processes, err := util.ListJavaProcesses()
	if err != nil {
		return nil, fmt.Errorf("не удалось получить список запущенных Java процессов")
	}

	appByPath := make(map[string]string, len(s.centralInfo.ApplicationInfos))
	for _, ai := range s.centralInfo.ApplicationInfos {
		appByPath[ai.Path] = ai.AppName
	}

	dtos := make([]*dto.RunningProcessDTO, 0, len(processes))

	for _, procInfo := range processes {
		if appName, ok := appByPath[procInfo.Path]; ok {
			dtos = append(dtos, &dto.RunningProcessDTO{
				Path: procInfo.Path,
				PID:  procInfo.PID,
				Name: appName,
			})
		}
	}

	return dtos, nil
}

func (s *CentralService) StartLog(logTailer *util.LogTailer, appName string) error {
	found, err := s.getAppInfoByName(appName)
	if err != nil {
		return err
	}

	logsDir, err := util.LogsDir()
	if err != nil {
		return err
	}

	logPath := filepath.Join(logsDir, util.GetLogFileName(found.AppName))

	err = logTailer.Start(s.ctx, logPath)
	if err != nil {
		return err
	}
	return nil

}

func (s *CentralService) StopLog(logTailer *util.LogTailer) {
	logTailer.Stop()
}

func (s *CentralService) GetGitBranches(appName string) (*domain.Branches, error) {
	s.logger.Info("execute get git branches", "app", appName)
	appInfo, err := s.getAppInfoByName(appName)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(appInfo.GitPath) == "" {
		return nil, fmt.Errorf("не указан Git репозиторий для приложения %s", appName)
	}
	return s.gitService.ListBranches(appInfo.GitPath)
}

func (s *CentralService) CheckoutBranch(appName string, branch string) error {
	s.logger.Info("execute get git branches", "app", appName, "branch", branch)
	appInfo, err := s.getAppInfoByName(appName)
	if err != nil {
		return err
	}
	if strings.TrimSpace(appInfo.GitPath) == "" {
		return fmt.Errorf("не указан Git репозиторий для приложения %s", appName)
	}
	return s.gitService.CheckoutBranch(appInfo.GitPath, branch)
}

func (s *CentralService) setPIDInfo(appInfos *[]dto.ApplicationInfoDTO) error {
	processes, err := util.ListJavaProcesses()
	if err != nil {
		return fmt.Errorf("не удалось получить список запущенных Java процессов")
	}

	appByPath := make(map[string]*dto.ApplicationInfoDTO, len(*appInfos))
	for i := range *appInfos {
		ai := &(*appInfos)[i]
		appByPath[ai.Path] = ai
	}

	for _, procInfo := range processes {
		if ai, ok := appByPath[procInfo.Path]; ok {
			ai.PID = procInfo.PID
		}
	}

	return nil
}

func (s *CentralService) getAppInfoByName(appName string) (*domain.ApplicationInfo, error) {
	var found *domain.ApplicationInfo
	for i := range s.centralInfo.ApplicationInfos {
		if s.centralInfo.ApplicationInfos[i].AppName == appName {
			found = &s.centralInfo.ApplicationInfos[i]
			break
		}
	}

	if found == nil {
		return nil, fmt.Errorf("cannot find application %s", appName)
	}
	return found, nil
}
