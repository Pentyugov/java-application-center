import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';

import {
  GetCentralInfoDTO,
  Save,
  RunApplication,
  GetRunningProcesses, RunAll, StopApplication, StopAllApplications
} from '../../../wailsjs/go/main/App';
import {dto, util} from '../../../wailsjs/go/models';


@Injectable({
  providedIn: 'root'
})
export class CentralService {

  getCentralInfo(): Observable<dto.CentralInfoDTO> {
    return from(GetCentralInfoDTO());
  }

  saveCentralInfo(req: any): Observable<dto.CentralInfoDTO> {
    return from(Save(req));
  }

  runAll(): Observable<void> {
    return from(RunAll());
  }

  runApp(appName: string): Observable<util.CommandResult> {
    return from(RunApplication(appName));
  }

  stopApp(appName: string): Observable<void> {
    return from(StopApplication(appName));
  }

  stopAll(): Observable<void> {
    return from(StopAllApplications());
  }

  getRunningProcesses(): Observable<Array<dto.RunningProcessDTO>> {
    return from(GetRunningProcesses());
  }
}
