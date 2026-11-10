import { DomainError, validateItem, MAX_WISHES } from './validation.js';

const invalid=()=>{throw new DomainError('备份格式不正确，请选择从小铺导出的 JSON 文件');};
export async function readSnapshotFile(file){
  if(!file||file.size>16*1024*1024)throw new DomainError('备份文件太大，请选择小铺导出的备份');
  let parsed;try{parsed=JSON.parse(await file.text());}catch{invalid();}
  return validateSnapshot(parsed);
}
function id(value){if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(value))invalid();return value;}
function item(value){
  const result={id:id(value?.id),...validateItem(value)};
  for(const key of ['recentOrder','recentTie'])if(value[key]!=null){
    if(!Number.isSafeInteger(value[key])||Math.abs(value[key])>1e12)invalid();
    result[key]=value[key];
  }
  return result;
}
export function validateSnapshot(input){
  const source=input?.state??input;
  if(!source||!Array.isArray(source.items)||source.items.length>MAX_WISHES||!Array.isArray(source.history)||source.history.length>100)invalid();
  const items=source.items.map(item);
  if(new Set(items.map(i=>i.id)).size!==items.length)invalid();
  const history=source.history.map(entry=>{
    if(!entry||typeof entry.at!=='string'||entry.at.length>40||!Number.isFinite(Date.parse(entry.at))||typeof entry.redeemed!=='boolean')invalid();
    const result={id:id(entry.id),item:item(entry.item),at:entry.at,redeemed:entry.redeemed};
    if(entry.requestId!=null){if(typeof entry.requestId!=='string'||entry.requestId.length<8||entry.requestId.length>80)invalid();result.requestId=entry.requestId;}
    if(entry.items!=null){
      if(!Array.isArray(entry.items)||entry.items.length<1||entry.items.length>MAX_WISHES)invalid();
      result.items=entry.items.map(item);
      if(entry.count!==result.items.length||!Number.isInteger(entry.index)||entry.index<0||entry.index>=entry.count||result.items[entry.index].id!==result.item.id)invalid();
      result.count=entry.count;result.index=entry.index;
    }
    return result;
  });
  if(new Set(history.map(e=>e.id)).size!==history.length)invalid();
  return {items,history};
}
