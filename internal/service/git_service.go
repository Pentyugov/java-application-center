package service

import (
	"bytes"
	"central-desktop/internal/domain"
	"context"
	"fmt"
	"log/slog"
	"os/exec"
	"strings"
	"syscall"
)

type GitService struct {
	ctx    context.Context
	logger *slog.Logger
}

func NewGitService(lg *slog.Logger, ctx context.Context) *GitService {
	lg.Info("Initializing git service")
	return &GitService{ctx: ctx, logger: lg}
}

func (s *GitService) ListBranches(gitPath string, fetch bool) (*domain.Branches, error) {
	if fetch {
		if err := s.fetch(gitPath); err != nil {
			return nil, fmt.Errorf("failed to fetch git repository: %w", err)
		}
	}

	result := &domain.Branches{}
	{
		out, err := s.runGit(gitPath, "branch", "--show-current")
		if err != nil {
			return nil, err
		}
		result.Current = strings.TrimSpace(out)
	}
	{
		out, err := s.runGit(gitPath, "for-each-ref", "refs/heads", "--format=%(refname:short)")
		if err != nil {
			return nil, err
		}
		result.Local = splitNonEmptyLines(out)
	}
	{
		out, err := s.runGit(gitPath, "for-each-ref", "refs/remotes", "--format=%(refname:short)")
		if err != nil {
			return nil, err
		}

		lines := splitNonEmptyLines(out)

		remote := make([]string, 0, len(lines))
		for _, line := range lines {
			if strings.HasSuffix(line, "/HEAD") {
				continue
			}
			remote = append(remote, line)
		}

		result.Remote = remote
	}

	return result, nil
}

func (s *GitService) CheckoutBranch(gitPath string, branch string) error {
	branch = strings.TrimSpace(branch)
	if branch == "" {
		return fmt.Errorf("branch is empty")
	}

	clean, err := s.isWorkingTreeClean(gitPath)
	if err != nil {
		return err
	}
	if !clean {
		return fmt.Errorf("working tree is not clean: commit or stash changes before switching branch")
	}

	// Если в UI прилетело "origin/master" — переключаем на "master"
	localBranch := branch
	if strings.HasPrefix(localBranch, "origin/") {
		localBranch = strings.TrimPrefix(localBranch, "origin/")
	}

	// 1) Попробовать обычный switch (если локальная ветка уже есть)
	if _, err := s.runGit(gitPath, "switch", localBranch); err == nil {
		return nil
	}

	// 2) Если локальная ветка есть — повторяем switch и отдаём нормальную ошибку
	hasLocal, err := s.hasLocalBranch(gitPath, localBranch)
	if err != nil {
		return err
	}
	if hasLocal {
		_, err := s.runGit(gitPath, "switch", localBranch)
		return err
	}

	// 3) Локальной ветки нет — ищем remote-tracking ветку
	remoteBranch := "origin/" + localBranch
	hasRemote, err := s.hasRemoteBranch(gitPath, remoteBranch)
	if err != nil {
		return err
	}
	if !hasRemote {
		return fmt.Errorf("branch not found: %s (no local branch and no %s)", localBranch, remoteBranch)
	}

	// 4) Создаём локальную tracking-ветку и переключаемся на неё
	_, err = s.runGit(gitPath, "switch", "-c", localBranch, "--track", remoteBranch)
	return err
}

func (s *GitService) isWorkingTreeClean(repoPath string) (bool, error) {
	out, err := s.runGit(repoPath, "status", "--porcelain")
	if err != nil {
		return false, err
	}
	return strings.TrimSpace(out) == "", nil
}

func (s *GitService) hasLocalBranch(gitPath string, branch string) (bool, error) {
	cmd := newGitCmd(gitPath, "show-ref", "--verify", "--quiet", "refs/heads/"+branch)
	err := cmd.Run()
	if err == nil {
		return true, nil
	}
	return false, nil
}

func (s *GitService) hasRemoteBranch(gitPath string, remoteBranch string) (bool, error) {
	ref := "refs/remotes/" + remoteBranch
	cmd := newGitCmd(gitPath, "show-ref", "--verify", "--quiet", ref)
	err := cmd.Run()
	if err == nil {
		return true, nil
	}
	return false, nil
}

func splitNonEmptyLines(s string) []string {
	raw := strings.Split(strings.TrimSpace(s), "\n")
	res := make([]string, 0, len(raw))
	for _, r := range raw {
		r = strings.TrimSpace(r)
		if r != "" {
			res = append(res, r)
		}
	}
	return res
}

func (s *GitService) fetch(gitPath string) error {
	_, err := s.runGit(gitPath, "fetch", "--all", "--prune")
	return err
}

func (s *GitService) runGit(gitPath string, args ...string) (string, error) {
	cmd := newGitCmd(gitPath, args...)

	var out bytes.Buffer
	var errBuf bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errBuf

	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(errBuf.String())
		if msg != "" {
			return out.String(), fmt.Errorf(msg)
		}
		return out.String(), err
	}

	return out.String(), nil
}

func newGitCmd(gitPath string, args ...string) *exec.Cmd {
	allArgs := append([]string{"-C", gitPath}, args...)
	cmd := exec.Command("git", allArgs...)

	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
	}

	return cmd
}
