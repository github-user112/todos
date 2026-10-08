/**
 * 全局 loading 计数 与 确认弹窗 Promise 契约测试
 * ------------------------------------------------------------
 *   1. loading：并发请求只在全部结束时关闭，计数不为负；
 *   2. confirmDialog：按钮 resolve 值、Esc/遮罩取消为 null、
 *      默认按钮值为 true、弹窗重入时旧 Promise 以 null 结算（不悬挂）。
 *
 * 运行：npm test
 */
import './helpers/env.mjs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loading, setLoading } from '../src/utils/loading.js';
import {
  confirmState,
  confirmDialog,
  chooseConfirm,
  cancelConfirm,
} from '../src/utils/confirm.js';

describe('loading 计数', () => {
  it('初始为关闭', () => {
    assert.equal(loading.value, false);
  });

  it('单请求：开 → 关', () => {
    setLoading(true);
    assert.equal(loading.value, true);
    setLoading(false);
    assert.equal(loading.value, false);
  });

  it('并发请求：最后一个结束才关闭（只增不减的计数语义）', () => {
    setLoading(true);
    setLoading(true);
    setLoading(true);
    setLoading(true);
    setLoading(true);
    assert.equal(loading.value, true);
    setLoading(false);
    assert.equal(loading.value, true);
    setLoading(false);
    assert.equal(loading.value, true);
    setLoading(false);
    assert.equal(loading.value, true);
    setLoading(false);
    assert.equal(loading.value, true);
    setLoading(false);
    assert.equal(loading.value, false);
  });

  it('多余的结束不会让状态/计数变负', () => {
    setLoading(false);
    setLoading(false);
    assert.equal(loading.value, false);
    // 计数已被钳到 0：再发起一次能正常亮起
    setLoading(true);
    assert.equal(loading.value, true);
    setLoading(false);
    assert.equal(loading.value, false);
  });
});

describe('confirmDialog', () => {
  it('打开后写入标题/文案/按钮', async () => {
    const p = confirmDialog({
      title: '删除待办',
      message: '不可撤销',
      buttons: [
        { text: '取消', variant: 'secondary', value: false },
        { text: '删除', variant: 'danger', value: true },
      ],
    });
    assert.equal(confirmState.show, true);
    assert.equal(confirmState.title, '删除待办');
    assert.equal(confirmState.message, '不可撤销');
    assert.equal(confirmState.icon, 'delete');
    assert.equal(confirmState.buttons.length, 2);
    chooseConfirm(true);
    assert.equal(await p, true);
  });

  it('结算后隐藏并清空按钮', async () => {
    const p = confirmDialog({ title: 't', buttons: [{ text: 'ok' }] });
    chooseConfirm('value');
    assert.equal(await p, 'value');
    assert.equal(confirmState.show, false);
    assert.deepEqual(confirmState.buttons, []);
    assert.equal(confirmState.resolve, null);
  });

  it('未指定 value 的按钮默认 resolve true', async () => {
    const p = confirmDialog({ title: 't', buttons: [{ text: 'ok' }] });
    chooseConfirm(undefined);
    assert.equal(await p, true);
  });

  it('Esc / 点遮罩 = null（取消不执行任何动作）', async () => {
    const p = confirmDialog({ title: 't' });
    cancelConfirm();
    assert.equal(await p, null);
    assert.equal(confirmState.show, false);
  });

  it('重复取消不会二次结算', async () => {
    const p = confirmDialog({ title: 't' });
    cancelConfirm();
    cancelConfirm(); // 第二次是 no-op，不应抛错
    assert.equal(await p, null);
  });

  it('未打开弹窗时点击按钮是 no-op', () => {
    assert.equal(confirmState.show, false);
    chooseConfirm('x');
    cancelConfirm();
    assert.equal(confirmState.show, false);
  });

  it('弹窗重入时旧 Promise 以 null 结算（不会悬挂）', async () => {
    const p1 = confirmDialog({ title: 'first' });
    const p2 = confirmDialog({ title: 'second' });
    assert.equal(await p1, null, '第一个 Promise 必须结算');
    assert.equal(confirmState.title, 'second');
    assert.equal(confirmState.show, true);
    chooseConfirm('ok');
    assert.equal(await p2, 'ok');
  });
});
