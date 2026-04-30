<template>
  <!-- 移动端 -->
  <Transition name="drawer-overlay">
    <div
      v-if="show && isMobile"
      class="drawer-overlay"
      @click.self="$emit('close')"
    >
      <Transition name="drawer-slide">
        <div v-if="show" class="mobile-panel">
          <div class="drawer-header">
            <span class="drawer-title">📋 待办列表</span>
            <button class="today-jump-btn" @click="jumpToToday">今天</button>
            <button class="drawer-close" @click="$emit('close')">✕</button>
          </div>
          <div class="drawer-body" ref="scrollBody" @scroll="onScroll">
            <!-- <div class="load-zone" v-if="hasMorePast"></div> -->
            <template v-for="(group, gi) in groupedTodos" :key="'m' + gi">
              <div
                :class="[
                  'section-divider',
                  { 'today-divider': group.isToday || group.isBase },
                ]"
                :ref="
                  (el) => {
                    if (group.isToday) todayEl = el;
                    if (group.isBase) baseEl = el;
                  }
                "
              >
                {{ group.label }}
              </div>
              <div
                v-for="item in group.items"
                :key="item.id + '-' + item.date"
                :class="['todo-row', { completed: item.isCompleted }]"
              >
                <div class="todo-row-left">
                  <span
                    v-if="!group.isToday && !group.isBase"
                    :class="[
                      'todo-date-tag',
                      item.date < todayKey ? 'past' : 'future',
                    ]"
                    >{{ fmtShort(item.date) }}</span
                  >
                  <span class="todo-row-text">{{ item.text }}</span>
                  <span
                    v-if="item.reminder"
                    class="todo-row-reminder"
                    :title="getReminderTooltip(item)"
                    >🔔</span
                  >
                </div>
                <div class="todo-row-actions">
                  <button
                    class="row-action-btn complete"
                    @click="handleComplete(item)"
                    :title="item.isCompleted ? '撤销' : '完成'"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      :stroke="
                        item.isCompleted
                          ? 'var(--success-color)'
                          : 'currentColor'
                      "
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <button
                    class="row-action-btn delete"
                    @click="handleDelete(item)"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path
                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </template>
            <!-- <div class="load-zone" v-if="hasMoreFuture"></div> -->
            <div v-if="!groupedTodos.length" class="empty-state">
              <div class="empty-icon">🎉</div>
              <div class="empty-text">暂无待办事项</div>
            </div>
          </div>
          <div class="drawer-footer">
            <span class="todo-summary">共 {{ totalCount }} 项待办</span>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>

  <!-- PC 端 -->
  <Transition name="pc-slide">
    <div v-if="show && !isMobile" class="pc-panel">
      <div class="drawer-header">
        <span class="drawer-title">📋 待办列表</span>
        <button class="today-jump-btn" @click="jumpToToday">今天</button>
        <button class="drawer-close" @click="$emit('close')">✕</button>
      </div>
      <div class="drawer-body" ref="scrollBody2" @scroll="onScroll">
        <!-- <div class="load-zone" v-if="hasMorePast"></div> -->
        <template v-for="(group, gi) in groupedTodos" :key="'p' + gi">
          <div
            :class="[
              'section-divider',
              { 'today-divider': group.isToday || group.isBase },
            ]"
            :ref="
              (el) => {
                if (group.isToday) todayEl = el;
                if (group.isBase) baseEl = el;
              }
            "
          >
            {{ group.label }}
          </div>
          <div
            v-for="item in group.items"
            :key="item.id + 'p-' + item.date"
            :class="['todo-row', { completed: item.isCompleted }]"
          >
            <div class="todo-row-left">
              <span
                v-if="!group.isToday && !group.isBase"
                :class="[
                  'todo-date-tag',
                  item.date < todayKey ? 'past' : 'future',
                ]"
                >{{ fmtShort(item.date) }}</span
              >
              <span class="todo-row-text">{{ item.text }}</span>
              <span
                v-if="item.reminder"
                class="todo-row-reminder"
                :title="getReminderTooltip(item)"
                >🔔</span
              >
            </div>
            <div class="todo-row-actions">
              <button
                class="row-action-btn complete"
                @click="handleComplete(item)"
                :title="item.isCompleted ? '撤销' : '完成'"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  :stroke="
                    item.isCompleted ? 'var(--success-color)' : 'currentColor'
                  "
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button class="row-action-btn delete" @click="handleDelete(item)">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path
                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  />
                </svg>
              </button>
            </div>
          </div>
        </template>
        <!-- <div class="load-zone" v-if="hasMoreFuture"></div> -->
        <div v-if="!groupedTodos.length" class="empty-state">
          <div class="empty-icon">🎉</div>
          <div class="empty-text">暂无待办事项</div>
        </div>
      </div>
      <div class="drawer-footer">
        <span class="todo-summary">共 {{ totalCount }} 项待办</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useDialog, useMessage } from 'naive-ui';
import { formatDate } from '../utils/dateUtils';
import { shouldShowRepeatingTodo } from '../utils/repeatUtils';
import { formatReminderDesc } from '../utils/reminderManager';

