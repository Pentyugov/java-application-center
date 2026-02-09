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
	Path         string           `json:"path"`
	GitPath      string           `json:"gitPath"`
	StartOrder   uint8            `json:"startOrder"`
	IsActive     bool             `json:"isActive"`
	PID          int              `json:"pid"`
}

type RunningProcessDTO struct {
	Path string `json:"path"`
	PID  int    `json:"pid"`
	Name string `json:"name"`
}
