import { DomainError, validateItem } from './validation.js';

export function uniformIndex(count,source=globalThis.crypto) {
  if(!Number.isInteger(count)||count<1||count>32)throw new DomainError('请先选择 1–32 个小惊喜');
  // Reject the incomplete tail so each sector receives exactly the same number of samples.
  const limit=0x100000000-(0x100000000%count);
  const sample=new Uint32Array(1);
  do {source.getRandomValues(sample);} while(sample[0]>=limit);
  return sample[0]%count;
}
const copy=value=>structuredClone(value);
export class BrowserStore {
  constructor({storage={getItem:key=>globalThis.localStorage.getItem(key),setItem:(key,value)=>globalThis.localStorage.setItem(key,value)},key=`love-in-a-spin:local:v1:${new URL('./',import.meta.url).pathname}`,locks=globalThis.navigator?.locks,crypto=globalThis.crypto}={}) {
    this.storage=storage;this.key=key;this.locks=locks;this.crypto=crypto;
  }
  exclusive(action) {
    if(!this.locks?.request)return Promise.reject(new DomainError('当前浏览器版本不支持安全保存，请使用新版 Safari、Chrome、Edge 或 Firefox'));
    // Complete the lock callback normally even when validation fails, then rethrow
    // outside it. This also works around runtimes that retain a lock on a sync throw.
    return this.locks.request(this.key,async()=>{
      try {return {value:await action()};} catch(error) {return {error};}
    }).then(result=>{if(result.error)throw result.error;return result.value;});
  }
  get() {
    let raw;
    try {raw=this.storage.getItem(this.key);} catch {throw new DomainError('浏览器无法读取本地存储，请允许此网站保存数据后重试');}
    if(!raw)return null;
    try {
      const saved=JSON.parse(raw),state=saved.state;
      if(saved.version!==1||!state||!Number.isSafeInteger(state.revision)||state.revision<0||!Array.isArray(state.items)||state.items.length>32||!Array.isArray(state.history)||state.history.length>100)throw new Error();
      const ids=new Set();
      for(const item of state.items) {
        validateItem(item);
        if(typeof item.id!=='string'||!item.id||ids.has(item.id))throw new Error();
        ids.add(item.id);
      }
      for(const entry of state.history) {
        validateItem(entry.item);
        if(typeof entry.id!=='string'||!Number.isFinite(Date.parse(entry.at))||typeof entry.redeemed!=='boolean')throw new Error();
      }
      return state;
    } catch {throw new DomainError('本机保存的清单格式异常，请先保留浏览器数据，再联系维护者恢复');}
  }
  save(state) {
    try {this.storage.setItem(this.key,JSON.stringify({version:1,state}));}
    catch {throw new DomainError('本机空间不足或浏览器禁止存储，无法保存这次修改');}
    return copy(state);
  }
  initialize(seed) {
    return this.exclusive(()=>{
      const existing=this.get();if(existing)return existing;
      if(!Array.isArray(seed)||seed.length>32)throw new DomainError('初始心愿清单格式不正确');
      const items=seed.map(item=>({id:item.id||this.crypto.randomUUID(),...validateItem({...item,selected:false})}));
      return this.save({revision:0,items,history:[]});
    });
  }
  requireState(revision) {
    const state=this.get();
    if(!state)throw new DomainError('请先加载心愿清单');
    if(!Number.isInteger(revision)||state.revision!==revision)throw new DomainError('本机另一个页面修改了清单，已刷新，请再试一次',409);
    return state;
  }
  mutate(revision,action) {
    return this.exclusive(()=>{
      const state=this.requireState(revision);
      switch(action?.type) {
        case 'add':
          if(state.items.length>=32)throw new DomainError('最多收藏 32 个小惊喜，先整理一下吧');
          state.items.push({id:this.crypto.randomUUID(),...validateItem(action.item)});break;
        case 'edit': {
          const index=state.items.findIndex(item=>item.id===action.id);
          if(index<0)throw new DomainError('这份小惊喜已被删除',404);
          state.items[index]={id:action.id,...validateItem(action.item)};break;
        }
        case 'delete':
          if(!state.items.some(item=>item.id===action.id))throw new DomainError('这份小惊喜已被删除',404);
          state.items=state.items.filter(item=>item.id!==action.id);break;
        case 'select': {
          if(!Array.isArray(action.ids)||action.ids.some(id=>!state.items.some(item=>item.id===id)))throw new DomainError('选择中有不存在的小惊喜');
          const ids=new Set(action.ids);state.items.forEach(item=>{item.selected=ids.has(item.id);});break;
        }
        case 'redeem': {
          const entry=state.history.find(entry=>entry.id===action.id);
          if(!entry)throw new DomainError('这条记录不存在',404);
          entry.redeemed=!entry.redeemed;break;
        }
        case 'reset':state.items.forEach(item=>{item.selected=false;});state.history=[];break;
        default:throw new DomainError('暂不支持这个操作');
      }
      state.revision++;return this.save(state);
    });
  }
  spin(revision,requestId) {
    return this.exclusive(()=>{
      const current=this.get();
      if(typeof requestId!=='string'||requestId.length<8||requestId.length>80)throw new DomainError('抽取编号不正确');
      const previous=current?.history.find(entry=>entry.requestId===requestId);
      if(previous)return {state:current,result:copy(previous)};
      const state=this.requireState(revision),items=state.items.filter(item=>item.selected);
      const index=uniformIndex(items.length,this.crypto);
      const result={id:this.crypto.randomUUID(),requestId,item:copy(items[index]),index,count:items.length,items:copy(items),at:new Date().toISOString(),redeemed:false};
      state.history.unshift(result);state.history=state.history.slice(0,100);state.revision++;
      return {state:this.save(state),result:copy(result)};
    });
  }
}
