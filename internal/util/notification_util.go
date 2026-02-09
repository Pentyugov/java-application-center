package util

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type NotificationType string

const (
	NotificationInfo    NotificationType = "info"
	NotificationWarn    NotificationType = "warn"
	NotificationError   NotificationType = "error"
	NotificationSuccess NotificationType = "success"
)

type UINotification struct {
	Type    NotificationType `json:"type"`
	Title   string           `json:"title"`
	Message string           `json:"message"`
}

const UIEventNotify = "ui:notify"

func sendNotification(ctx context.Context, n UINotification) {
	if n.Type == "" {
		n.Type = NotificationInfo
	}
	runtime.EventsEmit(ctx, UIEventNotify, n)
}

func NotifyInfo(ctx context.Context, title, message string) {
	sendNotification(ctx, UINotification{Type: NotificationInfo, Title: title, Message: message})
}

func NotifyWarn(ctx context.Context, title, message string) {
	sendNotification(ctx, UINotification{Type: NotificationWarn, Title: title, Message: message})
}

func NotifyError(ctx context.Context, title, message string) {
	sendNotification(ctx, UINotification{Type: NotificationError, Title: title, Message: message})
}

func NotifySuccess(ctx context.Context, title, message string) {
	sendNotification(ctx, UINotification{Type: NotificationSuccess, Title: title, Message: message})
}
