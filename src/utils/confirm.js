import { reactive } from 'vue';

/**
 * 全局确认弹窗（Promise 化）
 *
 * 用法：
 *   const choice = await confirmDialog({
 *     title: t('删除重复事件'),
 *     message: t('请选择操作范围'),
 *     buttons: [
 *       { text: t('仅删除当前事件'), variant: 'secondary', value: 'single' },
 *       { text: t('删除所有重复事件'), variant: 'danger', value: 'all' },
 *     ],
 *   });
 *   if (choice === null) return;   // 点遮罩 / Esc = 取消
 *
 * buttons[].variant：'secondary'（默认）| 'danger'
 * buttons[].value  ：点击该按钮时 resolve 的值，缺省为 true
 */
export const confirmState = reactive({
  show: false,
  title: '',
  message: '',
  icon: 'delete',
  buttons: [],
  resolve: null,
});

export function confirmDialog({
  title,
  message = '',
  icon = 'delete',
  buttons = [],
}) {
  return new Promise((resolve) => {
    // 已有弹窗在等待时，先以「取消」结算，避免 Promise 悬挂
    if (confirmState.show && confirmState.resolve) {
      const prev = confirmState.resolve;
      confirmState.resolve = null;
      prev(null);
    }
    confirmState.title = title;
    confirmState.message = message;
    confirmState.icon = icon;
    confirmState.buttons = buttons;
    confirmState.resolve = resolve;
    confirmState.show = true;
  });
}

function settle(value) {
  if (!confirmState.show) return;
  const resolve = confirmState.resolve;
  confirmState.show = false;
  confirmState.resolve = null;
  confirmState.buttons = [];
  resolve?.(value);
}

/** 点击某个按钮 */
export function chooseConfirm(value) {
  settle(value === undefined ? true : value);
}

/** Esc / 点遮罩 / 关闭 → 取消 */
export function cancelConfirm() {
  settle(null);
}
