import {Component, Inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';

import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatIconModule} from '@angular/material/icon';

import {ApplicationInfo} from '../model/application-info';

import {PickBaseApplicationFolder} from '../../../wailsjs/go/main/App';
import {dto} from '../../../wailsjs/go/models';
import PickBaseApplicationFolderDTO = dto.PickBaseApplicationFolderDTO;
import {MatRadioModule} from '@angular/material/radio';

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
        MatIconModule,
        MatRadioModule
    ],
    template: `
        <h2 mat-dialog-title>{{ data.title }}</h2>

        <div mat-dialog-content>

            <!-- Путь + кнопка выбора -->
            <div style="display: flex; gap: 8px; padding-top: 20px">
                <mat-form-field appearance="outline" style="flex: 1">
                    <mat-label>Выберите домашнюю директорию приложения</mat-label>
                    <input matInput [(ngModel)]="applicationInfo.jarPath" disabled/>
                </mat-form-field>

                <button
                        mat-stroked-button
                        type="button"
                        class="explorer-btn"
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

            <!-- Выбор JAR из списка найденных -->
            <div *ngIf="jarPaths?.length" style="padding-top: 8px; padding-bottom: 8px;">
                <div style="margin-bottom: 6px; font-size: 12px; opacity: 0.8;">Выберите JAR</div>

                <mat-radio-group
                        [(ngModel)]="applicationInfo.jarPath"
                        (ngModelChange)="onJarPathChange($event)"
                        style="display: flex; flex-direction: column; gap: 6px;"
                >
                    <mat-radio-button *ngFor="let p of jarPaths" [value]="p">
                        {{ p.replace(applicationInfo.baseDir, '') }}
                    </mat-radio-button>
                </mat-radio-group>
            </div>


        </div>

        <div mat-dialog-actions align="end">
            <button mat-stroked-button (click)="close()">Отмена</button>
            <button mat-raised-button color="primary" (click)="add()" [disabled]="!applicationInfo.jarPath">
                Добавить
            </button>
        </div>
    `
})
export class AddAppDialogComponent {

    applicationInfo: ApplicationInfo = new ApplicationInfo();

    jarPaths: string[] = [];

    constructor(
            private readonly dialogRef: MatDialogRef<AddAppDialogComponent, AddAppDialogResult>,
            @Inject(MAT_DIALOG_DATA) public readonly data: AddAppDialogData
    ) {
    }

    close(): void {
        this.dialogRef.close();
    }

    async pickJar(): Promise<void> {
        try {
            const dto: PickBaseApplicationFolderDTO = await PickBaseApplicationFolder();
            if (!dto) {
                return;
            }

            this.applicationInfo.baseDir = dto.baseDir;
            this.jarPaths = dto.jarPaths;
        } catch (err) {
            console.error('PickJarFile failed', err);
        }
    }

    add(): void {
        this.dialogRef.close({applicationInfo: this.applicationInfo});
    }

    onJarPathChange(selectedPath: string): void {

        this.applicationInfo.jarPath = selectedPath;

        this.applicationInfo.appName = this.extractName(selectedPath);
    }

    private extractName(path: string): string {
        const file = path.replace(/^.*[\\/]/, '');
        return file.replace(/\.jar$/i, '');
    }

    protected readonly String = String;
}
