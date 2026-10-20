import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args=process.argv.slice(2);
const option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const root=resolve(option('--dir',fileURLToPath(new URL('../public/',import.meta.url))));
const port=Number(option('--port',process.env.PORT||4173));
const host=option('--host',process.env.HOST||'127.0.0.1');
const base=option('--base','/').replace(/\/?$/,'/');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try {
    let path=decodeURIComponent(new URL(req.url,'http://local').pathname);
    if(path==='/'&&base!=='/'){res.writeHead(302,{location:base});return res.end();}
    if(!path.startsWith(base)||!['GET','HEAD'].includes(req.method))throw new Error();
    path=path.slice(base.length);
    if(path.split('/').some(part=>part.startsWith('.')))throw new Error();
    let file=resolve(root,path||'index.html');
    if(!file.startsWith(root+sep))throw new Error();
    if((await stat(file)).isDirectory())file=resolve(file,'index.html');
    const body=await readFile(file);
    res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-cache','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});
    res.end(req.method==='HEAD'?undefined:body);
  } catch {res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('Not found');}
});
server.listen(port,host,()=>console.log(`Static preview: http://localhost:${port}${base}`));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
