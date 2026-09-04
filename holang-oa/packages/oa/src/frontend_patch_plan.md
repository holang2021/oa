# 前端页面交付：系统工具总览 + 组织总览

## 新增页面

1. `src/pages/SystemTools.tsx` — 系统工具总览页
   - 聚合全部工具入口：飞书知识库、DeepSeek API 配置、审批引擎/模板/统计、打印模板、单证模板、系统配置、系统蓝图、操作日志、回收站
   - 自动按管理员身份过滤：非管理员只看得见「飞书知识库」（与现有 PUBLIC_PATHS 一致）

2. `src/pages/OrgOverview.tsx` — 组织管理总览页
   - 聚合：通讯录、角色权限、离职交接
   - 仅管理员身份下可达

## 需改动的现有文件（确认后合并）

### 1. `src/App.tsx`

新增 import：

```tsx
import SystemTools from './pages/SystemTools'
import OrgOverview from './pages/OrgOverview'
```

在「组织」路由块前插入 `/org`：

```tsx
<Route path="/org" element={<Guard><OrgOverview /></Guard>} />
```

在「系统工具」路由块前插入 `/tools`：

```tsx
<Route path="/tools" element={<Guard><SystemTools /></Guard>} />
```

### 2. `src/services/viewModeStore.ts`

在 `ADMIN_ONLY_PATHS` 中增加 `/org`（组织总览属于配置层）：

```ts
'/org', // 组织管理总览
```

> 说明：`/tools` 不加入 ADMIN_ONLY_PATHS，因为总览页本身要根据身份动态显示/隐藏卡片；页面内部已用 `isCurrentUserAdmin()` 过滤。

### 3. `src/layouts/MainLayout.tsx`

在 `org` 分组 items 顶部增加总览入口：

```tsx
{ to: '/org', labelKey: 'nav.orgOverview', icon: Building2 },
```

在 `tools` 分组 items 顶部增加总览入口：

```tsx
{ to: '/tools', labelKey: 'nav.toolsOverview', icon: Database },
```

### 4. `src/i18n/I18nContext.tsx`

在 `zh` 翻译中增加：

```ts
'nav.orgOverview': '组织概览',
'nav.toolsOverview': '系统工具概览',
```

在 `en` 翻译中增加：

```ts
'nav.orgOverview': 'Org Overview',
'nav.toolsOverview': 'Tools Overview',
```

## 关于「组织」菜单说明

当前截图显示「身份：用户身份」，按 OA 两层身份模型铁律，`组织` 属于配置层，仅在**管理员身份**下显示。上述改动**不会**把组织菜单暴露给用户身份，只是：

- 在管理员身份下给「组织」分组增加一个「组织概览」入口
- 让系统工具有一个聚合总览页， DeepSeek API 配置等工具能完整呈现

若你希望组织菜单在用户身份下也可见，需要单独拍板变更两层模型规则。
