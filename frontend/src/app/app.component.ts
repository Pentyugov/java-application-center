import {Component, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormControl, ReactiveFormsModule} from '@angular/forms';

import {CentralService} from './services/central.service';
import {CentralInfo} from './model/central-info';
import {ApplicationInfo} from './model/application-info';
import {EnvVariable} from './model/env-variable';

import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatCardModule} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {MatTableModule} from '@angular/material/table';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatDividerModule} from '@angular/material/divider';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';

import {interval, startWith, Subscription, switchMap} from 'rxjs';

import {CdkDragDrop, DragDropModule, moveItemInArray} from '@angular/cdk/drag-drop';

import {AddEnvDialogComponent, AddEnvDialogResult} from './ui/add-env-dialog.component';
import {AddAppDialogComponent, AddAppDialogResult} from './ui/add-app-dialog.component';
import {AddArgDialogComponent, AddArgDialogResult} from './ui/add-arg-dialog.component';
import {EditAppDialogComponent, EditAppDialogResult} from './ui/edit-app-dialog.component';
import {EditArgDialogComponent, EditArgDialogResult} from './ui/edit-arg-dialog.component';
import {EditEnvDialogComponent, EditEnvDialogResult} from './ui/edit-env-dialog.component';
import {CommandResult} from './model/command-result';
import {RunningProcesses} from './model/running-processes';
import {EventsOn} from '../../wailsjs/runtime';
import {UINotification} from './model/ui-notification';
import {SettingsService} from './services/settings.service';
import {AppSettings} from './model/settings';
import {EditSettingsDialogComponent} from './ui/edit-settings-dialog';
import {LogDialogComponent} from './ui/log/log-dialog.component';
import {NotificationService} from './services/notification.service';
import {GitService} from './services/git.service';
import {domain} from '../../wailsjs/go/models';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {ConfirmDialogComponent, ConfirmDialogResult} from './ui/confirm-dialog';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        CommonModule,
        DragDropModule,
        MatTableModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatDividerModule,
        MatDialogModule,
        MatFormFieldModule,
        MatSelectModule,
        ReactiveFormsModule
    ],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

    private subscriptions: Subscription[] = [];
    private runningProcessesSub?: Subscription;

    private notificationEventSubscription?: () => void;

    public centralInfo: CentralInfo = new CentralInfo();
    public settings: AppSettings = new AppSettings();

    public selectedAppName: string | null = null;

    public selectedBranchName: string | null = null;
    public branchCtrl: FormControl<string | null> = new FormControl<string | null>(null);

    private lastConfirmedBranchName: string | null = null;
    private branchesMap: Map<string, domain.Branches> = new Map();

    public isGitFetching = false;

    constructor(
            private readonly notificationService: NotificationService,
            private readonly centralService: CentralService,
            private readonly settingsService: SettingsService,
            private readonly gitService: GitService,
            private readonly dialog: MatDialog
    ) {
    }

    ngOnInit(): void {
        this.initNotificationSubscription();
        this.refresh();

        this.runningProcessesSub = interval(5000)
                .pipe(
                        startWith(5),
                        switchMap(() => this.centralService.getRunningProcesses())
                )
                .subscribe({
                    next: (response: RunningProcesses[]) => {
                        this.centralInfo.applicationInfos.forEach(ai => {
                            const find = response.find(rp => rp.path === ai.jarPath);
                            ai.pid = find ? find.pid : 0;
                        });
                    },
                    error: err => console.error(err)
                });
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
        this.runningProcessesSub?.unsubscribe();
    }

    private initNotificationSubscription(): void {
        this.notificationEventSubscription = EventsOn('ui:notify', (n: UINotification) => {
            if (!n) return;

            switch (n.type) {
                case 'success':
                    this.notificationService.notifySuccess(n.message, n.title);
                    break;
                case 'error':
                    this.notificationService.notifyError(n.message, n.title);
                    break;
                case 'warn':
                    this.notificationService.notifyWarn(n.message, n.title);
                    break;
                default:
                    this.notificationService.notifyInfo(n.message, n.title);
            }
        });
    }

    refresh(): void {
        this.subscriptions.push(
                this.centralService.getCentralInfo().subscribe({
                    next: (response: CentralInfo) => {
                        this.centralInfo = response;
                        this.reloadInternal();
                    },
                    error: _err => {
                        this.notificationService.notifyError(_err, 'refresh');
                    }
                })
        );

        this.subscriptions.push(
                this.settingsService.getSettings().subscribe({
                    next: (response: AppSettings) => {
                        this.settings = response;
                    },
                    error: _err => {
                        this.notificationService.notifyError(_err, 'refresh');
                    }
                })
        );
    }

    private reloadInternal(): void {

        this.centralInfo.applicationInfos.forEach(a => {
            a.appArguments = a.appArguments ?? [];
            a.envVariables = a.envVariables ?? [];
            a.startOrder = a.startOrder ?? 0;
        });

        this.centralInfo.applicationInfos.sort((a, b) => (a.startOrder ?? 0) - (b.startOrder ?? 0));

        this.recalculateStartOrder(false);

        if (!this.selectedAppName && this.centralInfo.applicationInfos.length > 0) {
            this.selectedAppName = this.centralInfo.applicationInfos[0].appName;
            this.getGitBranches(this.selectedAppName)
        }

        if (this.selectedAppName && !this.centralInfo.applicationInfos.some(a => a.appName === this.selectedAppName)) {
            this.selectedAppName = this.centralInfo.applicationInfos.length > 0
                    ? this.centralInfo.applicationInfos[0].appName
                    : null;
        }
    }

    get selectedApp(): ApplicationInfo | null {
        if (!this.selectedAppName) return null;
        return this.centralInfo.applicationInfos.find(a => a.appName === this.selectedAppName) ?? null;
    }

    get selectedBranches(): domain.Branches | null {
        const app = this.selectedApp;
        if (!app) return null;
        return this.branchesMap.get(app.appName) ?? null;
    }

    private uniqueSorted(list: string[] | null | undefined): string[] {
        if (!list || list.length === 0) return [];
        return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
    }

    get localBranchesForSelected(): string[] {
        const b = this.selectedBranches;
        if (!b) return [];
        return this.uniqueSorted((b.Local ?? []).filter(x => x !== b.Current));
    }

    get remoteBranchesForSelected(): string[] {
        const b = this.selectedBranches;
        if (!b) return [];
        return this.uniqueSorted(b.Remote ?? []);
    }

    selectApp(appName: string): void {
        this.selectedAppName = appName;
        this.selectedBranchName = null;
        this.lastConfirmedBranchName = null;
        this.branchCtrl.setValue(null, {emitEvent: false});
        this.getGitBranches(appName);
    }

    onBranchSelected(branch: string): void {
        const previous = this.lastConfirmedBranchName;

        const ref = this.dialog.open<ConfirmDialogComponent, any, ConfirmDialogResult>(
                ConfirmDialogComponent,
                {
                    width: '720px',
                    panelClass: 'solid-dialog',
                    data: {
                        title: 'Git',
                        message: `Переключиться на ветку: ${branch}?`,
                    }
                }
        );

        ref.afterClosed().subscribe((res) => {
            const confirm = res?.confirm;

            if (!confirm) {
                // откат выбора в UI
                this.branchCtrl.setValue(previous, {emitEvent: false});
                return;
            }

            // подтверждено
            this.lastConfirmedBranchName = branch;
            this.selectedBranchName = branch;

            if (!this.selectedAppName) return;

            const current = this.branchesMap.get(this.selectedAppName)?.Current;
            if (branch === current) return;

            this.subscriptions.push(
                    this.gitService.checkoutBranch(this.selectedAppName, branch).subscribe({
                        next: () => {
                            if (this.selectedAppName) {
                                this.getGitBranches(this.selectedAppName);
                            }
                        },
                        error: _err => {
                            // если checkout упал — тоже откатываем
                            this.lastConfirmedBranchName = previous ?? null;
                            this.selectedBranchName = previous ?? null;
                            this.branchCtrl.setValue(previous ?? null, {emitEvent: false});

                            this.notificationService.notifyError(_err, 'checkoutBranch');
                        }
                    })
            );
        });
    }

    runApp(appName: string): void {
        this.subscriptions.push(
                this.centralService.runApp(appName).subscribe({
                    next: (response: CommandResult) => {
                        const find = this.centralInfo.applicationInfos.find(ai => ai.jarPath === response.path);
                        if (find) {
                            find.pid = response.pid
                        }
                    },
                    error: _err => {
                        this.notificationService.notifyError(_err, 'runApp');
                    }
                })
        );
    }

    stopApp(appName: string): void {
        this.subscriptions.push(
                this.centralService.stopApp(appName).subscribe({
                    next: () => {

                    },
                    error: _err => {
                        this.notificationService.notifyError(_err, 'stopApp');
                    }
                })
        )
    }

    runAll(): void {
        this.subscriptions.push(
                this.centralService.runAll().subscribe({
                    next: () => {

                    },
                    error: _err => {
                        this.notificationService.notifyError(_err, 'runAll');
                    }
                })
        )
    }

    stopAll(): void {
        this.subscriptions.push(
                this.centralService.stopAll().subscribe({
                    next: () => {

                    },
                    error: _err => {
                        this.notificationService.notifyError(_err, 'stopAll');
                    }
                })
        )
    }

    onAppsDrop(event: CdkDragDrop<ApplicationInfo[]>): void {
        if (event.previousIndex === event.currentIndex) return;
        moveItemInArray(this.centralInfo.applicationInfos, event.previousIndex, event.currentIndex);
        this.recalculateStartOrder(true);
    }

    private recalculateStartOrder(saveAfter: boolean): void {
        this.centralInfo.applicationInfos.forEach((app, index) => {
            app.startOrder = index + 1;
        });

        if (saveAfter) {
            this.save();
        }
    }

    cloneApp(app: ApplicationInfo): void {
        const clone: ApplicationInfo = new ApplicationInfo();

        clone.appName = app.appName + '_copy';
        clone.baseDir = app.baseDir;
        clone.jarPath = app.jarPath;
        clone.hasGit = app.hasGit;
        clone.hasMaven = app.hasMaven;

        clone.appArguments = app.appArguments
                ? [...app.appArguments]
                : [];

        clone.envVariables = app.envVariables
                ? app.envVariables.map(ev => ({name: ev.name, value: ev.value}))
                : [];

        this.centralInfo.applicationInfos.push(clone);
        this.recalculateStartOrder(true);
        this.selectedAppName = clone.appName;
    }

    deleteJvmArg(app: ApplicationInfo, index: number): void {
        if (!app.appArguments || index < 0 || index >= app.appArguments.length) {
            return;
        }
        app.appArguments.splice(index, 1);
        this.save();
    }

    deleteEnvVar(app: ApplicationInfo, index: number): void {
        if (!app.envVariables || index < 0 || index >= app.envVariables.length) {
            return;
        }
        app.envVariables.splice(index, 1);
        this.save();
    }

    openAddAppInfoDialog(): void {
        const ref = this.dialog.open<AddAppDialogComponent, any, AddAppDialogResult>(
                AddAppDialogComponent,
                {
                    width: '720px',
                    panelClass: 'solid-dialog',
                    data: {title: `Добавить приложение`}
                }
        );

        ref.afterClosed().subscribe((res) => {
            const appInfo = res?.applicationInfo;
            if (!appInfo) return;

            if (this.checkNameExists(appInfo.appName)) {
                this.notificationService.notifyError('Данное наименование уже используется', 'Ошибка')
                return;
            }

            appInfo.appArguments = appInfo.appArguments ?? [];
            appInfo.envVariables = appInfo.envVariables ?? [];

            this.centralInfo.applicationInfos.push(appInfo);
            this.recalculateStartOrder(true);
            this.selectedAppName = appInfo.appName;
        });
    }

    openEditAppInfoDialog(applicationInfo: ApplicationInfo): void {
        const ref = this.dialog.open<EditAppDialogComponent, any, EditAppDialogResult>(
                EditAppDialogComponent,
                {
                    width: '720px',
                    panelClass: 'solid-dialog',
                    data: {
                        appName: applicationInfo.appName,
                        path: applicationInfo.jarPath
                    }
                }
        );

        ref.afterClosed().subscribe((res) => {
            const appName = res?.appName;
            if (!appName) return;

            const path = res?.path;
            if (!path) return;

            if (this.checkNameExists(appName)) {
                this.notificationService.notifyError('Данное наименование уже используется', 'Ошибка')
                return;
            }

            applicationInfo.jarPath = path;
            applicationInfo.appName = appName;

            this.save();
        });
    }

    checkNameExists(name: string): boolean {
        let exists = false;
        const found = this.centralInfo.applicationInfos.find(appInfo => appInfo.appName === name)
        if (found) {
            exists = true;
        }
        return exists;
    }

    deleteAppInfo(app: ApplicationInfo): void {
        if (!app) return;
        const list = this.centralInfo.applicationInfos;
        if (!list || list.length === 0) return;
        let idx = list.indexOf(app);
        if (idx < 0) {
            idx = list.findIndex(a => a.appName === app.appName);
        }
        if (idx < 0) return;

        list.splice(idx, 1);
        list.forEach((a, index) => {
            a.startOrder = index + 1;
        });
        this.selectedAppName = list.length > 0 ? list[0].appName : null;
        this.save();
    }

    disable(appInfo: ApplicationInfo): void {
        if (!appInfo) return;
        appInfo.isActive = false;
        this.save();
    }

    enable(appInfo: ApplicationInfo): void {
        if (!appInfo) return;
        appInfo.isActive = true;
        this.save();
    }

    openEditArgInfoDialog(applicationInfo: ApplicationInfo, index: number): void {
        const ref = this.dialog.open<EditArgDialogComponent, any, EditArgDialogResult>(
                EditArgDialogComponent,
                {
                    width: '720px',
                    panelClass: 'solid-dialog',
                    data: {
                        arg: applicationInfo.appArguments[index]
                    }
                }
        );

        ref.afterClosed().subscribe((res) => {
            const arg = res?.arg;
            if (!arg) return;

            applicationInfo.appArguments[index] = arg;
            this.save();
        });
    }

    openEditEnvInfoDialog(env: EnvVariable): void {
        const ref = this.dialog.open<EditEnvDialogComponent, any, EditEnvDialogResult>(
                EditEnvDialogComponent,
                {
                    width: '720px',
                    panelClass: 'solid-dialog',
                    data: {
                        name: env.name,
                        value: env.value
                    }
                }
        );

        ref.afterClosed().subscribe((res) => {
            const name = res?.name;
            if (!name) return;

            const value = res?.value;
            if (!value) return;

            env.name = name;
            env.value = value;

            this.save();
        });
    }

    openAddArgDialog(app: ApplicationInfo): void {
        const ref = this.dialog.open<AddArgDialogComponent, any, AddArgDialogResult>(
                AddArgDialogComponent,
                {
                    width: '720px',
                    panelClass: 'solid-dialog',
                    data: {title: `Добавить JVM аргумент"`}
                }
        );

        ref.afterClosed().subscribe((res) => {
            const arg = res?.arg;
            if (!arg) return;

            app.appArguments.push(arg);
            this.save();
        });
    }

    openAddEnvDialog(app: ApplicationInfo): void {
        const ref = this.dialog.open<AddEnvDialogComponent, any, AddEnvDialogResult>(
                AddEnvDialogComponent,
                {
                    width: '560px',
                    panelClass: 'solid-dialog',
                    data: {title: `Добавить переменную окружения для "${app.appName}"`}
                }
        );

        ref.afterClosed().subscribe((res) => {
            const envVariable = res?.envVariable;
            if (!envVariable) return;

            app.envVariables.push(envVariable);
            this.save();
        });
    }

    openSettingsDialog(): void {
        const ref = this.dialog.open(EditSettingsDialogComponent, {
            width: '720px',
            height: '480px',
            maxWidth: 'none',
            maxHeight: 'none',
            panelClass: 'solid-dialog',
            data: {
                centralInfoPath: this.settings.centralInfoPath,
                applicationStartingDelaySec: this.settings.applicationStartingDelaySec,
                minimizeToTrayOnClose: this.settings.minimizeToTrayOnClose,
                startQuietMode: this.settings.startQuietMode,
            }
        });

        ref.afterClosed().subscribe((res) => {
            if (res) {
                if (res.applicationStartingDelaySec > 60) {
                    this.notificationService.notifyError('Не разумно ставить задержку больше минуты))', 'ПУПУПУ');
                    return
                }

                this.settings.centralInfoPath = res.centralInfoPath;
                this.settings.applicationStartingDelaySec = res.applicationStartingDelaySec;
                this.settings.minimizeToTrayOnClose = res.minimizeToTrayOnClose;
                this.settings.startQuietMode = res.startQuietMode;
                this.saveSettings()
            }
        });
    }

    openLogDialog(app: ApplicationInfo): void {
        this.dialog.open(LogDialogComponent, {
            width: '1600px',
            height: '900px',
            maxWidth: 'none',
            maxHeight: 'none',
            panelClass: ['solid-dialog', 'log-dialog'],
            data: {appName: app.appName, pid: app.pid ?? 0}
        });
    }

    getGitBranches(appName: string, fetch: boolean = false): void {
        this.isGitFetching = fetch

        const find = this.selectedApp
        if (find && find.hasGit) {
            this.subscriptions.push(
                    this.gitService.getGitBranches(appName, fetch).subscribe({
                        next: (response: domain.Branches) => {
                            if (response) {
                                this.branchesMap.set(appName, response);
                                const current = response.Current ?? null;
                                this.selectedBranchName = current;
                                this.lastConfirmedBranchName = current;
                                this.branchCtrl.setValue(current, {emitEvent: false});
                            }
                            this.isGitFetching = false
                        },
                        error: _err => {
                            this.isGitFetching = false
                            this.notificationService.notifyError(_err, 'stopAll');
                        }
                    })
            )
        }
    }

    private save(): void {
        this.subscriptions.push(
                this.centralService.saveCentralInfo(this.centralInfo).subscribe({
                    next: (response: CentralInfo) => {
                        this.centralInfo = response;
                        this.centralInfo.applicationInfos.forEach(a => {
                            a.appArguments = a.appArguments ?? [];
                            a.envVariables = a.envVariables ?? [];
                            a.startOrder = a.startOrder ?? 0;
                            a.isActive = a.isActive ?? false;
                        });
                        this.centralInfo.applicationInfos.sort((a, b) => (a.startOrder ?? 0) - (b.startOrder ?? 0));
                    },
                    error: _err => {
                        this.notificationService.notifyError(_err, "on save error")
                    }
                })
        );
    }

    private saveSettings(): void {
        this.subscriptions.push(
                this.settingsService.saveSettings(this.settings).subscribe({
                    next: () => {
                        this.notificationService.notifySuccess('Настройки сохранены', 'Ура');
                    },
                    error: _err => {
                        this.notificationService.notifyError(_err, 'О нет');
                    }
                })
        )
    }


    trackByAppName = (_: number, item: ApplicationInfo) => item.appName;
}
