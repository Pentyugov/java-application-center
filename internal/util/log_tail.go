package util

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type LogTailer struct {
	mu     sync.Mutex
	cancel context.CancelFunc
	active bool
}

func NewLogTailer() *LogTailer {
	return &LogTailer{}
}

// Start всегда читает файл с начала, затем "следит" за добавлением новых строк.
// События:
// - opt.LinesEventName (default "log:lines") -> payload: []string
// - "log:error" -> payload: string
// - "log:started" -> payload: string (path)
// - "log:stopped" -> payload: nil
func (t *LogTailer) Start(ctx context.Context, logPath string) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.active {
		return fmt.Errorf("log tail already running")
	}
	if strings.TrimSpace(logPath) == "" {
		return fmt.Errorf("path is empty")
	}

	pollIntervalMs := 200
	maxLinesPerEmit := 2000
	linesEventName := "log:lines"

	tctx, cancel := context.WithCancel(ctx)
	t.cancel = cancel
	t.active = true

	runtime.EventsEmit(ctx, "log:started", logPath)

	go func() {
		defer func() {
			t.mu.Lock()
			t.active = false
			t.cancel = nil
			t.mu.Unlock()
			runtime.EventsEmit(ctx, "log:stopped")
		}()

		var offset int64 = 0
		var carry string

		file, err := openFile(logPath)
		if err != nil {
			file = nil
			// файл может появиться чуть позже — продолжаем ретраить
			runtime.EventsEmit(ctx, "log:error", fmt.Sprintf("open log file: %v", err))
		}

		ticker := time.NewTicker(time.Duration(pollIntervalMs) * time.Millisecond)
		defer ticker.Stop()

		for {
			select {
			case <-tctx.Done():
				if file != nil {
					_ = file.Close()
				}
				return

			case <-ticker.C:
				// если файл не открыт — пробуем открыть снова и читаем с начала
				if file == nil {
					f, oerr := openFile(logPath)
					if oerr != nil {
						continue
					}
					file = f
					offset = 0
					carry = ""
				}

				st, serr := file.Stat()
				if serr != nil {
					runtime.EventsEmit(ctx, "log:error", fmt.Sprintf("stat log file: %v", serr))
					_ = file.Close()
					file = nil
					continue
				}

				// truncate / rotation: файл стал меньше — читаем заново с начала
				if st.Size() < offset {
					offset = 0
					carry = ""
				}

				// новых данных нет
				if st.Size() == offset {
					continue
				}

				if _, serr = file.Seek(offset, io.SeekStart); serr != nil {
					runtime.EventsEmit(ctx, "log:error", fmt.Sprintf("seek log file: %v", serr))
					_ = file.Close()
					file = nil
					continue
				}

				reader := bufio.NewReader(file)
				var sb strings.Builder

				// читаем всё до EOF
				for {
					part, rerr := reader.ReadString('\n')
					sb.WriteString(part)
					if rerr != nil {
						if errors.Is(rerr, io.EOF) {
							break
						}
						runtime.EventsEmit(ctx, "log:error", fmt.Sprintf("read log file: %v", rerr))
						_ = file.Close()
						file = nil
						break
					}
				}
				if file == nil {
					continue
				}

				// обновляем offset на текущее положение (конец прочитанного)
				offset, _ = file.Seek(0, io.SeekCurrent)

				text := carry + sb.String()

				// сохраним незавершённую строку
				if !strings.HasSuffix(text, "\n") {
					if idx := strings.LastIndexByte(text, '\n'); idx >= 0 {
						carry = text[idx+1:]
						text = text[:idx+1]
					} else {
						carry = text
						continue
					}
				} else {
					carry = ""
				}

				lines := strings.Split(text, "\n")
				if len(lines) > 0 && lines[len(lines)-1] == "" {
					lines = lines[:len(lines)-1]
				}
				if len(lines) == 0 {
					continue
				}

				for i := 0; i < len(lines); i += maxLinesPerEmit {
					j := i + maxLinesPerEmit
					if j > len(lines) {
						j = len(lines)
					}
					runtime.EventsEmit(ctx, linesEventName, lines[i:j])
				}
			}
		}
	}()

	return nil
}

func (t *LogTailer) Stop() {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.cancel != nil {
		t.cancel()
	}
}
