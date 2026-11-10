import { randomInt } from 'node:crypto';
import { DomainError, MAX_WISHES } from '../public/validation.js';
export { DomainError, validateItem } from '../public/validation.js';

export function chooseIndex(count, random = randomInt) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_WISHES) throw new DomainError(`请先选择 1–${MAX_WISHES} 个小惊喜`);
  return random(count);
}
