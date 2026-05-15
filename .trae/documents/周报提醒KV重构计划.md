# 周报提醒 KV 重构计划

## 需求概述
- 使用 Workers KV 保存周报提醒配置，与 D1 数据库无关
- 创建独立的设置页面（不在日历页面）
- 只有 admin UID (758tvu59bxixb0p811rj2g1743577326022) 才能打开设置页面
- 支持自定义通知内容模板

## 已完成 ✅
- [x] Step 3: worker/handlers/weekly-summary.js 重写（KV + 模板渲染 + Admin UID 检查）
- [x] schema.sql 恢复（移除 weekly_summary 字段）
- [x] wrangler.toml KV namespace 配置

## 待完成

### Step 4: worker/index.js 新增 API 路由
在 worker/index.js 中添加：
- `GET /api/weekly-summary/settings` → `handleGetWeeklySummarySettings`
- `PUT /api/weekly-summary/settings` → `handleUpdateWeeklySummarySettings`
- 移除旧的 `POST /api/weekly-summary/test` 路由（已存在）

### Step 5: 新建 src/pages/SettingsPage.vue
创建独立的设置页面组件：
- 路由路径：`/#/settings`
- Admin UID 访问限制检查
- 周报提醒设置表单：
  - 启用开关 (enabled)
  - 提前天数选择 (days: 1-3)
  - Webhook URL 输入
  - 消息模板编辑 (template)
  - 测试按钮
  - 保存按钮
- 模板变量说明：
  - `{date}` - 日期
  - `{weekday}` - 星期
  - `{week_num}` - 第N个工作日
  - `{total_workdays}` - 总工作日数
  - `{todo_count}` - 待办数量
  - `{todo_list}` - 待办列表

### Step 6: App.vue 添加路由判断
修改 App.vue：
- 根据 hash 判断显示哪个页面
- `/#/settings` → 显示 SettingsPage
- 其他 hash → 显示日历界面
- SettingsPage 需要验证 UID，不是 admin UID 则跳转回日历页

### Step 7: 新建 src/utils/settingsApi.js
创建周报设置 API 调用模块：
- `getWeeklySummarySettings()` - 获取设置
- `updateWeeklySummarySettings(settings)` - 保存设置
- `testWeeklySummary()` - 测试推送

### Step 8: calendar-header.vue 移除周报设置 UI
从设置抽屉中移除：
- "📢 周末提醒" 整个 setting-group (lines 222-269)
- 相关状态变量和函数

### 构建验证
- [ ] 运行 `pnpm build` 确认无编译错误
- [ ] 验证 KV 数据读取/写入正常