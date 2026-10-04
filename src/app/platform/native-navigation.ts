import { Injectable } from '@angular/core';

export type NativeBackHandler=()=>boolean;

/** Android shell navigation. Browser and iOS retain their normal navigation behaviour. */
@Injectable({providedIn:'root'})
export class NativeBackNavigation {
  async connect(handler:NativeBackHandler):Promise<()=>Promise<void>>{
    const core=await import('@capacitor/core');
    if(!core.Capacitor.isNativePlatform()||core.Capacitor.getPlatform()!=='android')return async()=>undefined;
    const {App}=await import('@capacitor/app');
    const handle=await App.addListener('backButton',event=>{
      if(handler())return;
      if(event.canGoBack)history.back();else void App.exitApp();
    });
    return async()=>handle.remove();
  }
}
