import {Component, Inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {CdkVirtualScrollViewport, ScrollingModule} from '@angular/cdk/scrolling';
import {BehaviorSubject} from 'rxjs';
import {DragDropModule} from '@angular/cdk/drag-drop';

import {EventsOn} from '../../../../wailsjs/runtime';

import {StartLogStreaming, StopLogStreaming} from '../../../../wailsjs/go/main/App';
import {NotificationService} from '../../services/notification.service';

export interface LogDialogData {
  appName: string;
  pid: number;
}

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE' | 'UNKNOWN';

interface AnsiSeg {
  text: string;
  cls: string;
}

interface LogLineVM {
  no: number;
  level: LogLevel;
  isErrorBlock: boolean;
  segs: AnsiSeg[];
}

@Component({
  selector: 'app-log-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    ScrollingModule,
    DragDropModule,
  ],
  templateUrl: './log-dialog.component.html',
  styleUrls: ['./log-dialog.component.scss'],
})
export class LogDialogComponent implements OnInit, OnDestroy {
  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;

  private lineCounter = 0;
  private inErrorBlock = false;

  private readonly maxBufferLines = 200_000;
  private readonly lines: LogLineVM[] = [];
  readonly lines$ = new BehaviorSubject<LogLineVM[]>([]);

  private offLines?: () => void;
  private offError?: () => void;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly dialogRef: MatDialogRef<LogDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: LogDialogData,
  ) {}

  async ngOnInit(): Promise<void> {
    this.offLines = EventsOn('log:lines', (payload: string[]) => {
      if (!payload || payload.length === 0) return;
      this.pushLines(payload);
    });

    this.offError = EventsOn('log:error', (msg: string) => {
      if (msg) this.notificationService.notifyError(msg, 'log');
    });

    try {
      await StartLogStreaming(this.data.appName);

    } catch (e: any) {
      this.notificationService.notifyError(String(e ?? 'start log failed'), 'log');
      this.dialogRef.close();
      return;
    }
  }

  async ngOnDestroy(): Promise<void> {
    this.offLines?.();
    this.offError?.();

    try {
      await StopLogStreaming();
    } catch {
    }
  }

  clear(): void {
    this.lines.length = 0;
    this.lines$.next([]);
    queueMicrotask(() => this.viewport?.scrollToIndex(0));
  }


  private pushLines(newLines: string[]): void {
    for (const raw of newLines) {
      this.lines.push(this.toVM(raw));
    }

    if (this.lines.length > this.maxBufferLines) {
      const cut = this.lines.length - this.maxBufferLines;
      this.lines.splice(0, cut);
    }

    this.lines$.next([...this.lines]);
  }

  private toVM(raw: string): LogLineVM {
    const clean = this.stripAnsi(raw);
    const level = this.detectLevel(clean);

    if (level === 'ERROR') {
      this.inErrorBlock = true;
    } else if (this.inErrorBlock) {
      const isStack =
        /^\s+at\s+/.test(clean) ||
        /^\s*at\s+/.test(clean) ||
        /^\s*(Caused by:|Suppressed:)/.test(clean);

      const looksLikeNewRecord = /^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2}/.test(clean) ||
        /^\[\w+/.test(clean);

      if (!isStack && looksLikeNewRecord) {
        this.inErrorBlock = false;
      }
    }

    const isErrorBlock = level === 'ERROR' || this.inErrorBlock;

    return {
      no: ++this.lineCounter,
      level,
      isErrorBlock,
      segs: this.parseAnsi(raw),
    };
  }

  private detectLevel(s: string): LogLevel {
    if (s.includes(' ERROR ') || s.startsWith('ERROR') || s.includes('[ERROR]')) return 'ERROR';
    if (s.includes(' WARN ')  || s.startsWith('WARN')  || s.includes('[WARN]'))  return 'WARN';
    if (s.includes(' INFO ')  || s.startsWith('INFO')  || s.includes('[INFO]'))  return 'INFO';
    if (s.includes(' DEBUG ') || s.startsWith('DEBUG') || s.includes('[DEBUG]')) return 'DEBUG';
    if (s.includes(' TRACE ') || s.startsWith('TRACE') || s.includes('[TRACE]')) return 'TRACE';
    return 'UNKNOWN';
  }

  private stripAnsi(input: string): string {
    return input.replace(/\x1b\[[0-9;]*m/g, '');
  }

  private parseAnsi(input: string): AnsiSeg[] {
    const re = /\x1b\[([0-9;]*)m/g;
    const segs: AnsiSeg[] = [];

    let lastIndex = 0;
    let currentCls = 'c-reset';

    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) {
      const chunk = input.slice(lastIndex, m.index);
      if (chunk) segs.push({ text: chunk, cls: currentCls });

      const codes = (m[1] || '0').split(';').filter(Boolean).map(x => Number(x));

      if (codes.includes(0)) {
        currentCls = 'c-reset';
      }

      const fg = codes.find(c => (c >= 30 && c <= 37) || (c >= 90 && c <= 97));
      if (fg != null) {
        currentCls = `c-${fg}`;
      }

      lastIndex = re.lastIndex;
    }

    const tail = input.slice(lastIndex);
    if (tail) segs.push({ text: tail, cls: currentCls });

    return segs;
  }

  trackByIndex = (i: number) => i;
}
