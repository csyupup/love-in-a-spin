import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DomainError, chooseIndex, validateItem } from './domain.mjs';

const seeds = [
  ['一杯快乐奶茶','你最爱的口味，今天我请客','🧋','likes',true],
  ['一顿热乎火锅','一起把喜欢的菜都点一遍','🍲','likes',true],
  ['专属按摩券','肩颈放松 20 分钟，随叫随到','💆🏻‍♀️','rewards',true],
  ['一束小花花','让普通的一天也开出花来','💐','gifts',true],
  ['约会你来定','时间、地点和安排，全部听你的','🎬','rewards',true],
  ['神秘小礼物','保留一点点未知的快乐','🎁','gifts',true],
  ['一起吃甜品','生活有点甜，因为有你','🍰','likes',false],
  ['一个长长的拥抱','不计时，抱到你满意为止','🫂','rewards',false],
  ['可爱小玩偶','替我陪在你身边的小伙伴','🧸','gifts',false],
];
const hash = token => createHash('sha256').update(token).digest('hex');
export class Store {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS rooms (token_hash TEXT PRIMARY KEY, state TEXT NOT NULL)');
  }
  close() { this.db.close(); }
  createRoom() {
    const token = randomBytes(32).toString('base64url');
    const state = { revision:0, items:seeds.map(([title,note,emoji,category,selected]) => ({id:randomUUID(),title,note,emoji,category,selected})), history:[] };
    this.db.prepare('INSERT INTO rooms (token_hash,state) VALUES (?,?)').run(hash(token),JSON.stringify(state));
    return { token, state };
  }
  get(token) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new DomainError('这份清单链接不存在，请检查完整链接',404);
    const row = this.db.prepare('SELECT state FROM rooms WHERE token_hash=?').get(hash(token));
    if (!row) throw new DomainError('这份清单链接不存在，请检查完整链接',404);
    return JSON.parse(row.state);
  }
  write(token,state,revision) {
    const next = { ...state, revision:revision + 1 };
    const update = this.db.prepare("UPDATE rooms SET state=? WHERE token_hash=? AND json_extract(state,'$.revision')=?").run(JSON.stringify(next),hash(token),revision);
    if (!update.changes) throw new DomainError('清单有新的变化，已为你刷新，请再试一次',409);
    return next;
  }
  check(state,revision) {
    if (!Number.isInteger(revision) || state.revision !== revision) throw new DomainError('清单有新的变化，已为你刷新，请再试一次',409);
  }
  mutate(token,revision,action) {
    const state = this.get(token); this.check(state,revision);
    if (!action || typeof action !== 'object') throw new DomainError('操作不正确');
    switch(action.type) {
      case 'add': {
        if (state.items.length >= 32) throw new DomainError('最多收藏 32 个小惊喜，先整理一下吧');
        state.items.push({id:randomUUID(),...validateItem(action.item)}); break;
      }
      case 'edit': {
        const index = state.items.findIndex(item => item.id === action.id);
        if (index < 0) throw new DomainError('这份小惊喜已被删除',404);
        state.items[index] = {id:action.id,...validateItem(action.item)}; break;
      }
      case 'delete': {
        if (!state.items.some(item => item.id === action.id)) throw new DomainError('这份小惊喜已被删除',404);
        state.items = state.items.filter(item => item.id !== action.id); break;
      }
      case 'select': {
        if (!Array.isArray(action.ids) || action.ids.some(id => !state.items.some(item => item.id === id))) throw new DomainError('选择中有不存在的小惊喜');
        const ids = new Set(action.ids); state.items.forEach(item => { item.selected = ids.has(item.id); }); break;
      }
      case 'redeem': {
        const entry = state.history.find(entry => entry.id === action.id);
        if (!entry) throw new DomainError('这条记录不存在',404);
        entry.redeemed = !entry.redeemed; break;
      }
      default: throw new DomainError('暂不支持这个操作');
    }
    return this.write(token,state,revision);
  }
  spin(token,revision,requestId) {
    const state = this.get(token);
    if (typeof requestId !== 'string' || requestId.length < 8 || requestId.length > 80) throw new DomainError('抽取编号不正确');
    const previous = state.history.find(entry => entry.requestId === requestId);
    if (previous) return {state,result:previous};
    this.check(state,revision);
    const items = state.items.filter(item => item.selected);
    const index = chooseIndex(items.length);
    const result = {id:randomUUID(),requestId,item:{...items[index]},index,count:items.length,items:items.map(item => ({...item})),at:new Date().toISOString(),redeemed:false};
    state.history.unshift(result); state.history = state.history.slice(0,100);
    return {state:this.write(token,state,revision),result};
  }
}
