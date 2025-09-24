-- 数据迁移：为现有数据库添加repeat_interval字段
-- 这个文件用于迁移现有的数据库结构

-- 为todos表添加间隔字段（如果不存在）
-- SQLite不支持IF NOT EXISTS for ADD COLUMN，所以使用忽略错误的方式
ALTER TABLE todos ADD COLUMN repeat_interval INTEGER DEFAULT 1;

-- 为现有数据设置默认间隔值
UPDATE todos 
SET repeat_interval = 1 
WHERE repeat_interval IS NULL;

-- 创建新的索引优化查询
CREATE INDEX IF NOT EXISTS idx_todos_repeat_type_interval 
ON todos (repeat_type, repeat_interval);

-- 验证迁移结果
-- SELECT COUNT(*) as total_todos FROM todos;
-- SELECT COUNT(*) as todos_with_interval FROM todos WHERE repeat_interval IS NOT NULL;