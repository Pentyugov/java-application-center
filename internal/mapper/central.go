package mapper

import (
	"central-desktop/internal/domain"
	"central-desktop/internal/dto"
)

func ToCentralInfoDTO(ci *domain.CentralInfo) dto.CentralInfoDTO {
	if ci == nil {
		return dto.CentralInfoDTO{}
	}

	evDTOs := make([]dto.EnvVariableDTO, len(ci.GlobalVariables))
	for i := range ci.GlobalVariables {
		evDTOs[i] = ToEnvVariableDTO(&ci.GlobalVariables[i])
	}

	aiDTOs := make([]dto.ApplicationInfoDTO, len(ci.ApplicationInfos))
	for i := range ci.ApplicationInfos {
		aiDTOs[i] = ToApplicationInfoDTO(&ci.ApplicationInfos[i])
	}

	return dto.CentralInfoDTO{
		GlobalVariables:  evDTOs,
		ApplicationInfos: aiDTOs,
	}
}

func ToApplicationInfoDTO(ai *domain.ApplicationInfo) dto.ApplicationInfoDTO {
	if ai == nil {
		return dto.ApplicationInfoDTO{}
	}

	evDTOs := make([]dto.EnvVariableDTO, len(ai.EnvVariables))
	for i := range ai.EnvVariables {
		evDTOs[i] = ToEnvVariableDTO(&ai.EnvVariables[i])
	}

	return dto.ApplicationInfoDTO{
		AppName:      ai.AppName,
		EnvVariables: evDTOs,
		AppArguments: ai.AppArguments,
		Path:         ai.Path,
		GitPath:      ai.GitPath,
		StartOrder:   ai.StartOrder,
		IsActive:     ai.IsActive,
	}
}

func ToEnvVariableDTO(ev *domain.EnvVariable) dto.EnvVariableDTO {
	if ev == nil {
		return dto.EnvVariableDTO{}
	}
	return dto.EnvVariableDTO{
		Name:  ev.Name,
		Value: ev.Value,
	}
}

func ToCentralInfo(ci dto.CentralInfoDTO) domain.CentralInfo {
	evs := make([]domain.EnvVariable, len(ci.GlobalVariables))
	for i := range ci.GlobalVariables {
		evs[i] = ToEnvVariable(ci.GlobalVariables[i])
	}

	ais := make([]domain.ApplicationInfo, len(ci.ApplicationInfos))
	for i := range ci.ApplicationInfos {
		ais[i] = ToApplicationInfo(ci.ApplicationInfos[i])
	}

	return domain.CentralInfo{
		GlobalVariables:  evs,
		ApplicationInfos: ais,
	}
}

func ToApplicationInfo(ai dto.ApplicationInfoDTO) domain.ApplicationInfo {
	evs := make([]domain.EnvVariable, len(ai.EnvVariables))
	for i := range ai.EnvVariables {
		evs[i] = ToEnvVariable(ai.EnvVariables[i])
	}

	return domain.ApplicationInfo{
		AppName:      ai.AppName,
		EnvVariables: evs,
		AppArguments: ai.AppArguments,
		Path:         ai.Path,
		StartOrder:   ai.StartOrder,
		IsActive:     ai.IsActive,
	}
}

func ToEnvVariable(ev dto.EnvVariableDTO) domain.EnvVariable {
	return domain.EnvVariable{
		Name:  ev.Name,
		Value: ev.Value,
	}
}
