import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.mjs';
import { DomainError } from './domain.mjs';

const root = fileURLToPath(new URL('../public/',import.meta.url));
const assets = new Map([['/',['index.html','text/html; charset=utf-8']],['/index.html',['index.html','text/html; charset=utf-8']],['/style.css',['style.css','text/css; charset=utf-8']],['/app.js',['app.js','text/javascript; charset=utf-8']],['/wheel.js',['wheel.js','text/javascript; charset=utf-8']],['/sync.js',['sync.js','text/javascript; charset=utf-8']],['/favicon.svg',['favicon.svg','image/svg+xml']]]);
async function readJson(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new DomainError('请发送 JSON 内容',415);
  const chunks=[]; let size = 0;
  for await (const chunk of req) { size += chunk.length; if(size>16384) throw new DomainError('内容太长了，请精简一下',413); chunks.push(chunk); }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new DomainError('内容格式不正确，请重试'); }
}
export function createApplication({dbPath = process.env.DATA_PATH || resolve('data/love.db')} = {}) {
  if(dbPath!==':memory:') mkdirSync(dirname(dbPath),{recursive:true});
  const store = new Store(dbPath);
  const creationRates = new Map();
  const server = createServer(async(req,res) => {
    const json=(status,body)=>{ res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}); res.end(JSON.stringify(body)); };
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const path = new URL(req.url,'http://local').pathname;
      if(path==='/health' && req.method==='GET') return json(200,{ok:true});
      if(path.startsWith('/api/')) {
        if(req.method==='POST' && req.headers.origin) {
          let origin; try { origin = new URL(req.headers.origin); } catch { throw new DomainError('请求来源不正确',403); }
          if(origin.host!==req.headers.host) throw new DomainError('请从本站操作清单',403);
        }
        if(path==='/api/rooms' && req.method==='POST') {
          await readJson(req);
          const ip=req.socket.remoteAddress; const now=Date.now();
          // A bounded, local abuse guard. Real deployments should additionally rate-limit at the proxy.
          for(const [key,entry] of creationRates) if(now-entry.start>900000) creationRates.delete(key);
          const rate=creationRates.get(ip)||{start:now,count:0};
          if(rate.count>=20 || creationRates.size>=10000) throw new DomainError('创建清单有点频繁，稍后再试',429);
          rate.count++; creationRates.set(ip,rate);
          return json(201,store.createRoom());
        }
        const token = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]+)$/)?.[1];
        if(!token) throw new DomainError('请通过专属清单链接访问',401);
        if(path==='/api/state' && req.method==='GET') return json(200,store.get(token));
        if(path==='/api/actions' && req.method==='POST') { const body=await readJson(req); return json(200,store.mutate(token,body.revision,body.action)); }
        if(path==='/api/spins' && req.method==='POST') { const body=await readJson(req); return json(200,store.spin(token,body.revision,body.requestId)); }
        throw new DomainError('没有找到这个操作',404);
      }
      if(!['GET','HEAD'].includes(req.method) || !assets.has(path)) throw new DomainError('这里没有页面哦',404);
      const [file,type] = assets.get(path);
      const content = await readFile(resolve(root,file));
      res.writeHead(200,{'content-type':type,'cache-control':'no-cache','content-length':content.length});
      res.end(req.method==='HEAD'?undefined:content);
    } catch(error) {
      if(!res.headersSent) json(error.status||500,{error:error.status?error.message:'小铺暂时开了个小差，请稍后再试'});
      if(!error.status) console.error(error);
    }
  });
  server.requestTimeout=15000; server.headersTimeout=10000;
  return {server,store};
}
if(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {server,store} = createApplication();
  const port = Number(process.env.PORT || 4173);
  server.listen(port,process.env.HOST || '127.0.0.1',()=>console.log(`Love in a Spin is ready at http://localhost:${port}`));
  const stop = () => server.close(()=>{store.close();process.exit(0);});
  process.on('SIGINT',stop); process.on('SIGTERM',stop);
}
