-- 迁移脚本：为 todos 表添加 skip_holidays 字段
ALTER TABLE todos ADD COLUMN skip_holidays INTEGER DEFAULT 0;
