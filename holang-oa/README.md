# HOLANG OA System

HOLANG 企业办公自动化系统，统一管理 CRM、后台管理及业务流程。


## 项目结构

```
holang-oa/
├── packages/
│   ├── crm/        # 客户关系管理（原 holang-crm）
│   └── admin/      # 后台管理系统（原 holang-admin）
```

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **状态管理**: Zustand
- **图表**: Recharts
- **UI 组件**: shadcn/ui (admin)

## 快速开始

```bash
# CRM 模块
cd packages/crm
npm install
npm run dev     # http://localhost:5190

# Admin 模块
cd packages/admin
npm install
npm run dev     # http://localhost:5180
```
