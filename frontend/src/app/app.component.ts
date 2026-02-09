import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { interval, startWith, switchMap, finalize, filter } from 'rxjs';

import { CentralService } from './services/central.service';
import { SettingsService } from './services/settings.service';
import { NotificationService } from './services/notification.service';
import { GitService } from './services/git.service';

import { CentralInfo } from './model/central-info';
import { ApplicationInfo } from './model/application-info';
import { EnvVariable } from './model/env-variable';
import { AppSettings } from './model/settings';

import { CommandResult } from './model/command-result';
import { RunningProcesses } from './model/running-processes';

import { EventsOn } from '../../wailsjs/runtime';
import { UINotification } from './model/ui-notification';
import { domain } from '../../wailsjs/go/models';

import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { AddEnvDialogComponent, AddEnvDialogResult } from './ui/add-env-dialog.component';
import { AddAppDialogComponent, AddAppDialogResult } from './ui/add-app-dialog.component';
import { AddArgDialogComponent, AddArgDialogResult } from './ui/add-arg-dialog.component';
import { EditArgDialogComponent, EditArgDialogResult } from './ui/edit-arg-dialog.component';
import { EditEnvDialogComponent, EditEnvDialogResult } from './ui/edit-env-dialog.component';
import { EditSettingsDialogComponent } from './ui/edit-settings-dialog';
import { LogDialogComponent } from './ui/log/log-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogResult } from './ui/confirm-dialog';

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
        ReactiveFormsModule,
    ],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);

    private notificationEventUnsub?: () => void;

    public centralInfo: CentralInfo = new CentralInfo();
    public settings: AppSettings = new AppSettings();

    public selectedAppName: string | null = null;

    public selectedBranchName: string | null = null;
    public branchCtrl: FormControl<string | null> = new FormControl<string | null>(null);

    private lastConfirmedBranchName: string | null = null;
    private readonly branchesMap: Map<string, domain.Branches> = new Map();

    public isGitFetching = false;

    constructor(
            private readonly notificationService: NotificationService,
            private readonly centralService: CentralService,
            private readonly settingsService: SettingsService,
            private readonly gitService: GitService,
            private readonly dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.initNotificationSubscription();
        this.refresh();

        interval(5000)
                .pipe(
                        startWith(0),
                        switchMap(() => this.centralService.getRunningProcesses()),
                        takeUntilDestroyed(this.destroyRef)
                )
                .subscribe({
                    next: (processes: RunningProcesses[]) => this.applyRunningPids(processes),
                    error: (err) => console.error(err),
                });

        // корректно снять обработчик событий wails при уничтожении компонента
        this.destroyRef.onDestroy(() => {
            try {
                this.notificationEventUnsub?.();
            } catch {
                // ignore
            }
        });
    }

    // -----------------------------
    // Derived getters for template
    // -----------------------------

    get selectedApp(): ApplicationInfo | null {
        if (!this.selectedAppName) return null;
        return this.centralInfo.applicationInfos.find((a) => a.appName === this.selectedAppName) ?? null;
    }

    get selectedBranches(): domain.Branches | null {
        const app = this.selectedApp;
        if (!app) return null;
        return this.branchesMap.get(app.appName) ?? null;
    }

    get localBranchesForSelected(): string[] {
        const b = this.selectedBranches;
        if (!b) return [];
        return this.uniqueSorted((b.Local ?? []).filter((x) => x !== b.Current));
    }

    get remoteBranchesForSelected(): string[] {
        const b = this.selectedBranches;
        if (!b) return [];
        return this.uniqueSorted(b.Remote ?? []);
    }

    // -----------------------------
    // Public UI actions
    // -----------------------------

    refresh(): void {
        this.centralService
                .getCentralInfo()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (response: CentralInfo) => {
                        this.centralInfo = this.normalizeCentralInfo(response);
                        this.ensureValidSelectionAfterReload();
                    },
                    error: (err) => this.notificationService.notifyError(err, 'refresh'),
                });

        this.settingsService
                .getSettings()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (response: AppSettings) => (this.settings = response),
                    error: (err) => this.notificationService.notifyError(err, 'refresh'),
                });
    }

    selectApp(appName: string): void {
        this.selectedAppName = appName;
        this.resetBranchSelection();
        this.getGitBranches(appName);
    }

    onAppsDrop(event: CdkDragDrop<ApplicationInfo[]>): void {
        if (event.previousIndex === event.currentIndex) return;
        moveItemInArray(this.centralInfo.applicationInfos, event.previousIndex, event.currentIndex);
        this.recalculateStartOrder(true);
    }

    runApp(appName: string): void {
        this.centralService
                .runApp(appName)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (response: CommandResult) => {
                        const found = this.centralInfo.applicationInfos.find((ai) => ai.jarPath === response.path);
                        if (found) found.pid = response.pid;
                    },
                    error: (err) => this.notificationService.notifyError(err, 'runApp'),
                });
    }

    stopApp(appName: string): void {
        this.centralService
                .stopApp(appName)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: () => {},
                    error: (err) => this.notificationService.notifyError(err, 'stopApp'),
                });
    }

    runAll(): void {
        this.centralService
                .runAll()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: () => {},
                    error: (err) => this.notificationService.notifyError(err, 'runAll'),
                });
    }

    stopAll(): void {
        this.centralService
                .stopAll()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: () => {},
                    error: (err) => this.notificationService.notifyError(err, 'stopAll'),
                });
    }

    cloneApp(app: ApplicationInfo): void {
        const clone = this.copyApp(app);
        this.centralInfo.applicationInfos.push(clone);
        this.recalculateStartOrder(true);
        this.selectedAppName = clone.appName;
    }

    deleteAppInfo(app: ApplicationInfo): void {
        const list = this.centralInfo.applicationInfos;
        if (!app || !list?.length) return;

        const idx = list.indexOf(app) >= 0 ? list.indexOf(app) : list.findIndex((a) => a.appName === app.appName);
        if (idx < 0) return;

        list.splice(idx, 1);
        this.recalculateStartOrder(false);

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

    deleteJvmArg(app: ApplicationInfo, index: number): void {
        if (!app.appArguments || index < 0 || index >= app.appArguments.length) return;
        app.appArguments.splice(index, 1);
        this.save();
    }

    deleteEnvVar(app: ApplicationInfo, index: number): void {
        if (!app.envVariables || index < 0 || index >= app.envVariables.length) return;
        app.envVariables.splice(index, 1);
        this.save();
    }

    // -----------------------------
    // Dialogs
    // -----------------------------

    openAddAppInfoDialog(): void {
        const ref = this.dialog.open<AddAppDialogComponent, any, AddAppDialogResult>(AddAppDialogComponent, {
            width: '720px',
            panelClass: 'solid-dialog',
            data: { title: 'Добавить приложение' },
        });

        ref
                .afterClosed()
                .pipe(
                        takeUntilDestroyed(this.destroyRef),
                        filter((res) => !!res?.applicationInfo)
                )
                .subscribe((res) => {
                    const appInfo = res!.applicationInfo!;
                    if (this.checkNameExists(appInfo.appName)) {
                        this.notificationService.notifyError('Данное наименование уже используется', 'Ошибка');
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
        const oldName = applicationInfo.appName;

        const ref = this.dialog.open<AddAppDialogComponent, any, AddAppDialogResult>(AddAppDialogComponent, {
            width: '720px',
            panelClass: 'solid-dialog',
            data: {
                title: 'Редактировать приложение',
                applicationInfo,
            },
        });

        ref
                .afterClosed()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((res) => {
                    const edited = res?.applicationInfo;
                    if (!edited || !edited.appName || !edited.baseDir || !edited.jarPath) return;

                    if (this.checkNameExistsExcept(edited.appName, applicationInfo)) {
                        this.notificationService.notifyError('Данное наименование уже используется', 'Ошибка');
                        return;
                    }

                    applicationInfo.baseDir = edited.baseDir;
                    applicationInfo.jarPath = edited.jarPath;
                    applicationInfo.appName = edited.appName;

                    if (this.selectedAppName === oldName) {
                        this.selectedAppName = edited.appName;
                    }

                    if (oldName !== edited.appName) {
                        const b = this.branchesMap.get(oldName);
                        if (b) {
                            this.branchesMap.delete(oldName);
                            this.branchesMap.set(edited.appName, b);
                        }
                    }

                    this.save();
                });
    }

    openAddArgDialog(app: ApplicationInfo): void {
        const ref = this.dialog.open<AddArgDialogComponent, any, AddArgDialogResult>(AddArgDialogComponent, {
            width: '720px',
            panelClass: 'solid-dialog',
            data: { title: 'Добавить JVM аргумент' },
        });

        ref
                .afterClosed()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((res) => {
                    const arg = res?.arg;
                    if (!arg) return;
                    app.appArguments.push(arg);
                    this.save();
                });
    }

    openEditArgInfoDialog(applicationInfo: ApplicationInfo, index: number): void {
        const ref = this.dialog.open<EditArgDialogComponent, any, EditArgDialogResult>(EditArgDialogComponent, {
            width: '720px',
            panelClass: 'solid-dialog',
            data: { arg: applicationInfo.appArguments[index] },
        });

        ref
                .afterClosed()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((res) => {
                    const arg = res?.arg;
                    if (!arg) return;
                    applicationInfo.appArguments[index] = arg;
                    this.save();
                });
    }

    openAddEnvDialog(app: ApplicationInfo): void {
        const ref = this.dialog.open<AddEnvDialogComponent, any, AddEnvDialogResult>(AddEnvDialogComponent, {
            width: '560px',
            panelClass: 'solid-dialog',
            data: { title: `Добавить переменную окружения для "${app.appName}"` },
        });

        ref
                .afterClosed()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((res) => {
                    const envVariable = res?.envVariable;
                    if (!envVariable) return;
                    app.envVariables.push(envVariable);
                    this.save();
                });
    }

    openEditEnvInfoDialog(env: EnvVariable): void {
        const ref = this.dialog.open<EditEnvDialogComponent, any, EditEnvDialogResult>(EditEnvDialogComponent, {
            width: '720px',
            panelClass: 'solid-dialog',
            data: { name: env.name, value: env.value },
        });

        ref
                .afterClosed()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((res) => {
                    const name = res?.name;
                    const value = res?.value;
                    if (!name || value == null) return;

                    env.name = name;
                    env.value = value;

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
            },
        });

        ref
                .afterClosed()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((res) => {
                    if (!res) return;

                    if (res.applicationStartingDelaySec > 60) {
                        this.notificationService.notifyError('Не разумно ставить задержку больше минуты))', 'ПУПУПУ');
                        return;
                    }

                    this.settings.centralInfoPath = res.centralInfoPath;
                    this.settings.applicationStartingDelaySec = res.applicationStartingDelaySec;
                    this.settings.minimizeToTrayOnClose = res.minimizeToTrayOnClose;
                    this.settings.startQuietMode = res.startQuietMode;

                    this.saveSettings();
                });
    }

    openLogDialog(app: ApplicationInfo): void {
        this.dialog.open(LogDialogComponent, {
            width: '1600px',
            height: '900px',
            maxWidth: 'none',
            maxHeight: 'none',
            panelClass: ['solid-dialog', 'log-dialog'],
            data: { appName: app.appName, pid: app.pid ?? 0 },
        });
    }

    // -----------------------------
    // Git
    // -----------------------------

    getGitBranches(appName: string, fetch: boolean = false): void {
        const app = this.selectedApp;
        if (!app?.hasGit) return;

        this.isGitFetching = fetch;

        this.gitService
                .getGitBranches(appName, fetch)
                .pipe(
                        finalize(() => (this.isGitFetching = false)),
                        takeUntilDestroyed(this.destroyRef)
                )
                .subscribe({
                    next: (response: domain.Branches) => {
                        if (!response) return;
                        this.branchesMap.set(appName, response);

                        const current = response.Current ?? null;
                        this.selectedBranchName = current;
                        this.lastConfirmedBranchName = current;
                        this.branchCtrl.setValue(current, { emitEvent: false });
                    },
                    error: (err) => this.notificationService.notifyError(err, 'getGitBranches'),
                });
    }

    onBranchSelected(branch: string): void {
        const previous = this.lastConfirmedBranchName;

        const ref = this.dialog.open<ConfirmDialogComponent, any, ConfirmDialogResult>(ConfirmDialogComponent, {
            width: '720px',
            panelClass: 'solid-dialog',
            data: { title: 'Git', message: `Переключиться на ветку: ${branch}?` },
        });

        ref
                .afterClosed()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((res) => {
                    const confirm = res?.confirm;

                    if (!confirm) {
                        this.branchCtrl.setValue(previous, { emitEvent: false });
                        return;
                    }

                    this.lastConfirmedBranchName = branch;
                    this.selectedBranchName = branch;

                    if (!this.selectedAppName) return;

                    const current = this.branchesMap.get(this.selectedAppName)?.Current;
                    if (branch === current) return;

                    this.gitService
                            .checkoutBranch(this.selectedAppName, branch)
                            .pipe(takeUntilDestroyed(this.destroyRef))
                            .subscribe({
                                next: () => this.selectedAppName && this.getGitBranches(this.selectedAppName),
                                error: (err) => {
                                    this.lastConfirmedBranchName = previous ?? null;
                                    this.selectedBranchName = previous ?? null;
                                    this.branchCtrl.setValue(previous ?? null, { emitEvent: false });
                                    this.notificationService.notifyError(err, 'checkoutBranch');
                                },
                            });
                });
    }

    // -----------------------------
    // Persistence
    // -----------------------------

    private save(): void {
        this.centralService
                .saveCentralInfo(this.centralInfo)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (response: CentralInfo) => {
                        this.centralInfo = this.normalizeCentralInfo(response);
                        // selection не трогаем, но если переименовали/удалили — подстрахуемся
                        this.ensureValidSelectionAfterReload(false);
                    },
                    error: (err) => this.notificationService.notifyError(err, 'on save error'),
                });
    }

    private saveSettings(): void {
        this.settingsService
                .saveSettings(this.settings)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: () => this.notificationService.notifySuccess('Настройки сохранены', 'Ура'),
                    error: (err) => this.notificationService.notifyError(err, 'О нет'),
                });
    }

    // -----------------------------
    // Helpers
    // -----------------------------

    private initNotificationSubscription(): void {
        this.notificationEventUnsub = EventsOn('ui:notify', (n: UINotification) => {
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

    private normalizeCentralInfo(info: CentralInfo): CentralInfo {
        info.applicationInfos = info.applicationInfos ?? [];

        info.applicationInfos.forEach((a) => {
            a.appArguments = a.appArguments ?? [];
            a.envVariables = a.envVariables ?? [];
            a.startOrder = a.startOrder ?? 0;
            a.isActive = a.isActive ?? false;
            a.pid = a.pid ?? 0;
        });

        info.applicationInfos.sort((a, b) => (a.startOrder ?? 0) - (b.startOrder ?? 0));

        // всегда переиндексируем локально (это делает поведение стабильным)
        this.recalculateStartOrder(false);

        return info;
    }

    private ensureValidSelectionAfterReload(loadGitIfNeeded: boolean = true): void {
        const list = this.centralInfo.applicationInfos;

        if (!this.selectedAppName && list.length > 0) {
            this.selectedAppName = list[0].appName;
            this.resetBranchSelection();
            if (loadGitIfNeeded) this.getGitBranches(this.selectedAppName);
            return;
        }

        if (this.selectedAppName && !list.some((a) => a.appName === this.selectedAppName)) {
            this.selectedAppName = list.length > 0 ? list[0].appName : null;
            this.resetBranchSelection();
            if (this.selectedAppName && loadGitIfNeeded) this.getGitBranches(this.selectedAppName);
        }
    }

    private resetBranchSelection(): void {
        this.selectedBranchName = null;
        this.lastConfirmedBranchName = null;
        this.branchCtrl.setValue(null, { emitEvent: false });
    }

    private applyRunningPids(processes: RunningProcesses[]): void {
        const apps = this.centralInfo.applicationInfos ?? [];
        for (const ai of apps) {
            const p = processes.find((rp) => rp.path === ai.jarPath);
            ai.pid = p ? p.pid : 0;
        }
    }

    private recalculateStartOrder(saveAfter: boolean): void {
        this.centralInfo.applicationInfos.forEach((app, index) => (app.startOrder = index + 1));
        if (saveAfter) this.save();
    }

    private uniqueSorted(list: string[] | null | undefined): string[] {
        if (!list?.length) return [];
        return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
    }

    private copyApp(app: ApplicationInfo): ApplicationInfo {
        const clone = new ApplicationInfo();

        clone.appName = `${app.appName}_copy`;
        clone.baseDir = app.baseDir;
        clone.jarPath = app.jarPath;
        clone.hasGit = app.hasGit;
        clone.hasMaven = app.hasMaven;

        clone.appArguments = app.appArguments ? [...app.appArguments] : [];
        clone.envVariables = app.envVariables ? app.envVariables.map((ev) => ({ name: ev.name, value: ev.value })) : [];

        return clone;
    }

    private checkNameExistsExcept(name: string, current: ApplicationInfo): boolean {
        return this.centralInfo.applicationInfos.some((a) => a !== current && a.appName === name);
    }

    checkNameExists(name: string): boolean {
        return this.centralInfo.applicationInfos.some((appInfo) => appInfo.appName === name);
    }

    trackByAppName = (_: number, item: ApplicationInfo) => item.appName;
}
