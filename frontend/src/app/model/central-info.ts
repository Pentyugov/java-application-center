import {EnvVariable} from './env-variable';
import {ApplicationInfo} from './application-info';

export class CentralInfo {
  globalVariables: EnvVariable[];
  applicationInfos: ApplicationInfo[];


  constructor() {
    this.globalVariables = [];
    this.applicationInfos = [];
  }
}
