import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source=new URL('../public/',import.meta.url),output=new URL('../dist/',import.meta.url);
const initial=JSON.parse(await readFile(new URL('initial-wishes.json',source),'utf8'));
if(!Array.isArray(initial.items)||initial.items.some(item=>item.selected)||initial.history?.length)throw new Error('发布的初始清单必须没有勾选和历史记录');
await rm(output,{recursive:true,force:true});
await cp(source,output,{recursive:true});
await writeFile(new URL('.nojekyll',output),'');
console.log(`Built ${initial.items.length} unselected wishes at ${fileURLToPath(output)}`);
