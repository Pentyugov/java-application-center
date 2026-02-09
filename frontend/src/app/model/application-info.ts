import {EnvVariable} from './env-variable';

export class ApplicationInfo {
  appName: string;
  envVariables: EnvVariable[];
  appArguments: string[];
  path: string;
  gitPath: string;
  startOrder: number;
  isActive: boolean;
  pid: number;

  constructor() {
    this.appName = '';
    this.path = '';
    this.gitPath = '';
    this.envVariables = [];
    this.appArguments = [];
    this.startOrder = 0;
    this.isActive = false;
    this.pid = 0;
  }

}
