import { Injectable } from '@angular/core';
import {ToastrService} from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(private toastr: ToastrService) {
  }

  public notifySuccess(message: string, title: string) {
    this.toastr.success(message, title);
  }

  public notifyInfo(message: string, title: string) {
    this.toastr.info(message, title);
  }

  public notifyWarn(message: string, title: string) {
    this.toastr.warning(message, title);
  }

  public notifyError(message: string, title: string) {
    this.toastr.error(message, title);
  }



}
