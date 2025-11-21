-- 待办事项表
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  date TEXT NOT NULL,
  repeat_type TEXT DEFAULT 'none',
  repeat_interval INTEGER DEFAULT 1,
  end_date TEXT,
  completed INTEGER DEFAULT 0,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 已完成实例表（用于重复待办事项）
CREATE TABLE IF NOT EXISTS completed_instances (
  id INTEGER PRIMARY KEY,
  todo_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (todo_id) REFERENCES todos (id) ON DELETE CASCADE
);

-- 已删除实例表（用于重复待办事项）
CREATE TABLE IF NOT EXISTS deleted_instances (
  id INTEGER PRIMARY KEY,
  todo_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (todo_id) REFERENCES todos (id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_todos_user_date ON todos (user_id, date);
CREATE INDEX IF NOT EXISTS idx_todos_repeat_type_interval ON todos (repeat_type, repeat_interval);
CREATE INDEX IF NOT EXISTS idx_completed_instances_user_todo_date ON completed_instances (user_id, todo_id, date);
CREATE INDEX IF NOT EXISTS idx_deleted_instances_user_todo_date ON deleted_instances (user_id, todo_id, date);

