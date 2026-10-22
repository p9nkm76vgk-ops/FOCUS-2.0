// v19 (DOM SIMULADO): Rutina por días y Objetivos sin tabla vacía.
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
test.beforeEach(() => { clock.t = new Date(2026, 9, 14, 10, 0).getTime() });
test('v19: rutina agrupa por días con total; Objetivos no pinta tabla vacía', async () => {
  const a = await boot(); const r = a.t.V.rut();
  assert.match(r, /class=rweek/); assert.equal((r.match(/class="rday/g) || []).length, 7);
  assert.doesNotMatch(a.t.V.obj(), /<table/);
});
