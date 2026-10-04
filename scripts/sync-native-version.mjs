import {readFile,writeFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const pkg=JSON.parse(await readFile(new URL('package.json',root),'utf8'));
if(!/^\d+\.\d+\.\d+$/.test(pkg.version))throw new Error('package.json version must use major.minor.patch.');
const iosBuild=process.env['HOLORECALL_IOS_BUILD']??'1';
const androidBuild=process.env['HOLORECALL_ANDROID_BUILD']??'1';
if(!/^\d+$/.test(iosBuild)||!/^\d+$/.test(androidBuild))throw new Error('Native build numbers must be positive integers.');

async function replace(path,replacements){
  const url=new URL(path,root);let value=await readFile(url,'utf8');
  for(const [pattern,next] of replacements)value=value.replace(pattern,next);
  await writeFile(url,value);
}
await replace('ios/App/App.xcodeproj/project.pbxproj',[[/MARKETING_VERSION = [^;]+;/g,`MARKETING_VERSION = ${pkg.version};`],[/CURRENT_PROJECT_VERSION = \d+;/g,`CURRENT_PROJECT_VERSION = ${iosBuild};`]]);
await replace('android/app/build.gradle',[[/versionCode \d+/,`versionCode ${androidBuild}`],[/versionName "[^"]+"/,`versionName "${pkg.version}"`]]);
console.log(`Native metadata: product ${pkg.version}, iOS build ${iosBuild}, Android build ${androidBuild}`);
