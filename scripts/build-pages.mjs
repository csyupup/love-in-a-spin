import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source=new URL('../public/',import.meta.url),output=new URL('../dist/',import.meta.url);
const initial=JSON.parse(await readFile(new URL('initial-wishes.json',source),'utf8'));
if(!Array.isArray(initial.items)||initial.items.some(item=>item.selected)||initial.history?.length)throw new Error('发布的初始清单必须没有勾选和历史记录');
await rm(output,{recursive:true,force:true});
await cp(source,output,{recursive:true});
if(process.env.SHARED_API_BASE){
  const api=new URL(process.env.SHARED_API_BASE);
  if(api.protocol!=='https:'||api.username||api.password||api.search||api.hash)throw new Error('共享接口必须使用不带凭证的 HTTPS 地址');
  if(!api.pathname.endsWith('/'))api.pathname+='/';
  await writeFile(new URL('runtime-config.js',output),`export const storageMode='shared';\nexport const apiBase=${JSON.stringify(api.href)};\n`);
}
await writeFile(new URL('.nojekyll',output),'');
console.log(`Built ${initial.items.length} unselected wishes at ${fileURLToPath(output)}`);
