import { DomainError } from './validation.js';

export class SharedStore {
  constructor({base=new URL('./',import.meta.url),token=new URLSearchParams(globalThis.location?.hash?.slice(1)||'').get('r'),fetch=globalThis.fetch}={}){
    this.base=new URL(base,import.meta.url);this.token=token;this.fetch=fetch.bind(globalThis);this.shared=true;this.pendingDraw=null;
  }
  async request(path,body){
    if(!/^[A-Za-z0-9_-]{43}$/.test(this.token||''))throw new DomainError('请使用你们的专属清单链接打开小铺');
    let response;
    try{response=await this.fetch(new URL(path,this.base),{method:body?'POST':'GET',headers:{Authorization:`Bearer ${this.token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(12000)});}
    catch{throw new DomainError('暂时连不上小铺，请检查网络后重试；已有数据仍保存在服务器上',503);}
    let data;try{data=await response.json();}catch{throw new DomainError('小铺暂时没有正确响应，请稍后重试',503);}
    if(!response.ok)throw new DomainError(data.error||'暂时无法保存，请重试',response.status);
    return data;
  }
  get(){return this.request('api/state');}
  mutate(revision,action){return action.type==='import'?this.request('api/import',{revision,snapshot:action.snapshot}):this.request('api/actions',{revision,action});}
  async spin(revision,requestId){
    this.pendingDraw??={revision,requestId};
    try{const result=await this.request('api/spins',this.pendingDraw);this.pendingDraw=null;return result;}
    catch(error){if(error.status<500)this.pendingDraw=null;throw error;}
  }
}
