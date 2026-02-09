package domain

type AppSettings struct {
	CentralInfoPath             string `json:"centralInfoPath"`
	ApplicationStartingDelaySec uint   `json:"applicationStartingDelaySec"`
	MinimizeToTrayOnClose       bool   `json:"minimizeToTrayOnClose"`
	StartQuietMode              bool   `json:"startQuietMode"`
}
