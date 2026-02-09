package app

import (
	"central-desktop/internal/service"
	"central-desktop/internal/util"
	"log/slog"
)

type Deps struct {
	Services  *service.Services
	LogTailer *util.LogTailer
	Logger    *slog.Logger
}
