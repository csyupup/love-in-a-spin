import { randomInt } from 'node:crypto';

export class DomainError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function chooseIndex(count, random = randomInt) {
  if (!Number.isInteger(count) || count < 1 || count > 32) throw new DomainError('请先选择 1–32 个小惊喜');
  return random(count);
}
export function validateItem(input) {
  if (!input || typeof input !== 'object') throw new DomainError('请填写礼物内容');
  const { category, selected } = input;
  if (typeof input.title !== 'string') throw new DomainError('请给小惊喜起个名字');
  const title = input.title.trim();
  if (!title || [...title].length > 24) throw new DomainError('名称需要 1–24 个字');
  if (!['likes','rewards','gifts'].includes(category)) throw new DomainError('请选择正确的分类');
  if (typeof selected !== 'boolean') throw new DomainError('勾选状态不正确');
  if (input.note != null && typeof input.note !== 'string') throw new DomainError('备注需要是文字');
  if (input.emoji != null && typeof input.emoji !== 'string') throw new DomainError('请选择一个小图标');
  const note = (input.note || '').trim(); const emoji = (input.emoji || '🎁').trim() || '🎁';
  if ([...note].length > 80) throw new DomainError('备注最多 80 个字');
  if ([...emoji].length > 8) throw new DomainError('小图标最多 8 个字符');
  return { title, note, emoji, category, selected };
}
