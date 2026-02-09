import {EnvVariable} from './env-variable';

export class ApplicationInfo {
    appName: string;
    envVariables: EnvVariable[];
    appArguments: string[];
    baseDir: string;
    jarPath: string;
    startOrder: number;
    isActive: boolean;
    hasMaven: boolean;
    hasGit: boolean;
    pid: number;

    constructor() {
        this.appName = '';
        this.baseDir = '';
        this.jarPath = '';
        this.envVariables = [];
        this.appArguments = [];
        this.startOrder = 0;
        this.isActive = false;
        this.hasMaven = false;
        this.hasGit = false;
        this.pid = 0;
    }

}
