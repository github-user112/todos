-- 用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  animation_type TEXT DEFAULT 'slide-left',
  theme_type TEXT DEFAULT 'default',
  view_mode TEXT DEFAULT 'today-priority',
  show_todo_list INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings (user_id);
