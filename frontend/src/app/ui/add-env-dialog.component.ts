import {Component, Inject} from '@angular/core';
import {CommonModule} from '@angular/common';

import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {EnvVariable} from '../model/env-variable';

export interface AddEnvDialogData {
    title: string;
    envVariable: EnvVariable | undefined
}

export interface AddEnvDialogResult {
    envVariable: EnvVariable;
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

        <div mat-dialog-content>
            <mat-form-field appearance="outline" style="width: 100%; padding-top: 20px">
                <mat-label>Наименование</mat-label>
                <input matInput [(ngModel)]="envVariable.name"/>
            </mat-form-field>

            <mat-form-field appearance="outline" style="width: 100%;">
                <mat-label>Значение</mat-label>
                <input matInput [(ngModel)]="envVariable.value"/>
            </mat-form-field>

        </div>

        <div mat-dialog-actions align="end">
            <button mat-stroked-button (click)="close()">Отмена</button>
            <button mat-raised-button color="primary" (click)="add()">Сохранить</button>
        </div>
    `
})
export class AddEnvDialogComponent {

    envVariable: EnvVariable = new EnvVariable();
    isEdit: boolean = false;

    constructor(@Inject(MAT_DIALOG_DATA) public readonly data: AddEnvDialogData,
                private readonly dialogRef: MatDialogRef<AddEnvDialogComponent, AddEnvDialogResult>) {

        if (data.envVariable) {
            this.envVariable = {
                ...data.envVariable
            } as EnvVariable;
            this.isEdit = true
        }

    }

    close(): void {
        this.dialogRef.close();
    }

    add(): void {
        this.dialogRef.close({envVariable: this.envVariable});
    }
}
