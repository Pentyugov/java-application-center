import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {FormsModule} from '@angular/forms';

export interface EditEnvDialogData {
  name: string;
  value: string;
}

export interface EditEnvDialogResult {
  name: string;
  value: string;
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
    MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>Редактировать переменную окружения</h2>

    <div mat-dialog-content>
      <mat-form-field appearance="outline" style="width: 100%; padding-top: 20px">
        <mat-label>Наименование</mat-label>
        <input matInput [(ngModel)]="name"/>
      </mat-form-field>

      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Значение</mat-label>
        <input matInput [(ngModel)]="value"/>
      </mat-form-field>

    </div>

    <div mat-dialog-actions align="end">
      <button mat-stroked-button (click)="close()">Отмена</button>
      <button mat-raised-button color="primary" (click)="add()">Сохранить</button>
    </div>
  `
})
export class EditEnvDialogComponent {

  name: string = '';
  value: string = '';

  constructor(
    private readonly dialogRef: MatDialogRef<EditEnvDialogComponent, EditEnvDialogResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: EditEnvDialogData
  ) {
    this.name = data.name;
    this.value = data.value;
  }

  close(): void {
    this.dialogRef.close();
  }

  add(): void {
    this.dialogRef.close(
      {
        name: this.name,
        value: this.value
      }
    );
  }
}
