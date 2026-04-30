CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  date TEXT NOT NULL,
  repeat_type TEXT DEFAULT 'none',
  repeat_interval INTEGER DEFAULT 1,
  end_date TEXT DEFAULT '2039-12-31',
  completed INTEGER DEFAULT 0,
  skip_holidays INTEGER DEFAULT 0,
  reminder INTEGER DEFAULT 0,
  todo_time TEXT DEFAULT '09:00',
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS completed_instances (
  id INTEGER PRIMARY KEY,
  todo_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (todo_id) REFERENCES todos (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deleted_instances (
  id INTEGER PRIMARY KEY,
  todo_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (todo_id) REFERENCES todos (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  animation_type TEXT DEFAULT 'slide-left',
  theme_type TEXT DEFAULT 'default',
  view_mode TEXT DEFAULT 'today-priority',
  show_todo_list INTEGER DEFAULT 0,
  webhook_url TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_todos_user_date ON todos (user_id, date);
CREATE INDEX IF NOT EXISTS idx_todos_repeat_type_interval ON todos (repeat_type, repeat_interval);
CREATE INDEX IF NOT EXISTS idx_completed_instances_user_todo_date ON completed_instances (user_id, todo_id, date);
CREATE INDEX IF NOT EXISTS idx_deleted_instances_user_todo_date ON deleted_instances (user_id, todo_id, date);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings (user_id);
