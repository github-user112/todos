import { ref } from 'vue'

export const activeReminders = ref([])
let keyCounter = 0

export function addReminder({ todo, dateStr, timeDesc, todoTime, reminderDesc }) {
  const key = `reminder-${++keyCounter}`
  activeReminders.value.push({ key, text: todo.text, timeDesc, todoTime, reminderDesc, dateStr })
  setTimeout(() => dismissReminder(key), 15000)
}

export function dismissReminder(key) {
  const idx = activeReminders.value.findIndex(r => r.key === key)
  if (idx >= 0) activeReminders.value.splice(idx, 1)
}
