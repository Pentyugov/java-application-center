package domain

type CentralInfo struct {
	GlobalVariables  []EnvVariable     `json:"globalVariables"`
	ApplicationInfos []ApplicationInfo `json:"applicationInfos"`
}

type EnvVariable struct {
	Name     string `json:"name"`
	Value    string `json:"value"`
	IsActive bool   `json:"isActive"`
}

type ApplicationInfo struct {
	AppName      string        `json:"appName"`
	EnvVariables []EnvVariable `json:"envVariables"`
	AppArguments []string      `json:"appArguments"`
	BaseDir      string        `json:"baseDir"`
	JarPath      string        `json:"jarPath"`
	StartOrder   uint8         `json:"startOrder"`
	IsActive     bool          `json:"isActive"`
	HasGit       bool          `json:"hasGit"`
	HasMaven     bool          `json:"hasMaven"`
}
