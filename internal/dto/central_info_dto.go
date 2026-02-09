package dto

type CentralInfoDTO struct {
	GlobalVariables  []EnvVariableDTO     `json:"globalVariables"`
	ApplicationInfos []ApplicationInfoDTO `json:"applicationInfos"`
}

type EnvVariableDTO struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type ApplicationInfoDTO struct {
	AppName      string           `json:"appName"`
	EnvVariables []EnvVariableDTO `json:"envVariables"`
	AppArguments []string         `json:"appArguments"`
	BaseDir      string           `json:"baseDir"`
	JarPath      string           `json:"jarPath"`
	StartOrder   uint8            `json:"startOrder"`
	IsActive     bool             `json:"isActive"`
	PID          int              `json:"pid"`
	HasGit       bool             `json:"hasGit"`
	HasMaven     bool             `json:"hasMaven"`
}

type RunningProcessDTO struct {
	Path string `json:"path"`
	PID  int    `json:"pid"`
	Name string `json:"name"`
}
