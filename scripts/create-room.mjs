import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Store } from '../src/store.mjs';

const output=process.argv[2];
if(!output||existsSync(output))throw new Error('Provide a new output file; existing credentials are never overwritten.');
process.umask(0o077);
mkdirSync(dirname(output),{recursive:true});
const store=new Store(process.env.DATA_PATH||'data/love.db');
try{
  const {token,state}=store.createRoom();
  writeFileSync(output,JSON.stringify({token,createdAt:new Date().toISOString()}),{mode:0o600,flag:'wx'});
  console.log(`Created private room with ${state.items.length} wishes; credential saved to the requested file.`);
}finally{store.close();}
