import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../public/love-tree/index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../public/love-tree/love.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/love-tree/style.css', import.meta.url), 'utf8');

test('renders three accessible heart-intention buttons', () => {
  assert.match(html, /id="intentions"[^>]*aria-label="三颗心意"/);
  assert.equal((html.match(/class="intention-heart"/g) || []).length, 3);
  for (const label of ['我懂你', '我记得', '我答应']) {
    assert.match(html, new RegExp(`>${label}<`));
  }
  assert.match(html, /aria-controls="intention-note"/);
  assert.match(html, /id="intention-note"[^>]*aria-live="polite"/);
});

test('heart artwork and label beat as one unit', () => {
  assert.equal((html.match(/class="intention-content"/g) || []).length, 3);
  assert.equal((html.match(/src="heart-intention-soft\.png"/g) || []).length, 3);
  assert.match(css, /\.intention-content\s*\{[^}]*animation:\s*intentionBeat/s);
  assert.match(css, /@keyframes intentionBeat[\s\S]*?14%\s*\{\s*transform:\s*scale\(1\.06\)/);
});

test('defines the approved intention copy and expanded-state behavior', () => {
  for (const line of [
    '我懂你的认真、辛苦和偶尔的小情绪，也愿意一直站在你这边。',
    '你随口说过的小事，我都愿意认真记住。',
    '我答应把爱落进每一天，多一点陪伴，多一点体谅，认真走好往后的日子。',
  ]) {
    assert.match(js, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(js, /setAttribute\('aria-expanded', isOpen \? 'false' : String\(button === active\)\)/);
});

test('uses the updated signature', () => {
  assert.match(js, /signature:\s*'—— 闪耀'/);
  assert.doesNotMatch(js, /橙黄橘绿时/);
});

test('centers the desktop intention group on the final tree position', () => {
  assert.match(js, /const desktopTreeCenter = view\.tx \+ \(540 \+ 260\) \* view\.s/);
  assert.match(js, /intentions\.style\.setProperty\('--tree-center-x', `\$\{desktopTreeCenter\}px`\)/);
  assert.match(css, /#intentions\s*\{[^}]*left:\s*var\(--tree-center-x\)[^}]*top:\s*11vh/s);
});
