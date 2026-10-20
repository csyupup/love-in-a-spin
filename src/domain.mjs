import { randomInt } from 'node:crypto';
import { DomainError } from '../public/validation.js';
export { DomainError, validateItem } from '../public/validation.js';

export function chooseIndex(count, random = randomInt) {
  if (!Number.isInteger(count) || count < 1 || count > 32) throw new DomainError('请先选择 1–32 个小惊喜');
  return random(count);
}
