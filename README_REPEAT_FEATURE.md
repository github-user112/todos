# Calendar App - 自定义间隔重复功能

## 功能概述

本次更新为Calendar App添加了强大的自定义间隔重复功能，支持所有重复类型的灵活间隔设置。

### 新增功能

- ✅ **自定义间隔重复**: 支持每N天、每N周、每N个月、每N年的重复设置
- ✅ **直观的用户界面**: 重新设计的重复设置界面，支持间隔输入
- ✅ **实时预览**: 显示重复事件的下次出现日期
- ✅ **输入验证**: 智能的间隔值验证和范围限制
- ✅ **向后兼容**: 完全兼容现有数据，无需手动迁移

## 支持的重复类型和间隔范围

| 重复类型 | 间隔范围 | 示例 |
|---------|---------|------|
| 每天 | 1-365天 | 每3天、每周工作日 |
| 每周 | 1-52周 | 每2周、每月第一周 |
| 每月 | 1-12个月 | 每2个月、每季度 |
| 每年 | 1-10年 | 每2年、每5年 |

## 技术架构

### 前端更新

#### 1. 组件架构
```
src/components/
├── add-todo-popup.vue     # 重构为支持间隔输入的界面
├── RepeatPreview.vue      # 新增预览组件
├── CalendarContainer.vue  # 更新重复逻辑计算
└── ...
```

#### 2. 工具函数
```
src/utils/
├── repeatUtils.js         # 新增统一重复计算逻辑
├── dateUtils.js          # 现有日期工具函数
└── ...
```

#### 3. 核心算法
- `shouldShowRepeatingTodo()`: 统一的重复事件显示判断
- `getNextRepeatDates()`: 获取下次重复日期
- `validateRepeatInterval()`: 间隔值验证

### 后端更新

#### 1. 数据库架构
```sql
-- 新增字段
ALTER TABLE todos ADD COLUMN repeat_interval INTEGER DEFAULT 1;

-- 新增索引
CREATE INDEX idx_todos_repeat_type_interval ON todos (repeat_type, repeat_interval);
```

#### 2. API更新
- 创建待办事项API支持`repeatInterval`参数
- 查询优化，包含间隔信息排序
- 输入验证，确保间隔值在有效范围内

## 安装和部署

### 1. 数据库迁移

运行以下SQL脚本进行数据库迁移：

```sql
-- 执行 migration.sql
-- 为现有数据库添加repeat_interval字段
ALTER TABLE todos ADD COLUMN repeat_interval INTEGER DEFAULT 1;

-- 为现有数据设置默认间隔值
UPDATE todos 
SET repeat_interval = 1 
WHERE repeat_interval IS NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_todos_repeat_type_interval 
ON todos (repeat_type, repeat_interval);
```

### 2. 前端部署

```bash
# 安装依赖
npm install

# 开发环境运行
npm run dev

# 生产环境构建
npm run build
```

### 3. 后端部署

使用Cloudflare Workers部署后端：

```bash
# 部署到Cloudflare Workers
wrangler deploy
```

## 使用指南

### 1. 创建重复事件

1. 点击日历中的任意日期
2. 在弹出的对话框中输入待办事项内容
3. 选择重复类型（每天/每周/每月/每年）
4. 设置间隔值（如：每2天、每3周等）
5. 可选择显示预览查看重复日期
6. 点击保存

### 2. 间隔设置说明

- **每天重复**: 间隔1-365天，默认为1（每天）
- **每周重复**: 间隔1-52周，默认为1（每周）
- **每月重复**: 间隔1-12个月，默认为1（每月）
- **每年重复**: 间隔1-10年，默认为1（每年）

### 3. 特殊情况处理

- **月末日期**: 如1月31日每月重复，在2月会自动调整为2月29/28日
- **闰年处理**: 2月29日在非闰年会调整为2月28日显示
- **跨年计算**: 支持跨年的重复事件计算

## 测试

### 1. 功能测试

运行测试套件验证功能：

```bash
# 在浏览器中打开测试页面
open test/repeatTest.html

# 或运行Node.js测试
node test/repeatFunctionTest.js
```

### 2. 向后兼容性测试

```bash
# 运行向后兼容性测试
node test/backwardCompatibilityTest.js
```

### 3. 测试覆盖

- ✅ 所有重复类型的间隔计算
- ✅ 边界值测试（最小/最大间隔）
- ✅ 特殊日期处理（月末、闰年）
- ✅ 输入验证和错误处理
- ✅ 向后兼容性验证

## 向后兼容性

### 保证措施

1. **数据兼容**: 现有数据自动获得默认间隔值1
2. **API兼容**: 所有现有API调用保持不变
3. **行为兼容**: 现有重复事件行为完全一致
4. **渐进增强**: 新功能不影响现有功能使用

### 迁移策略

- **零停机迁移**: 数据库迁移不影响现有数据
- **默认值策略**: 新字段使用合理默认值
- **渐进部署**: 可以逐步启用新功能

## 性能优化

### 1. 数据库优化
- 新增索引优化重复事件查询
- 查询结果按重复类型和间隔排序

### 2. 前端优化
- 组件懒加载预览功能
- 输入防抖避免频繁验证
- 智能缓存重复计算结果

### 3. 算法优化
- 高效的日期计算算法
- 最小化重复日期生成开销

## 常见问题

### Q: 现有的重复事件会受影响吗？
A: 不会。所有现有重复事件会自动获得间隔值1，行为保持完全一致。

### Q: 间隔值的限制是什么？
A: 每种重复类型都有合理的上限：每天最多365天，每周最多52周，每月最多12个月，每年最多10年。

### Q: 如何处理月末日期重复？
A: 系统会智能处理，如1月31日每月重复，在2月会显示为2月的最后一天。

### Q: 是否支持复杂的重复模式？
A: 当前版本支持固定间隔重复。更复杂的模式（如第一个周一、工作日等）可在后续版本中添加。

## 更新日志

### v2.0.0 (当前版本)
- ✅ 添加自定义间隔重复功能
- ✅ 重构用户界面支持间隔输入
- ✅ 新增重复事件预览功能
- ✅ 完善输入验证和错误处理
- ✅ 数据库架构扩展
- ✅ API增强支持间隔参数
- ✅ 全面的测试覆盖

### v1.x.x (之前版本)
- 基础重复功能（每天/每周/每月/每年）
- 日历展示和基本待办事项管理

## 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启Pull Request

## 许可证

本项目遵循MIT许可证 - 查看[LICENSE](LICENSE)文件了解详情。