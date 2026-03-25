-- 数据迁移：为现有数据库添加end_date字段
-- 这个文件用于迁移现有的数据库结构

-- 为todos表添加结束日期字段
-- 使用IGNORE关键字来避免重复添加列的错误
ALTER TABLE todos ADD COLUMN end_date TEXT DEFAULT '2039-12-31';

-- 验证迁移结果
-- SELECT COUNT(*) as total_todos FROM todos;
-- SELECT COUNT(*) as todos_with_end_date FROM todos WHERE end_date IS NOT NULL;