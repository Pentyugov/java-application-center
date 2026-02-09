package domain

type CentralInfo struct {
	GlobalVariables  []EnvVariable     `json:"globalVariables"`
	ApplicationInfos []ApplicationInfo `json:"applicationInfos"`
}

type EnvVariable struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type ApplicationInfo struct {
	AppName      string        `json:"appName"`
	EnvVariables []EnvVariable `json:"envVariables"`
	AppArguments []string      `json:"appArguments"`
	BaseDir      string        `json:"baseDir"`
	Path         string        `json:"path"`
	GitPath      string        `json:"gitPath"`
	StartOrder   uint8         `json:"startOrder"`
	IsActive     bool          `json:"isActive"`
}
