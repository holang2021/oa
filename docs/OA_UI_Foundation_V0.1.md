# HOLANG OA UI Foundation V0.1

> **接收说明（2026-09-30 刘总交付）**
> - 定位：**Candidate / 候选基础规范**，不是 Frozen。
> - 落地纪律：本文件为 OA 前端与原型的**权威视觉基线**；在"三页验证"跑通前，**不得全局重构、不得让 Codex 改全站样式**。
> - 机器可读单一事实源：见同目录 `oa-design-tokens.css`（CSS 变量）与 `oa-design-tokens.json`（结构化），所有页面/原型一律引用这两份，禁止各写各的色值。
> - 三页验证法（见第 20 节）：① 报价列表 ② 报价编辑 ③ 客户详情，三页跑通后再 Freeze → 全局 CSS / Design Tokens。
> - 与既有铁律不冲突：报价单 A4 区"真实 logo 铁律"独立有效（品牌标识，非营销视觉）。
> - ⚠️ **颜色铁律（2026-10-02 锁定）**：OA 颜色一律复用「做网站时定的全局 CSS」`holang-admin/css/style.css` 的 `--color-*` 体系，**禁止另造 `--oa-*` 命名、禁止为漏斗/图表/渠道新增颜色 token**。品牌主色唯一基准 = 网站 `--color-primary: #1a56db`（已弃用旧 OA 草稿色 `#09348B`）。需要新色先回网站 CSS 扩展。

---

## 1. 设计目标

HOLANG OA 是内部工作系统，不是营销网站。

核心优先级：

**效率 > 清晰 > 一致性 > 品牌感 > 装饰性**

整体视觉方向：

**Professional × Clean × Efficient × Calm**

中文理解：

**专业、干净、高效、稳定。**

禁止把官网的营销视觉直接复制到 OA。

OA 不使用：

- 大面积 Hero
- 超大标题
- 大量装饰图片
- 过度留白
- 每块内容都做成卡片
- 大面积渐变
- 重阴影
- 花哨动画

---

## 2. 基础颜色

### 品牌主色

```css
--color-primary: #1a56db;        /* = 网站 CSS 主色：按钮/导航/链接/Focus/Selected */
--color-primary-hover: #1e40af;
--color-primary-light: #e8f0fe;  /* 选中软背景 */
```

用途：主按钮、当前导航、链接、Focus、Selected 状态。OA 主操作色统一为**网站主色 `#1a56db`**（已弃用旧草稿 `#09348B`），不建议把橙色作为 OA 默认主按钮。

### 品牌强调色

品牌强调色（橙 `#E45124`）：仅用于少量关键提醒、特殊强调、品牌识别、极少数业务重点。**使用前须先加入网站 CSS 与 `oa-design-tokens.css` 的 `--color-accent`**（不在此文档平行定义 token，避免双源漂移）；禁止在 OA 各页面硬编码。原则：橙色不能到处出现。

---

## 3. 中性色

```css
--color-bg: #f3f4f6;
--color-surface: #ffffff;
--color-text: #111827;
--color-text-secondary: #6b7280;
--color-text-muted: #9ca3af;
--color-border: #e5e7eb;
--color-border-dark: #d1d5db;
```

页面背景 #f3f4f6；主要工作区域 #ffffff；正文 #111827；辅助信息 #6b7280。（全部取值对齐网站 CSS；分隔线复用 `--color-border`，不另设 `--oa-divider`）

---

## 4. 状态颜色

OA 状态颜色必须是"业务语言"，不能作为装饰。

```css
--color-success: #059669;
--color-warning: #d97706;
--color-danger: #dc2626;
--color-info: #2563eb;
--color-success-light: #d1fae5;
--color-warning-light: #fef3c7;
--color-danger-light: #fee2e2;
--color-info-light: #dbeafe;
```

示例：已完成→Green；待确认→Orange/Warning；已逾期→Red；处理中→Blue；草稿→Gray。
禁止：一个业务状态一个颜色（否则报价/询盘/客户/任务增多后失控）。浅底状态标签统一用 `-light` 后缀（如 `bg-[var(--color-success-light)]`），不复用旧 `-bg` 命名。

---

## 5. 字体系统

```css
font-family: Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
```

OA 中文场景必须优先考虑中文可读性。

字号：页面标题 24/600，模块标题 18/600，小标题 16/600，正文 14/400，表格 14/400，Label 14/500，辅助信息 13/400。
原则：正常业务信息不要低于 13px，不要为"塞更多内容"不断缩小字体。

---

## 6. 间距系统

```css
--space-1: 4px; --space-2: 8px; --space-3: 12px;
--space-4: 16px; --space-5: 24px; --space-6: 32px;
```

控件内部 8–12px；表单字段之间 16px；模块内部 16–24px；模块之间 24px；页面左右 24px(Desktop)/16px(Small)。
不允许随便写 17/19/27/31px 这类值。

---

## 7. 圆角

```css
--radius-sm: 4px; --radius-md: 6px; --radius-lg: 8px;
```

Button/Input 6px；Panel/Modal 8px。不做大量 12/16/20/999px。OA 不是消费类 App。

---

## 8. 阴影

默认不用阴影。依靠背景+边框+间距+层级建立结构。Modal/Dropdown/Floating Panel 才允许轻阴影。

---

## 9. 页面布局（Desktop First）

- 左侧导航：224px（折叠 64px）
- 顶部栏：56px
- 页面主体 padding：24px
- 不强制 1200px 最大宽度（OA 大量表格/报价/参数需充分利用桌面宽度）

