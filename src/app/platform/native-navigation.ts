import { Injectable } from '@angular/core';

export type NativeBackHandler=()=>boolean;
type BackModules={core:typeof import('@capacitor/core');app:typeof import('@capacitor/app')};

export async function connectNativeBack(handler:NativeBackHandler,loader:()=>Promise<BackModules>=async()=>({core:await import('@capacitor/core'),app:await import('@capacitor/app')})):Promise<()=>Promise<void>>{
  const {core,app}=await loader();
  if(!core.Capacitor.isNativePlatform()||core.Capacitor.getPlatform()!=='android')return async()=>undefined;
  const handle=await app.App.addListener('backButton',event=>{
    if(handler())return;
    if(event.canGoBack)history.back();else void app.App.exitApp();
  });
  return async()=>handle.remove();
}

/** Android shell navigation. Browser and iOS retain their normal navigation behaviour. */
@Injectable({providedIn:'root'})
export class NativeBackNavigation {
  connect(handler:NativeBackHandler):Promise<()=>Promise<void>>{return connectNativeBack(handler);}
}
