# 智能日历管家（Todos）

基于 Vue 3 + Vite 的日历待办应用：月历/今日优先双视图、农历与节气、法定节假日调休标注、
重复事项、提醒推送（Webhook）、数据导入导出；点击左上角标题可快速跳转任意月份/年份。
前端为 Vue 3 SFC + Naive UI，API 部署于 Cloudflare Workers（`wrangler`）。

## 开发

```bash
npm install          # 安装依赖（Node >= 20）
npm run dev          # 前端开发服务器（/api 代理到 127.0.0.1:8787）
npm run dev-api      # 本地 Workers API
npm run build        # 生产构建 → dist/
npm run preview      # 预览构建产物
npm test             # 运行单元测试（node:test，零额外依赖）
npm run themes       # 重新生成 src/assets/theme.css
```

## 设计令牌系统「Aurora」

全部视觉由 `src/assets/theme.css` 中的 CSS 自定义属性驱动，
**该文件由 `scripts/build-themes.mjs` 生成，请勿手改**——调整配色请修改脚本后运行
`npm run themes`。

设计约定：

1. **单一强调色派生**：每套主题只声明一个 accent 强调色，
   边框/淡底/悬停/焦点环等均按固定配方从它计算，机制上保证协调；
2. **语义色跨主题恒定**：休息日(休)=红系 · 调休上班(班)=琥珀系 · 完成=绿系；
3. **中性骨架共享**：所有亮色主题共用同一套文字/表面/阴影层级；
4. **深色模式**：`primary-dark` 在暗底上是更亮的强调变体；表面亮度 页面 < 卡片 < 悬停。

内置 19 套主题：极光紫（默认）/ 经典蓝 / 暖橙 / 护眼绿 / 玫瑰粉 / 薰衣草 / 薄荷青 /
琥珀金 / 鎏金黄 / 深色 / 玻璃家族 ×8（glass · ios-glass · liquid-glass ·
ios26-glass · liquid-aurora-glass · fluid-glass · persimmon 霜柿 ·
moonlight 月白 · bamboo 竹青；全部为浅色，深色玻璃变体已下线，
旧深色偏好自动回退到对应浅色玻璃）。

### 玻璃主题规范

八套玻璃家族遵循 Apple Liquid Glass 设计标准（HIG / WWDC25）：

- 克制使用：玻璃只用于头部、抽屉、弹窗等浮动层；
- 中性通透：玻璃面为均匀白雾，色彩仅来自壁纸透射，
  不做彩色描边 / 流光扫过 / 呼吸光环等装饰动效；
- 可读性优先：玻璃上的文字一律实色；动态背景开启时自动提高面板不透明度；
- 每格玻璃：日期格自带镜面高光、透光渐变与弧面边缘
  （`--day-glass-*` 配方，定义于 `src/assets/theme-glass.css` 末段）；
- 壁纸为静态柔焦网格渐变，各主题仅 `--stage-a/b` 与 `--orb-rgb-*` 不同
  （定义于 `src/assets/theme-glass.css`）。

### 节气玻璃三套（霜柿 / 月白 / 竹青）

取景自农历一年的三段风景，壁纸光斑即签名，玻璃面延续中性克制规范：

| 主题键 | 场景 | 强调色 | 壁纸光斑 |
| --- | --- | --- | --- |
| `persimmon-glass` | 🍂 霜降时节压枝的柿子 | 柿橙 `#d9480f` | 柿橙 · 蜜桂黄 · 柿叶绿 |
| `moonlight-glass` | 🌙 中秋前夜庭前月光 | 黛蓝 `#3d52c7` | 夜空蓝 · 月银 · 远山黛 |
| `bamboo-glass` | 🎋 芒种梅雨里的新竹 | 竹青 `#4d7c0f` | 竹绿 · 梅青 · 烟柳 |

三套共享 v3 玻璃表面配方，并与「液态玻璃 26」同款按压回弹动效、
开关玻璃质感与 backdrop-filter 兼容兜底，全家族手感一致。

### 液态玻璃 26（iOS 26 风格）

第四套玻璃家族 `ios26-glass-theme`（选择器键 `ios26-glass`），
在 `src/assets/theme-glass.css` 末尾独立成段，不影响前三套。

## 单元测试