---

## 10. Button

- Primary：高 36px，色 `#1a56db`（= 网站主色），白字。**一个区域只有一个真正主操作**。
- Secondary：白底，边框 #e5e7eb，字 #344054。
- Danger：仅删除等高风险操作用 Red。
- Compact：表格操作 32px。禁止同页出现五六个视觉重量一样的蓝按钮。

---

## 11. Input / Select

正常高 36px，复杂表单 40px；边框 1px solid #D7DDE5；Focus 2px Brand Blue Focus Ring；Label 放输入框上方，不要大量用 Placeholder 代替 Label。

---

## 12. 表格 Table（最重要组件之一）

表头 40px，普通行 44px，多内容行 48px，默认 14px。
数字右对齐、名称左对齐、状态统一 Status Tag、操作最右侧。
长表格必须支持：Sticky Header / Sort / Filter / Pagination / Horizontal Scroll / Column Hide-Show（后期）。
禁止为"漂亮"把每行做成独立大卡片。

---

## 13. Status Tag

高约 24px，浅背景+深文字（如 待确认/已报价/跟进中/已成交/已取消）。不用大面积高饱和纯色块。

---

## 14. Panel / Card

尽量叫 Panel / Section，而非所有东西都 Card。默认 `background:#FFFFFF; border:1px solid #EAECF0; border-radius:8px; padding:16px`；默认无 Shadow。
用 Panel：客户基础信息/报价信息/项目参数/活动记录。
不用：一张完整表格页面再"大卡片→小卡片→表格"嵌套。

---

## 15. Navigation

当前页：网站主色 #1a56db + Soft Blue Background（`#e8f0fe`）；Hover：Very Light Gray/Blue。导航图标统一风格，不一个菜单一种颜色。

---

## 16. Hover / Focus / Selected

必须区分 Default / Hover / Focus / Active / Selected / Disabled。Selected：`background:#e8f0fe; color:#1a56db`。Hover 不应直接等于 Selected。

---

## 17. Responsive

主要环境：1440 Desktop / 1366 Laptop / 1920 Wide。优先保证这三档。Tablet 保持可操作；Mobile 保证基本查看和关键操作，但**不为了手机牺牲桌面 OA 效率**。小屏：Sidebar 折叠、表格横滚、双栏表单变单栏、Modal 接近全屏。

---

## 18. 信息密度

采用 **Medium Compact（中等偏紧凑）**：非极简 SaaS 巨大留白，也非传统 ERP 高密度拥挤。目标：1366×768 屏能真正看到 页面标题+筛选条件+核心操作+约 8–10 行业务数据（可作为验收标准）。

---

## 19. CSS Token 第一版

```css
:root {
  /* 全部镜像网站 CSS（holang-admin/css/style.css），禁止另起 --oa-* */
  --color-primary: #1a56db;
  --color-primary-hover: #1e40af;
  --color-primary-light: #e8f0fe;
  --color-success: #059669;
  --color-success-light: #d1fae5;
  --color-warning: #d97706;
  --color-warning-light: #fef3c7;
  --color-danger: #dc2626;
  --color-danger-light: #fee2e2;
  --color-info: #2563eb;
  --color-info-light: #dbeafe;
  --color-bg: #f3f4f6;
  --color-surface: #ffffff;
  --color-border: #e5e7eb;
  --color-border-dark: #d1d5db;
  --color-text: #111827;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;
}
```

> ⚠️ 圆角以 `oa-design-tokens.css` 为准（`--radius-sm:6px / --radius-md:8px / --radius-lg:12px`）；第 7 节示例值待与 token 文件对齐。

---

## 20. 当前状态与验证方法

状态：**Candidate / 候选基础规范**，不是 Frozen。

不要现在就让 Codex 全局重构。正确验证方法：

### 第一页 · Quotation List / 报价列表
验证：Sidebar、Header、Table、Filter、Button、Status。

### 第二页 · Quotation Form / 报价编辑
验证：Form、Input、Select、Section、Button hierarchy。

### 第三页 · Customer Detail / 客户详情
验证：信息层级、Activity、Tabs、Panel、Status。

三类页面都跑通以后，再：**Freeze → Global CSS / Design Tokens。**

---

## 21. 品牌色阶（Brand Scale 50–900）

原 token 只给了 4 个主色变体，组件里需要更细的色阶（如 hover/active/soft/浅底描边）时无据可依，导致散落硬编码。

**品牌色阶（与「做网站时定的全局 CSS」`holang-admin/css/style.css` 的 `--color-primary` 对齐，单一事实源）：**

| 档 | 色值 | 用途 |
|---|---|---|
| 50 | `#eef3fe` | 极浅底（soft 变体） |
| 100 | `#dbe4fd` | 浅底/选中软背景 |
| 200 | `#bccfff` | 浅描边/悬浮浅块 |
| 300 | `#93b2fb` | 浅色图标/禁用态 |
| 400 | `#5e88f4` | 图表浅档/次强调 |
| 500 | `#3a72e8` | Focus Ring / 链接 hover |
| **600** | **`#1a56db`** | **主色（= 网站 `--color-primary`，按钮/导航/主操作）** |
| 700 | `#1e40af` | hover |
| 800 | `#1a3a93` | active |
| 900 | `#172e6e` | 最深/页脚暗区 |

> （颜色铁律已上提到「接收说明」，此处不再重复；所有取值以网站 `holang-admin/css/style.css` 的 `--color-*` 为准。）
