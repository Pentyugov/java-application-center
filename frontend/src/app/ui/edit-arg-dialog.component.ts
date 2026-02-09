import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {FormsModule} from '@angular/forms';

export interface EditArgDialogData {
  arg: string;
}

export interface EditArgDialogResult {
  arg: string;
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
    <h2 mat-dialog-title>Редактировать аргумент</h2>

    <div mat-dialog-content>
      <mat-form-field appearance="outline" style="width: 100%; padding-top: 20px">
        <mat-label>Путь</mat-label>
        <input matInput [(ngModel)]="arg"/>
      </mat-form-field>

    </div>

    <div mat-dialog-actions align="end">
      <button mat-stroked-button (click)="close()">Отмена</button>
      <button mat-raised-button color="primary" (click)="add()">Сохранить</button>
    </div>
  `
})
export class EditArgDialogComponent {

  arg: string = '';

  constructor(
    private readonly dialogRef: MatDialogRef<EditArgDialogComponent, EditArgDialogResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: EditArgDialogData
  ) {
    this.arg = data.arg;
  }

  close(): void {
    this.dialogRef.close();
  }

  add(): void {
    this.dialogRef.close(
      {
        arg: this.arg,
      }
    );
  }
}
