import {Component, Inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';

export interface ConfirmDialogData {
    title: string;
    message: string;
}

export interface ConfirmDialogResult {
    confirm: boolean;
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
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <p  mat-dialog-content>{{ data.message }}</p>

    <div mat-dialog-actions align="end">
      <button mat-stroked-button (click)="close()">Отмена</button>
      <button mat-raised-button color="primary" (click)="confirm()">Ок</button>
    </div>
  `
})

export class ConfirmDialogComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public readonly data: ConfirmDialogData,
                private readonly dialogRef: MatDialogRef<ConfirmDialogComponent, ConfirmDialogResult>) {}

    close(): void {
        this.dialogRef.close();
    }

    confirm(): void {
        this.dialogRef.close({ confirm: true });
    }
}
