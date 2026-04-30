import { isHoliday, findLastWorkday } from './holidayAdjustment';
import { shouldShowRepeatingTodo } from './repeatUtils';

const NOTIFICATION_TAG_PREFIX = 'todo-reminder-';
const CHECK_INTERVAL = 30 * 1000;
const NOTIFIED_KEY = 'todo_reminder_notified';

let checkTimer = null;
let cleanupTimer = null;
let todosRef = null;
let holidayDataRef = null;
let completedInstancesRef = null;
let deletedInstancesRef = null;
let onInPageReminder = null;

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch {}
  }
  return audioContext;
}

function playReminderSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.15);
    oscillator.frequency.setValueAtTime(1319, ctx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.6);
  } catch {}
}

function getNotifiedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveNotifiedSet(set) {
  try {
    const arr = [...set].slice(-500);
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr));
  } catch {}
}

function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDisplayDate(todo, holidayData) {
  const hasHolidayData = holidayData && Object.keys(holidayData).length > 0;
  const skipHolidays = todo.skip_holidays ?? todo.skipHolidays;

  if (!todo.repeat_type || todo.repeat_type === 'none') {
    if (skipHolidays && hasHolidayData && isHoliday(todo.date, holidayData)) {
      return findLastWorkday(todo.date, holidayData);
    }
    return todo.date;
  }

  return null;
}

function getRepeatingTodoDates(todo, startDate, endDate, holidayData) {
  const hasHolidayData = holidayData && Object.keys(holidayData).length > 0;
  const skipHolidays = todo.skip_holidays ?? todo.skipHolidays;
  const todoDate = new Date(todo.date);
  const interval = todo.repeat_interval || 1;
  const end = todo.end_date ? new Date(todo.end_date) : null;
  const dates = [];

  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const endCheck = new Date(endDate);
  endCheck.setHours(23, 59, 59, 999);

  while (current <= endCheck) {
    const dateStr = formatDateStr(current);

    if (
      shouldShowRepeatingTodo(
        todoDate,
        current,
        todo.repeat_type,
        interval,
        end,
      )
    ) {
      const isHolidayDate =
        skipHolidays && hasHolidayData && isHoliday(dateStr, holidayData);
      if (!isHolidayDate) {
        dates.push(dateStr);
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function isInstanceCompleted(todoId, dateStr, completedInstances) {
  return completedInstances.some(
    (i) => i.todo_id === todoId && i.date === dateStr,
  );
}

function isInstanceDeleted(todoId, dateStr, deletedInstances) {
  return deletedInstances.some(
    (i) => i.todo_id === todoId && i.date === dateStr,
  );
}

async function requestPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function showNotification(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted')
    return;

  try {
    const notification = new Notification(title, {
      body,
      tag,
      icon: '/favicon.ico',
      requireInteraction: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => notification.close(), 10000);
  } catch {}
}

function getTodoTime(todo) {
  return todo.todo_time || todo.todoTime || '09:00';
}

function formatReminderDesc(reminderMinutes) {
  if (reminderMinutes < 60) return `${reminderMinutes}分钟前`;
  if (reminderMinutes < 1440) {
    const hours = Math.floor(reminderMinutes / 60);
    const mins = reminderMinutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟前` : `${hours}小时前`;
  }
  const days = Math.floor(reminderMinutes / 1440);
  const hours = Math.floor((reminderMinutes % 1440) / 60);
  return hours > 0 ? `${days}天${hours}小时前` : `${days}天前`;
}

function checkReminders() {
  if (!todosRef || !todosRef.value) return;

  const todos = todosRef.value;
  const holidayData = holidayDataRef?.value || {};
  const completedInstances = completedInstancesRef?.value || [];
  const deletedInstances = deletedInstancesRef?.value || [];
  const notified = getNotifiedSet();
  let changed = false;

  const now = new Date();
  const todayStr = formatDateStr(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = formatDateStr(tomorrowDate);

  for (const todo of todos) {
    const reminder = todo.reminder ?? 0;
    if (reminder === 0) continue;

    const reminderMinutes = reminder;
    const reminderMs = reminderMinutes * 60 * 1000;

    let datesToCheck = [];

    if (!todo.repeat_type || todo.repeat_type === 'none') {
      const displayDate = getDisplayDate(todo, holidayData);
      if (displayDate) {
        datesToCheck.push(displayDate);
      }
    } else {
      const checkStart = new Date(now);
      checkStart.setDate(checkStart.getDate() - 1);
      const checkEnd = new Date(now);
      checkEnd.setDate(checkEnd.getDate() + 3);
      datesToCheck = getRepeatingTodoDates(
        todo,
        checkStart,
        checkEnd,
        holidayData,
      );
    }

    for (const dateStr of datesToCheck) {
      if (isInstanceDeleted(todo.id, dateStr, deletedInstances)) continue;
      if (isInstanceCompleted(todo.id, dateStr, completedInstances)) continue;

      const todoTime = getTodoTime(todo);
      const todoDateTime = new Date(`${dateStr}T${todoTime}:00`);
      const reminderTime = new Date(todoDateTime.getTime() - reminderMs);
      const diff = reminderTime.getTime() - now.getTime();

      if (diff > -CHECK_INTERVAL && diff <= CHECK_INTERVAL) {
        const notifyKey = `${todo.id}-${dateStr}-${reminderMinutes}`;
        if (!notified.has(notifyKey)) {
          notified.add(notifyKey);
          changed = true;

          const isToday = dateStr === todayStr;
          const isTomorrow = dateStr === tomorrowStr;
          let timeDesc = dateStr;
          if (isToday) timeDesc = '今天';
          else if (isTomorrow) timeDesc = '明天';

          const todoTimeStr = todoTime;
          const reminderDesc = formatReminderDesc(reminderMinutes);

          showNotification(
            `📋 待办提醒`,
            `${timeDesc} ${todoTimeStr}（${reminderDesc}）：${todo.text}`,
            `${NOTIFICATION_TAG_PREFIX}${notifyKey}`,
          );

          playReminderSound();

          if (onInPageReminder) {
            onInPageReminder({
              todo,
              dateStr,
              timeDesc,
              todoTime: todoTimeStr,
              reminderDesc,
            });
          }
        }
      }
    }
  }

  if (changed) {
    saveNotifiedSet(notified);
  }
}

function cleanupOldNotified() {
  const notified = getNotifiedSet();
  if (notified.size < 200) return;

  const now = new Date();
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const cutoffStr = formatDateStr(cutoff);

  const filtered = [...notified].filter((key) => {
    const parts = key.split('-');
    if (parts.length >= 4) {
      const datePart = parts.slice(1, 4).join('-');
      return datePart >= cutoffStr;
    }
    return true;
  });

  saveNotifiedSet(new Set(filtered));
}

export function initReminderManager(
  todos,
  holidayData,
  completedInstances,
  deletedInstances,
  inPageCallback,
) {
  todosRef = todos;
  holidayDataRef = holidayData;
  completedInstancesRef = completedInstances;
  deletedInstancesRef = deletedInstances;
  onInPageReminder = inPageCallback || null;

  requestPermission();

  checkReminders();
  checkTimer = setInterval(checkReminders, CHECK_INTERVAL);

  cleanupTimer = setInterval(cleanupOldNotified, 24 * 60 * 60 * 1000);
}

export function destroyReminderManager() {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
  onInPageReminder = null;
}

export { requestPermission, formatReminderDesc };
