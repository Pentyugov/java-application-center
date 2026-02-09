package dto

type PickBaseApplicationFolderDTO struct {
	BaseDir  string   `json:"baseDir"`
	JarPaths []string `json:"jarPaths"`
}
