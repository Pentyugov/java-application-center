import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { PickCentralInfoFolder } from '../../../wailsjs/go/main/App';

export interface EditSettingsDialogData {
  centralInfoPath: string;
  applicationStartingDelaySec: number;

  minimizeToTrayOnClose: boolean;
  startQuietMode: boolean;
}

export interface EditSettingsDialogResult {
  centralInfoPath: string;
  applicationStartingDelaySec: number;

  minimizeToTrayOnClose: boolean;
  startQuietMode: boolean;
}

@Component({
  selector: 'app-add-env-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIcon,
    MatSlideToggleModule
  ],
  template: `
    <h2 mat-dialog-title>Редактировать настройки</h2>

    <div mat-dialog-content>
      <div style="display: flex; gap: 8px; padding-top: 20px">
        <mat-form-field appearance="outline" style="flex: 1">
          <mat-label>Путь к папке с 'central-info.json'</mat-label>
          <input matInput [(ngModel)]="centralInfoPath" disabled />
        </mat-form-field>

        <button
          mat-stroked-button
          type="button"
          (click)="pickFolder()"
          title="Выбрать папку"
          style="height: 56px"
        >
          <mat-icon>folder_open</mat-icon>
        </button>
      </div>

      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Задержка между запуском приложений (сек)</mat-label>
        <input matInput [(ngModel)]="applicationStartingDelaySec" type="number" />
      </mat-form-field>

      <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">

        <mat-label>Сворачивать в трей при закрытии</mat-label>
        <mat-slide-toggle class="settings-toggle" [(ngModel)]="minimizeToTrayOnClose">
        </mat-slide-toggle>

        <mat-label> Запускать приложения в тихом режиме</mat-label>
        <mat-slide-toggle class="settings-toggle" [(ngModel)]="startQuietMode">
        </mat-slide-toggle>
      </div>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-stroked-button (click)="close()">Отмена</button>
      <button mat-raised-button color="primary" (click)="add()">Сохранить</button>
    </div>
  `
})
export class EditSettingsDialogComponent {
  centralInfoPath: string = '';
  applicationStartingDelaySec: number = 0;

  minimizeToTrayOnClose: boolean = false;
  startQuietMode: boolean = false;

  constructor(
    private readonly dialogRef: MatDialogRef<EditSettingsDialogComponent, EditSettingsDialogResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: EditSettingsDialogData
  ) {
    this.centralInfoPath = data.centralInfoPath;
    this.applicationStartingDelaySec = data.applicationStartingDelaySec;

    this.minimizeToTrayOnClose = data.minimizeToTrayOnClose;
    this.startQuietMode = data.startQuietMode;
  }

  close(): void {
    this.dialogRef.close();
  }

  add(): void {
    this.dialogRef.close({
      centralInfoPath: this.centralInfoPath,
      applicationStartingDelaySec: this.applicationStartingDelaySec,
      minimizeToTrayOnClose: this.minimizeToTrayOnClose,
      startQuietMode: this.startQuietMode
    });
  }

  async pickFolder(): Promise<void> {
    try {
      const path = await PickCentralInfoFolder();
      if (!path || path.trim() === '') return;
      this.centralInfoPath = path;
    } catch (err) {
      console.error('PickJarFile failed', err);
    }
  }
}
