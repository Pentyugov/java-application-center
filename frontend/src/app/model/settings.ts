export class AppSettings {
  centralInfoPath: string
  applicationStartingDelaySec: number
  minimizeToTrayOnClose: boolean
  startQuietMode: boolean

  constructor() {
    this.centralInfoPath = '';
    this.applicationStartingDelaySec = 0;
    this.minimizeToTrayOnClose = false;
    this.startQuietMode = false;
  }

}
