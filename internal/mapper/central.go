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
		BaseDir:      ai.BaseDir,
		JarPath:      ai.JarPath,
		StartOrder:   ai.StartOrder,
		IsActive:     ai.IsActive,
		HasGit:       ai.HasGit,
		HasMaven:     ai.HasMaven,
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