`npm test` 跑 `tests/**/*.test.mjs`（node:test，零额外依赖，`tests/helpers/env.mjs`
统一垫时区与 localStorage）：

| 文件 | 覆盖 |
| --- | --- |
| `design-tokens.test.mjs` | 设计系统核心不变量：颜色工具正确性、语义色跨主题恒定、强调色对比度底线（白字 ≥3:1）、深色模式层级与对比度（≥7:1）、玻璃半透明表面可读性、序列化分组完整性，以及 **theme.css 与生成器输出零漂移**（直接手改生成文件会导致测试失败） |
| `quick-jump.test.mjs` | 左上角快速跳转：年月校验、闰年与月天数、十年区间、跳转时保留原“日”并月末收敛 |
| `date-utils.test.mjs` | `formatDate`、ISO 8601 周数（含跨年周、全年单调性） |
| `repeat-utils.test.mjs` | 重复事件：日/周/月/年 + 间隔、月末与闰日、结束日期、间隔上下界、后续日期、老数据缺省间隔的向后兼容 |
| `repeat-anchor.test.mjs` | 重复待办的锚点日期：本地日期解析、每周几/每月几号/每年几月几日切换、月末与闰日收敛、「重复待办不能早于今天」下限、结束日期校验 |
| `holiday-adjustment.test.mjs` | 工作日/节假日/调休判断与“往前找最近工作日” |
| `i18n.test.mjs` | `t`/`tf`/`tMonth` 行为，以及**翻译完整性**（源码里每个中文 key 必须有英文词条、占位符 `{x}` 中英一致） |
| `loading-confirm.test.mjs` | 全局 loading 并发计数（全部结束才关闭、不为负）、确认弹窗 Promise 契约（含重入不悬挂） |
| `prefs.test.mjs` | 下线主题映射、用户 ID 生成、完成动效偏好、提醒条目增删与自动消散、naive-ui 主题覆盖派生 |
| `almanac-festival.test.mjs` | 24 节气数据与当日节气、弹窗当天只标记一次、传统节日倒计时、每日宜忌与完成反馈 |
| `worker-api.test.mjs` | Workers 路由分发（401/404/400）与待办增删改：用假 D1 断言 SQL 与绑定参数（含编辑待办的 text/repeat/skip_holidays 字段） |

早期的 `test/*.js` 手写脚本（重复事件、节气节日、向后兼容）用例已全部并入上表。

端到端 UI 自测另走 `npm run test:ui`（`scripts/selftest-ui.mjs`，CDP + 无头 chromium）。

## 视觉验收管线（无头截图）

无需打开浏览器即可对任意主题截取整页并做像素级检查：

```bash
npm run dev &        # 启动开发服务器
mkdir -p dist-shots
chromium-browser --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --user-data-dir=$PWD/dist/cp --crash-dumps-dir=/dev/null \
  --host-resolver-rules="MAP cdnjs.cloudflare.com 127.0.0.1, MAP unpkg.com 127.0.0.1" \
  --window-size=1440,900 --virtual-time-budget=15000 \
  --screenshot="$PWD/dist-shots/glass.png" \
  "http://localhost:5173/__preview-theme.html?t=glass"
node scripts/inspect-shot.mjs dist-shots/glass.png   # 按区域采样平均色/亮度
```

- `__preview-theme.html?t=<主题键>&d=1`：桥接页写入 localStorage 后回跳首页，
  主题键见 `calendar-header.vue` 的 `themeOptions`（如 `dark`、`ios-glass`）；
- `host-resolver-rules` 将 CDN 域名指向本地以快速失败，避免外网挂起导致空截图；
- 注意 `dist/` 会被 `vite build` 清空，截图请放 `dist-shots/`（已 gitignore）。

## 目录速览

```
src/
  assets/theme.css         # 设计令牌（生成物）
  assets/theme-glass.css   # 玻璃主题表面处理（手写）
  components/              # 日历格子/头部/网格/抽屉/弹窗等组件
  pages/CalendarPage.vue   # 主页面（含 naive-ui 主题接入）
  utils/naiveTheme.js      # 设计令牌 → naive-ui themeOverrides
scripts/
  build-themes.mjs         # 主题生成器（可导入测试）
  inspect-shot.mjs         # 截图像素采样器
worker/                    # Cloudflare Workers API
tests/                     # node:test 单元测试
```
