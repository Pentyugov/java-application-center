import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

import { ApplicationInfo } from '../model/application-info';

import { PickJarFile } from '../../../wailsjs/go/main/App';

export interface AddAppDialogData {
  title: string;
}

export interface AddAppDialogResult {
  applicationInfo: ApplicationInfo;
}

@Component({
  selector: 'app-add-app-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <div mat-dialog-content>

      <!-- Путь + кнопка выбора -->
      <div style="display: flex; gap: 8px; padding-top: 20px">
        <mat-form-field appearance="outline" style="flex: 1">
          <mat-label>Путь к JAR</mat-label>
          <input matInput [(ngModel)]="applicationInfo.path" disabled/>
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
        <input matInput [(ngModel)]="applicationInfo.appName"/>
      </mat-form-field>

    </div>

    <div mat-dialog-actions align="end">
      <button mat-stroked-button (click)="close()">Отмена</button>
      <button mat-raised-button color="primary" (click)="add()" [disabled]="!applicationInfo.path">
        Добавить
      </button>
    </div>
  `
})
export class AddAppDialogComponent {

  applicationInfo: ApplicationInfo = new ApplicationInfo();

  constructor(
    private readonly dialogRef: MatDialogRef<AddAppDialogComponent, AddAppDialogResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: AddAppDialogData
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  async pickJar(): Promise<void> {
    try {
      const path = await PickJarFile();
      if (!path) {
        return;
      }

      this.applicationInfo.path = path;

      if (!this.applicationInfo.appName) {
        this.applicationInfo.appName = this.extractName(path);
      }
    } catch (err) {
      console.error('PickJarFile failed', err);
    }
  }

  add(): void {
    this.dialogRef.close({ applicationInfo: this.applicationInfo });
  }

  private extractName(path: string): string {
    const file = path.replace(/^.*[\\/]/, '');
    return file.replace(/\.jar$/i, '');
  }
}
