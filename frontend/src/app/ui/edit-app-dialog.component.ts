import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {MatIcon} from '@angular/material/icon';
import {PickJarFile} from '../../../wailsjs/go/main/App';

export interface EditAppDialogData {
  appName: string;
  path: string;
}

export interface EditAppDialogResult {
  appName: string;
  path: string;
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
    MatIcon
  ],
  template: `
    <h2 mat-dialog-title>Редактировать приложение</h2>

    <div mat-dialog-content>
      <!-- Путь + кнопка выбора -->
      <div style="display: flex; gap: 8px; padding-top: 20px">
        <mat-form-field appearance="outline" style="flex: 1">
          <mat-label>Путь к JAR</mat-label>
          <input matInput [(ngModel)]="path" disabled/>
        </mat-form-field>

        <button
          mat-stroked-button
          type="button"
          (click)="pickJar()"
          title="Выбрать JAR файл"
          style="height: 56px"
        >
          <mat-icon>folder_open</mat-icon>
        </button>
      </div>

      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Наименование</mat-label>
        <input matInput [(ngModel)]="appName"/>
      </mat-form-field>

    </div>

    <div mat-dialog-actions align="end">
      <button mat-stroked-button (click)="close()">Отмена</button>
      <button mat-raised-button color="primary" (click)="add()">Сохранить</button>
    </div>
  `
})
export class EditAppDialogComponent {

  appName: string = '';
  path: string = '';

  constructor(
    private readonly dialogRef: MatDialogRef<EditAppDialogComponent, EditAppDialogResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: EditAppDialogData
  ) {
    this.appName = data.appName;
    this.path = data.path;
  }

  async pickJar(): Promise<void> {
    try {
      const path = await PickJarFile();
      if (!path) {
        return;
      }

      this.path = path;

    } catch (err) {
      console.error('PickJarFile failed', err);
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  add(): void {
    this.dialogRef.close(
      {
        appName: this.appName,
        path: this.path
      }
    );
  }
}