const props = defineProps({
  show: { type: Boolean, required: true },
  todos: { type: Array, required: true },
  completedInstances: { type: Array, required: true },
  deletedInstances: { type: Array, required: true },
  selectedDate: { type: String, default: '' },
});

const emit = defineEmits(['close', 'complete-todo', 'delete-todo']);
const dialog = useDialog();
const message = useMessage();

const scrollBody = ref(null);
const scrollBody2 = ref(null);
const todayEl = ref(null);
const baseEl = ref(null);
const isMobile = ref(window.innerWidth <= 768);
const onResize = () => {
  isMobile.value = window.innerWidth <= 768;
};
onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));

const PAGE_SIZE = 15;
const pastOffset = ref(0);
const futureOffset = ref(PAGE_SIZE);
const loading = ref(false);

const todayKey = computed(() => formatDate(new Date()));
const baseDate = computed(() => props.selectedDate || todayKey.value);

const todayStr = computed(() => {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日`;
});

function parseLocalDate(str) {
  const p = str.split('-');
  return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
}

function generateTodosInRange(startDate, endDate) {
  const result = [];
  const seen = new Set();
  const rangeStart = parseLocalDate(startDate);
  const rangeEnd = parseLocalDate(endDate);
  props.todos.forEach((todo) => {
    if (todo.completed) return;
    const todoDate = parseLocalDate(todo.date);
    for (
      let d = new Date(rangeStart);
      d <= rangeEnd;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = formatDate(d);
      const key = `${todo.id}-${dateStr}`;
      if (seen.has(key)) continue;
      if (isInstanceDeleted(todo.id, dateStr)) continue;
      let match = false;
      if (todo.date === dateStr) {
        match = true;
      } else if (todo.repeat_type && todo.repeat_type !== 'none') {
        const interval = todo.repeat_interval || 1;
        match = shouldShowRepeatingTodo(
          todoDate,
          parseLocalDate(dateStr),
          todo.repeat_type,
          interval,
          todo.end_date ? parseLocalDate(todo.end_date) : null,
        );
      }
      if (match) {
        seen.add(key);
        result.push({
          ...todo,
          date: dateStr,
          isCompleted: isInstanceCompleted(todo.id, dateStr),
        });
      }
    }
  });
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

const visibleRange = computed(() => {
  const base = parseLocalDate(baseDate.value);
  const start = new Date(base);
  start.setDate(start.getDate() - pastOffset.value);
  const end = new Date(base);
  end.setDate(end.getDate() + futureOffset.value);
  return { start: formatDate(start), end: formatDate(end) };
});

const allInRange = computed(() =>
  generateTodosInRange(visibleRange.value.start, visibleRange.value.end),
);
const hasMorePast = computed(() => pastOffset.value < 365);
const hasMoreFuture = computed(() => futureOffset.value < 365);
const totalCount = computed(
  () =>
    generateTodosInRange(
      formatDate(new Date(Date.now() - 365 * 86400000)),
      formatDate(new Date(Date.now() + 365 * 86400000)),
    ).length,
);

const groupedTodos = computed(() => {
  const groups = [];
  const map = new Map();
  allInRange.value.forEach((item) => {
    if (!map.has(item.date)) map.set(item.date, []);
    map.get(item.date).push(item);
  });
  for (const [date, items] of map) {
    const isToday = date === todayKey.value;
    const isBase = date === baseDate.value && !isToday;
    let label;
    if (isToday) {
      label = `🌟 今天 ${todayStr.value}`;
    } else if (isBase) {
      const p = date.split('-');
      label = `📍 ${parseInt(p[1])}月${parseInt(p[2])}日`;
    } else {
      const p = date.split('-');
      label = `${parseInt(p[1])}月${parseInt(p[2])}日`;
    }
    groups.push({ date, label, items, isToday, isBase });
  }
  return groups;
});

function isInstanceCompleted(todoId, dateStr) {
  return props.completedInstances.some(
    (i) => i.todo_id === todoId && i.date === dateStr,
  );
}
function isInstanceDeleted(todoId, dateStr) {
  return props.deletedInstances.some(
    (i) => i.todo_id === todoId && i.date === dateStr,
  );
}
function fmtShort(dateStr) {
  const p = dateStr.split('-');
  return parseInt(p[1]) + '/' + parseInt(p[2]);
}

function getReminderTooltip(item) {
  const todoTime = item.todo_time || item.todoTime || '09:00';
  const reminderDesc = formatReminderDesc(item.reminder);
  return `${todoTime} ${reminderDesc}提醒`;
}

function handleComplete(item) {
  emit('complete-todo', {
    todoId: item.id,
    date: item.date,
    allInstances: false,
  });
}

function handleDelete(item) {
  const isRepeat = item.repeat_type && item.repeat_type !== 'none';
  if (isRepeat) {
    dialog.warning({
      title: '删除重复事件',
      content: `确定要删除「${item.text}」吗？请选择删除范围：`,
      positiveText: '删除所有重复事件',
      negativeText: '仅删除当前事件',
      onPositiveClick: () => {
        emit('delete-todo', {
          todoId: item.id,
          date: item.date,
          allInstances: true,
        });
        message.success('已删除所有重复事件');
      },
      onNegativeClick: () => {
        emit('delete-todo', {
          todoId: item.id,
          date: item.date,
          allInstances: false,
        });
        message.success('已删除当前事件');
      },
    });
  } else {
    dialog.warning({
      title: '确认删除',
      content: `确定要删除「${item.text}」吗？此操作不可撤销。`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: () => {
        emit('delete-todo', {
          todoId: item.id,
          date: item.date,
          allInstances: false,
        });
        message.success('已删除');
      },
    });
  }
}

let scrollTimer = null;
function onScroll(e) {
  if (loading.value) return;
  const el = e.target;
  if (el.scrollTop <= 60 && hasMorePast.value) {
    loading.value = true;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const oldH = el.scrollHeight;
      pastOffset.value += PAGE_SIZE;
      nextTick(() => {
        el.scrollTop = el.scrollHeight - oldH + el.scrollTop;
        loading.value = false;
      });
    }, 100);
  }
  if (
    el.scrollHeight - el.scrollTop - el.clientHeight <= 60 &&
    hasMoreFuture.value
  ) {
    loading.value = true;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      futureOffset.value += PAGE_SIZE;
      nextTick(() => {
        loading.value = false;
      });
    }, 100);
  }
}

function jumpToToday() {
  pastOffset.value = 0;
  futureOffset.value = PAGE_SIZE;
  nextTick(() => {
    if (todayEl.value)
      todayEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

async function scrollToBase() {
  await nextTick();
  setTimeout(() => {
    if (baseEl.value) {
      baseEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (todayEl.value) {
      todayEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 300);
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      pastOffset.value = 0;
      futureOffset.value = PAGE_SIZE;
      scrollToBase();
    }
  },
);
watch(
  () => props.selectedDate,
  () => {
    if (props.show) {
      pastOffset.value = 0;
      futureOffset.value = PAGE_SIZE;
      scrollToBase();
    }
  },
);

defineExpose({ isOpen: computed(() => props.show) });
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
}
.mobile-panel {
  width: 100%;
  height: 100%;
  background: var(--card-background);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pc-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 340px;
  background: var(--card-background);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1000;
}

.drawer-header {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  gap: 8px;
}
.drawer-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
}
.today-jump-btn {
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  background: var(--button-primary-bg);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.today-jump-btn:active {
  background: var(--button-primary-hover-bg);
  transform: scale(0.95);
}
.drawer-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.95rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.drawer-close:hover {
  background: var(--hover-color);
}
.drawer-body {
  flex: 1;
  overflow-y: scroll;
  padding: 10px 12px;
  -webkit-overflow-scrolling: touch;
}
.drawer-footer {
  padding: 10px 18px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}
.todo-summary {
  font-size: 0.78rem;
  color: var(--text-secondary);
}
.load-zone {
  text-align: center;
  padding: 12px;
}

.section-divider {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  padding: 10px 8px 6px;
  letter-spacing: 0.05em;
}
.today-divider {
  color: var(--primary-color);
}

.todo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  margin: 2px 0;
  border-radius: 10px;
  background: var(--todo-item-bg);
  border-left: 3px solid var(--todo-item-border-left);
  transition: background 0.15s;
  cursor: default;
}
.todo-row:hover {
  background: var(--todo-item-hover-bg);
}
.todo-row.completed {
  border-left-color: var(--todo-item-completed-border-left);
  background: var(--todo-item-completed-bg);
}
.todo-row.completed .todo-row-text {
  text-decoration: line-through;
  color: var(--todo-item-completed-text);
}
.todo-row-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.todo-date-tag {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 6px;
  line-height: 1.3;
}
.todo-date-tag.past {
  background: var(--calendar-day-holiday-rest-bg);
  color: var(--danger-color);
}
.todo-date-tag.future {
  background: var(--primary-light);
  color: var(--primary-color);
}
.todo-row-text {
  font-size: 0.85rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.todo-row-reminder {
  font-size: 0.7rem;
  flex-shrink: 0;
  opacity: 0.6;
  cursor: help;
}
.todo-row-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 8px;
}
.row-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 0.15s,
    background 0.15s;
}
.row-action-btn:hover {
  background: var(--hover-color);
}
.row-action-btn.complete:hover {
  color: var(--success-color);
}
.row-action-btn.delete:hover {
  color: var(--danger-color);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
}
.empty-icon {
  font-size: 2.5rem;
}
.empty-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.drawer-overlay-enter-active,
.drawer-overlay-leave-active {
  transition: opacity 0.3s ease;
}
.drawer-overlay-enter-from,
.drawer-overlay-leave-to {
  opacity: 0;
}
.drawer-slide-enter-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}
.pc-slide-enter-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.pc-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.pc-slide-enter-from,
.pc-slide-leave-to {
  transform: translateX(100%);
}
</style>
