import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';

import {
  GetSettings, SaveSettings
} from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';


@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  getSettings(): Observable<domain.AppSettings> {
    return from(GetSettings());
  }

  saveSettings(req: any): Observable<void> {
    return from(SaveSettings(req));
  }

}
