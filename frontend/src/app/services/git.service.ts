import {Injectable} from '@angular/core';

import {CheckoutBranch, GetGitBranches} from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';
import {from, Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GitService {

  constructor() {
  }

  getGitBranches(appName: string, fetch: boolean = false): Observable<domain.Branches> {
    return from(GetGitBranches(appName, fetch));
  }

  checkoutBranch(appName: string, branch: string): Observable<void> {
    return from(CheckoutBranch(appName, branch));
  }

}
