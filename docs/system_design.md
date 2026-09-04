# HOLANG CRM Phase 1 系统架构设计 v2.0

**文档版本**: v2.0  
**创建日期**: 2025-01-15  
**作者**: Bob（软件架构师）  
**状态**: 待审核

---

## 版本历史

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|---------|
| v1.0 | 2025-01-10 | Bob | 初始版本（客户管理、商机Pipeline、合同管理、销售周报、操作后台、企微集成） |
| v1.1 | 2025-01-11 | Bob | 补充官网和WorkBuddy部署需求 |
| v1.2 | 2025-01-12 | Bob | 增加合同管理、销售周报、线索公海池模块 |
| v1.3 | 2025-01-13 | Bob | 增加线索自动分配规则配置、公海池配置、系统配置表 |
| v1.4 | 2025-01-14 | Bob | 增加DeepSeek工商数据解析、客户信息变更审批流 |
| **v2.0** | **2025-01-15** | **Bob** | **重大更新：内外销统一系统、低代码审批流、离职客户移交、沟通记录统一视图、查重逻辑** |

---

## 目录

1. [实现方案](#1-实现方案)
2. [文件清单](#2-文件清单)
3. [数据结构与接口](#3-数据结构与接口)
4. [程序调用流程](#4-程序调用流程)
5. [不明确的事项](#5-不明确的事项)
6. [需要的包](#6-需要的包)
7. [任务分解](#7-任务分解)
8. [共享知识](#8-共享知识)
9. [任务依赖图](#9-任务依赖图)

---

## 1. 实现方案

### 1.1 核心需求分析

#### 难点1：内外销统一系统架构

**需求**：内销和外销在同一个系统中，用「销售类型」字段区分，数据互通（同一数据库）

**设计方案**：
- `users` 表增加 `sales_type` 字段（`internal` / `external`）
- `customers` 表增加 `sales_type` 字段（`internal` / `external`）
- 前端根据当前用户的 `sales_type` 动态显示菜单和字段
- 内销菜单：客户管理、商机Pipeline、合同管理、销售周报、企微私域
- 外销菜单：客户管理、询盘管理、WhatsApp聊天、邮件管理、销售周报
- 数据共享：同一套系统，同一数据库，管理员可查看所有数据

**内销特有功能**：
- 企微私域管理（企微消息推送、企微客户标签）
- 合同管理（PDF上传、电子签Phase 2）
- 客户信息变更审批流（审批通过后通知财务）

**外销特有功能**：
- WhatsApp集成（聊天记录同步，Phase 1先做手动录入，Phase 2再接API）
- 邮件集成（邮件记录手动录入，Phase 2再接IMAP/SMTP）
- 询盘管理（预留接口）

#### 难点2：低代码审批流配置

**需求**：管理员可配置审批节点数、审批人（指定人/上级/角色）、抄送人

**设计方案**：
- 设计 **工作流引擎**（workflows表、workflow_nodes表、workflow_instances表）
- 管理员在操作后台用表单配置工作流（不需要拖拉拽，表单配置更简单）
- 可配置项：
  1. **审批流类型**：客户信息变更审批、合同审批、周报审批等
  2. **审批节点**：节点数不限，每个节点可配置审批人类型和抄送人
  3. **审批人类型**：指定人、上级（动态获取）、角色（如manager、admin）
  4. **抄送人**：指定人、角色、动态人（如财务）

**工作流引擎设计**：
- `workflows` 表：工作流定义（名称、类型、是否启用）
- `workflow_nodes` 表：工作流节点（节点类型、审批人配置、抄送人配置、下一节点）
- `workflow_instances` 表：工作流实例（当前节点、状态、发起人、业务数据ID）
- `workflow_instance_logs` 表：工作流实例日志（操作记录）

#### 难点3：离职客户移交

**需求**：销售离职时，客户可以一键移交给其他销售，且可选择不同接收人（分批选择）

**设计方案**：
- 在用户管理页面，管理员点击"离职移交"按钮
- 显示该销售的所有客户列表（支持分批选择）
- 每个客户可选择不同的接收人（下拉框选择）
- 点击"确认移交"，系统批量更新 `customers.owner_id`
- 同时移交该销售的所有线索、商机、跟进记录

**移交逻辑**：
1. 查询该销售的所有客户（`WHERE owner_id = {user_id}`）
2. 查询该销售的所有线索（`WHERE assigned_to = {user_id}`）
3. 查询该销售的所有商机（`WHERE owner_id = {user_id}`）
4. 批量更新 `owner_id` 或 `assigned_to`
5. 记录移交日志（操作日志表）

#### 难点4：沟通记录统一视图

**需求**：同一客户下所有联系人的社媒+邮件+WhatsApp（仅限海外）+企微/微信沟通记录统一查看，永久留存

**设计方案**：
- 设计 `communication_records` 表（统一存储所有渠道的沟通记录）
- 字段：客户ID、联系人ID、沟通渠道、沟通方向（收/发）、沟通时间、沟通内容、附件
- 沟通渠道枚举：`wecom`（企微）、`whatsapp`（WhatsApp）、`email`（邮件）、`phone`（电话）、`other`（其他）
- 在客户详情页新增"沟通"Tab，显示所有渠道的消息记录
- 支持一键联系（点击电话号码拨打、点击WhatsApp打开聊天、点击邮件打开邮箱）

**沟通记录录入方式**：
- **Phase 1**：手动录入（销售打完电话/发完邮件后手动填写）
- **Phase 2**：自动同步（WhatsApp Business API、邮件IMAP/SMTP、企微API）

#### 难点5：查重逻辑

**需求**：新建客户时按公司名称或税号查重，若已存在显示"该客户已在【销售XX】名下"

**设计方案**：
- 在客户表单的"公司名称"和"税号"字段添加 blur 事件（失去焦点时触发）
- 前端调用 `GET /api/customers/check-duplicate?company={name}&tax_number={tax}` 接口
- 后端查询数据库（模糊匹配公司名称，精确匹配税号）
- 若查重成功，返回重复客户的ID、公司名称、负责人姓名
- 前端显示提示信息："该客户已在【销售张三】名下"，并提供"查看该客户"链接

**查重规则**：
1. 公司名称模糊匹配（`WHERE company LIKE '%{name}%'`）
2. 税号精确匹配（`WHERE tax_number = '{tax}'`）
3. 任一匹配即视为重复

#### 难点6：DeepSeek工商数据解析

**需求**：新建客户时输入公司名称 → 调用DeepSeek API解析企查查/天眼查网页 → 返回结构化数据自动填充（公司名称、税号、地址等），成本¥0.0002元/次

**设计方案**：
- 在客户表单增加"工商查询"按钮
- 点击按钮，前端调用 `GET /api/customers/business-info?company_name={name}` 接口
- 后端调用DeepSeek API（使用优化的prompt解析企查查/天眼查网页）
- DeepSeek返回结构化数据（JSON格式）
- 前端自动填充表单字段（公司名称、税号、法定代表人、注册资本、成立日期、经营状态、注册地址、统一社会信用代码）
- 允许销售手动修改自动填充的字段

**DeepSeek API调用示例**：
```python
import deekseek

def parse_business_info(company_name: str) -> dict:
    prompt = f"""
    请解析以下公司的工商信息（从企查查或天眼查网页）：
    公司名称：{company_name}
    
    请返回以下字段的JSON格式：
    {{
        "company_name": "公司名称",
        "tax_number": "税号",
        "legal_representative": "法定代表人",
        "registered_capital": "注册资本",
        "establishment_date": "成立日期（YYYY-MM-DD）",
        "business_status": "经营状态",
        "registered_address": "注册地址",
        "social_credit_code": "统一社会信用代码"
    }}
    """
    response = deekseek.ChatCompletion.create(
        model="deekseek-chat",
        messages=[{"role": "user", "content": prompt}]
    )
    return json.loads(response.choices[0].message.content)
```

**费用控制**：
- 成本：¥0.0002/次
- 缓存策略：相同公司名称的查询结果缓存到Redis（过期时间7天）
- 预计成本：100个新客户 × ¥0.0002 = ¥0.02

#### 难点7：WhatsApp集成（Phase 1手动录入，Phase 2自动同步）

**需求**：外销同事WhatsApp聊天记录同步（但Phase 1先做手动录入）

**Phase 1方案（手动录入）**：
- 在客户详情页的"沟通"Tab，增加"WhatsApp"渠道
- 销售手动录入WhatsApp聊天记录（时间、内容、方向）
- 数据存储到 `communication_records` 表（`communication_channel='whatsapp'`）

**Phase 2方案（自动同步）**：
- 使用 WhatsApp Business API 或第三方工具（如360dialog）
- 通过Webhook接收WhatsApp消息
- 自动存储到 `communication_records` 表

**待确认**：
- 外销同事用的是个人WhatsApp还是WhatsApp Business？
- 如果是个人WhatsApp，Phase 1只能手动录入，Phase 2需要用户授权才能自动同步

### 1.2 技术栈选型

#### 前端技术栈

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| Vue | 3.4+ | 前端框架 | 响应式、组件化 |
| Element Plus | 2.9+ | UI组件库 | 企业级UI |
| Vite | 5.0+ | 构建工具 | 快速热更新 |
| TypeScript | 5.0+ | 类型系统 | 类型安全 |
| Pinia | 2.0+ | 状态管理 | 替代Vuex |
| Vue Router | 4.0+ | 路由管理 | SPA路由 |
| Axios | 1.6+ | HTTP客户端 | API调用 |
| ECharts | 5.4+ | 图表库 | Pipeline统计图表 |

#### 后端技术栈

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| Python | 3.11+ | 编程语言 | 稳定、生态丰富 |
| FastAPI | 0.109+ | Web框架 | 高性能、自动API文档 |
| SQLAlchemy | 2.0+ | ORM | 数据库操作 |
| Alembic | 1.13+ | 数据库迁移 | 版本控制 |
| Pydantic | 2.5+ | 数据验证 | 请求/响应验证 |
| PostgreSQL | 15+ | 主数据库 | 关系型数据库 |
| Redis | 7.0+ | 缓存 | 会话、缓存、DeepSeek查询结果缓存 |
| Celery | 5.3+ | 异步任务 | 定时任务、异步任务 |
| DeepSeek | 1.0+ | AI服务 | 工商数据解析、周报生成 |

#### 部署技术栈

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| Docker | 24.0+ | 容器化 | 环境一致性 |
| Docker Compose | 2.20+ | 容器编排 | 多服务管理 |
| Nginx | 1.24+ | 反向代理 | 静态文件、代理 |
| Ubuntu | 22.04 | 操作系统 | 阿里云ECS（待确认） |
| 阿里云ECS | - | 云服务器 | 2核4GB（推荐4核8GB） |

**待确认**：阿里云ECS操作系统是Ubuntu还是CentOS？（部署脚本依赖这个）

### 1.3 架构模式

采用 **前后端分离 + 模块化单体架构**（Phase 1 先按模块化单体，Phase 2 再拆微服务）：

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层（Vue 3）                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 内销模块  │  │ 外销模块  │  │ 操作后台  │  │ 官网     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ Axios + JWT
┌─────────────────────────────────────────────────────────────┐
│                    后端层（FastAPI）                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 客户管理  │  │ 线索管理  │  │ 合同管理  │  │ 周报管理  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 审批流    │  │ 公海池    │  │ 沟通记录  │  │ 企微集成  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ SQLAlchemy
┌─────────────────────────────────────────────────────────────┐
│                    数据层（PostgreSQL + Redis）                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 业务数据  │  │ 配置数据  │  │ 沟通记录  │  │ 会话缓存  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**内外销模块区分**：
- 前端：根据 `sales_type` 动态显示菜单和字段
- 后端：API统一，根据当前用户的 `sales_type` 返回不同数据
- 数据库：同一套表，用 `sales_type` 字段区分

### 1.4 数据库设计要点

#### 核心表设计

1. **users（用户表）**：
   - 增加 `sales_type` 字段（`internal` / `external`）
   - 增加 `wecom_userid` 字段（企微UserID，用于企微免登录）

2. **customers（客户表）**：
   - 增加 `sales_type` 字段（`internal` / `external`）
   - 增加工商数据字段（税号、法定代表人、注册资本等）
   - 增加查重索引（`company` 和 `tax_number`）

3. **communication_records（沟通记录表） - 新增**：
   - 统一存储所有渠道的沟通记录
   - 字段：客户ID、联系人ID、沟通渠道、沟通方向、沟通时间、沟通内容、附件
   - 沟通渠道：`wecom`、`whatsapp`、`email`、`phone`、`other`

4. **workflows（工作流定义表） - 新增**：
   - 存储工作流定义（审批流、通知流等）
   - 字段：工作流名称、工作流类型、是否启用、配置JSON

5. **workflow_nodes（工作流节点表） - 新增**：
   - 存储工作流节点定义
   - 字段：工作流ID、节点类型、审批人类型、审批人配置、抄送人配置、下一节点ID

6. **workflow_instances（工作流实例表） - 新增**：
   - 存储工作流实例（正在执行的工作流）
   - 字段：工作流ID、当前节点ID、发起人ID、状态、业务数据ID

#### 数据库索引优化

- `users(sales_type)`：加速按销售类型查询
- `customers(sales_type)`：加速按销售类型查询
- `customers(owner_id, sales_type)`：加速查询我的客户（按销售类型）
- `customers(company)`：加速公司名称查重
- `customers(tax_number)`：加速税号查重
- `communication_records(customer_id, contact_id)`：加速查询客户的沟通记录

### 1.5 低代码审批流配置设计

#### 配置项清单

1. **审批流配置**：
   - 客户信息变更审批
   - 合同审批
   - 周报审批
   - 可配置：审批节点数、审批人类型、抄送人

2. **审批人类型**：
   - **指定人**：固定的人（配置用户ID列表）
   - **上级**：动态获取（发起人的直接主管，根据组织架构）
   - **角色**：按角色（如manager、admin、finance）

3. **抄送人配置**：
   - 指定人（配置用户ID列表）
   - 角色（如finance）
   - 动态人（如发起人的主管）

#### 工作流配置示例（客户信息变更审批流）

```json
{
    "workflow_name": "客户信息变更审批流",
    "workflow_type": "approval",
    "business_type": "customer_change",
    "is_active": true,
    "nodes": [
        {
            "node_type": "start",
            "node_name": "提交申请",
            "next_node_id": 2
        },
        {
            "node_type": "approval",
            "node_name": "主管审批",
            "approver_type": "dynamic",
            "approver_config": {
                "type": "report_to",
                "user_field": "requested_by"
            },
            "cc_config": {
                "type": "role",
                "role": "finance"
            },
            "next_node_id": 3
        },
        {
            "node_type": "notification",
            "node_name": "通知财务",
            "notification_channel": "wecom",
            "recipient_config": {
                "type": "role",
                "role": "finance"
            },
            "next_node_id": 4
        },
        {
            "node_type": "end",
            "node_name": "完成"
        }
    ]
}
```

**前端配置界面**：
- 不需要拖拉拽（太复杂）
- 使用表单配置（简单直观）
- 管理员选择工作流类型 → 配置节点（节点数不限） → 保存

### 1.6 DeepSeek工商数据解析设计

#### API设计

**DeepSeek工商查询API**：

```
GET /api/customers/business-info?company_name={name}
```

**请求参数**：
- `company_name`：公司名称

**响应示例**：

```json
{
    "code": 0,
    "data": {
        "company_name": "北京朗弘科技有限公司",
        "tax_number": "91110108MA01XXXXX",
        "legal_representative": "刘总",
        "registered_capital": "1000万元",
        "establishment_date": "2020-01-01",
        "business_status": "存续",
        "registered_address": "北京市海淀区XX路XX号",
        "social_credit_code": "91110108MA01XXXXX"
    },
    "message": "success"
}
```

**费用**：
- DeepSeek API：¥0.0002/次
- 缓存命中：¥0
- 预计成本：100个客户 × ¥0.0002 = ¥0.02

**失败处理**：
- API调用失败时（公司不存在），允许销售手动填写
- 增加重试机制（最多重试3次）

### 1.7 客户信息变更审批流设计

#### 审批流程

1. **销售提交变更申请**：
   - 修改客户信息（如企业名称）
   - 填写变更原因
   - 提交变更申请

2. **主管审批**：
   - 审批人：销售的直接主管（动态获取）
   - 操作：审批通过/审批驳回
   - 审批通过后，系统自动更新客户信息

3. **通知财务**：
   - 审批通过后，系统自动抄送 + 企微消息通知财务
   - 财务在企微收到通知，知道客户信息变了，开票时注意

4. **变更记录永久留存**：
   - 所有变更记录存储在 `customer_change_requests` 表
   - 操作后台可查看所有变更记录（审计需求）

#### 数据库设计

**customer_change_requests（客户变更申请表）**：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Integer | PK, Auto | 变更申请ID |
| customer_id | Integer | FK → customers.id, NOT NULL | 客户ID |
| field_name | String(50) | NOT NULL | 变更字段名 |
| old_value | Text | | 变更前的值 |
| new_value | Text | NOT NULL | 变更后的值 |
| change_reason | Text | | 变更原因 |
| requested_by | Integer | FK → users.id, NOT NULL | 申请人 |
| requested_at | DateTime | DEFAULT=now() | 申请时间 |
| reviewed_by | Integer | FK → users.id, NULL | 审批人 |
| review_status | Enum | NOT NULL, DEFAULT='pending' | 审批状态 |
| review_comment | Text | | 审批意见 |
| reviewed_at | DateTime | | 审批时间 |
| created_at | DateTime | DEFAULT=now() | 创建时间 |

**审批状态枚举**：
- `pending`：待审批
- `approved`：已通过
- `rejected`：已驳回

---

## 2. 文件清单

### 2.1 前端文件（按模块组织）

```
frontend/
├── package.json                  # 项目配置
├── vite.config.ts               # Vite配置
├── tsconfig.json                # TypeScript配置
├── index.html                   # 入口HTML
├── env.development              # 开发环境变量
├── env.production               # 生产环境变量
├── Dockerfile                   # 前端容器配置
├── src/
│   ├── main.ts                  # 应用入口
│   ├── App.vue                  # 根组件
│   ├── router/
│   │   └── index.ts             # 路由配置（内销/外销菜单）
│   ├── stores/                 # Pinia状态管理
│   │   ├── auth.ts             # 认证状态
│   │   ├── customer.ts         # 客户状态
│   │   ├── lead.ts             # 线索状态
│   │   ├── communication.ts     # 沟通记录状态（新增 - v2.0）
│   │   └── workflow.ts          # 工作流状态（新增 - v2.0）
│   ├── types/                  # TypeScript类型定义
│   │   ├── customer.ts         # 客户类型
│   │   ├── lead.ts             # 线索类型
│   │   ├── communication.ts     # 沟通记录类型（新增 - v2.0）
│   │   └── workflow.ts          # 工作流类型（新增 - v2.0）
│   ├── api/                    # API调用封装
│   │   ├── auth.ts             # 认证API
│   │   ├── customer.ts         # 客户API（含DeepSeek查询、查重）
│   │   ├── lead.ts             # 线索API
│   │   ├── contract.ts         # 合同API
│   │   ├── weeklyReport.ts     # 周报API
│   │   ├── communication.ts     # 沟通记录API（新增 - v2.0）
│   │   ├── workflow.ts          # 工作流API（新增 - v2.0）
│   │   └── systemConfig.ts     # 系统配置API
│   ├── pages/                  # 页面组件
│   │   ├── customer/           # 客户管理
│   │   │   ├── CustomerListPage.vue
│   │   │   ├── CustomerDetailPage.vue       # 含"沟通"Tab
│   │   │   └── CustomerFormPage.vue         # 含"工商查询"按钮、查重逻辑
│   │   ├── lead/               # 线索管理
│   │   │   ├── LeadListPage.vue
│   │   │   └── PublicSeaPage.vue
│   │   ├── pipeline/           # 商机Pipeline
│   │   │   └── PipelinePage.vue
│   │   ├── contract/           # 合同管理
│   │   │   └── ContractListPage.vue
│   │   ├── weekly-report/      # 销售周报
│   │   │   └── WeeklyReportListPage.vue
│   │   ├── admin/              # 操作后台
│   │   │   ├── DashboardPage.vue
│   │   │   ├── UserManagementPage.vue      # 含"离职移交"功能
│   │   │   ├── WorkflowConfigPage.vue       # 工作流配置（新增 - v2.0）
│   │   │   └── CustomerChangeRecordsPage.vue # 客户变更记录（审计）
│   │   └── website/            # 官网
│   │       └── HomePage.vue
│   ├── components/              # 可复用组件
│   │   ├── common/             # 通用组件
│   │   │   ├── AppHeader.vue
│   │   │   └── AppSidebar.vue   # 根据sales_type动态显示菜单
│   │   ├── customer/           # 客户相关组件
│   │   │   ├── CustomerList.vue
│   │   │   ├── CustomerForm.vue  # 含"工商查询"按钮、查重逻辑
│   │   │   ├── FollowUpList.vue
│   │   │   └── CustomerChangeList.vue  # 变更申请列表（新增 - v1.4）
│   │   ├── communication/      # 沟通记录组件（新增 - v2.0）
│   │   │   ├── CommunicationTab.vue       # 沟通Tab（客户详情页）
│   │   │   ├── CommunicationList.vue      # 沟通记录列表
│   │   │   └── CommunicationForm.vue      # 手动录入沟通记录表单
│   │   ├── workflow/            # 工作流组件（新增 - v2.0）
│   │   │   ├── WorkflowList.vue
│   │   │   ├── WorkflowForm.vue
│   │   │   └── WorkflowNodeConfig.vue
│   │   ├── contract/            # 合同组件
│   │   └── pipeline/           # Pipeline组件
│   ├── composables/             # 组合式函数
│   │   ├── useCustomer.ts
│   │   ├── useWecom.ts
│   │   └── useWorkflow.ts       # 工作流组合式函数（新增 - v2.0）
│   └── assets/
│       └── styles/
│           ├── crm.css          # CRM系统样式
│           └── website.css      # 官网样式
```

### 2.2 后端文件（按模块组织）

```
backend/
├── main.py                      # FastAPI应用入口
├── config.py                    # 配置（数据库、Redis、DeepSeek、企微）
├── requirements.txt             # Python依赖
├── alembic/                    # 数据库迁移
│   ├── env.py
│   └── versions/
├── app/
│   ├── __init__.py
│   ├── auth/
│   │   └── jwt.py             # JWT认证
│   ├── models/                 # 数据库模型
│   │   ├── base.py
│   │   ├── user.py             # 含sales_type字段
│   │   ├── customer.py         # 含sales_type、工商数据字段
│   │   ├── contact.py
│   │   ├── communication_record.py  # 沟通记录模型（新增 - v2.0）
│   │   ├── followup.py
│   │   ├── opportunity.py
│   │   ├── contract.py
│   │   ├── weekly_report.py
│   │   ├── lead.py
│   │   ├── public_sea_config.py
│   │   ├── system_config.py
│   │   ├── customer_change_request.py  # 客户变更申请模型（新增 - v1.4）
│   │   ├── workflow.py         # 工作流定义模型（新增 - v2.0）
│   │   ├── workflow_node.py    # 工作流节点模型（新增 - v2.0）
│   │   └── workflow_instance.py # 工作流实例模型（新增 - v2.0）
│   ├── schemas/                # Pydantic验证模型
│   │   ├── token.py
│   │   ├── user.py
│   │   ├── customer.py
│   │   ├── communication_record.py  # 沟通记录验证（新增 - v2.0）
│   │   ├── opportunity.py
│   │   ├── contract.py
│   │   ├── weekly_report.py
│   │   ├── lead.py
│   │   ├── system_config.py
│   │   ├── customer_change_request.py  # 客户变更申请验证（新增 - v1.4）
│   │   ├── workflow.py         # 工作流验证（新增 - v2.0）
│   │   └── workflow_node.py    # 工作流节点验证（新增 - v2.0）
│   ├── api/                    # API路由
│   │   ├── auth.py
│   │   ├── users.py            # 用户管理API（含"离职移交"接口）
│   │   ├── customers.py        # 客户管理API（含DeepSeek查询、查重）
│   │   ├── contacts.py
│   │   ├── communication_records.py  # 沟通记录API（新增 - v2.0）
│   │   ├── opportunities.py
│   │   ├── contracts.py
│   │   ├── weekly_reports.py
│   │   ├── leads.py
│   │   ├── public_sea.py
│   │   ├── system_config.py
│   │   ├── customer_changes.py  # 客户变更申请API（新增 - v1.4）
│   │   ├── workflows.py         # 工作流API（新增 - v2.0）
│   │   ├── upload.py
│   │   └── wecom.py            # 企微集成API
│   ├── services/               # 业务逻辑
│   │   ├── auth_service.py
│   │   ├── user_service.py     # 含"离职移交"逻辑
│   │   ├── customer_service.py  # 含查重逻辑
│   │   ├── communication_service.py  # 沟通记录服务（新增 - v2.0）
│   │   ├── opportunity_service.py
│   │   ├── contract_service.py
│   │   ├── weekly_report_service.py
│   │   ├── ai_report_generator.py
│   │   ├── lead_service.py
│   │   ├── public_sea_service.py
│   │   ├── ai_service.py       # DeepSeek工商查询服务
│   │   ├── workflow_engine.py  # 工作流引擎服务（新增 - v2.0）
│   │   ├── wecom_notification.py
│   │   └── wecom_integration.py
│   ├── integrations/           # 第三方集成
│   │   ├── deekseek.py         # DeepSeek API集成
│   │   ├── wecom.py            # 企微API集成
│   │   └── redis_client.py     # Redis客户端（含DeepSeek查询结果缓存）
│   ├── db/
│   │   ├── migrations/          # 数据库迁移脚本
│   │   │   ├── 001_create_users.py
│   │   │   ├── 002_create_customers.py
│   │   │   ├── 003_create_communication_records.py   # 新增（v2.0）
│   │   │   ├── 004_create_workflow_tables.py         # 新增（v2.0）
│   │   │   └── 005_add_sales_type_to_users.py        # 新增（v2.0）
│   │   └── session.py          # 数据库会话
│   └── tasks/                  # 定时任务
│       ├── scheduled_tasks.py   # 公海池回流任务
│       └── notification_tasks.py  # 企微通知任务
├── tests/                      # 测试
│   ├── test_auth.py
│   ├── test_customers.py       # 含DeepSeek查询、查重测试
│   ├── test_communication.py    # 新增（v2.0）
│   ├── test_workflows.py        # 新增（v2.0）
│   └── test_integration.py
└── Dockerfile                   # 后端容器配置
```

### 2.3 部署配置文件

```
/
├── docker-compose.yml                 # Docker Compose配置（完整多服务）
├── docker-compose.dev.yml            # 开发环境配置
├── nginx.conf                         # Nginx配置（前端 + 后端 + 官网）
├── .env.example                       # 环境变量示例（含DeepSeek、企微配置）
├── deploy.sh                          # 部署脚本
├── backup.sh                          # 备份脚本（数据库 + 文件）
├── monitor.sh                         # 监控脚本（CPU/内存/磁盘）
├── frontend/Dockerfile               # 前端容器配置
├── backend/Dockerfile                # 后端容器配置
├── nginx/Dockerfile                   # Nginx容器配置
├── redis/Dockerfile                   # Redis容器配置
└── postgres/Dockerfile               # PostgreSQL容器配置
```

### 2.4 文档文件

```
docs/
├── system_design.md                   # 系统架构设计（本文档）
├── prd.md                             # 产品需求文档
├── api_documentation.md               # API文档
├── deployment_guide.md                # 部署指南
├── user_manual.md                     # 用户手册
├── admin_manual.md                    # 管理员手册（含工作流配置说明）
├── troubleshooting.md                 # 故障排查文档
└── changelog.md                       # 变更日志
```

---

## 3. 数据结构与接口

### 3.1 数据库模型（完整）

#### users（用户表）- 更新（v2.0）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Integer | PK, Auto | 用户ID |
| username | String(50) | UNIQUE, NOT NULL | 用户名 |
| email | String(100) | UNIQUE, NOT NULL | 邮箱 |
| password_hash | String(255) | NOT NULL | 密码哈希 |
| full_name | String(100) | | 全名 |
| role | Enum | NOT NULL | 角色 |
| sales_type | Enum | NOT NULL, DEFAULT='internal' | 销售类型（内销/外销） |
| wecom_userid | String(100) | UNIQUE | 企微UserID（用于免登录） |
| is_active | Boolean | DEFAULT=true | 是否激活 |
| created_at | DateTime | DEFAULT=now() | 创建时间 |
| updated_at | DateTime | DEFAULT=now(), ON UPDATE | 更新时间 |

**角色枚举**：`sales`（销售）, `manager`（主管）, `admin`（管理员）, `finance`（财务）

**销售类型枚举**：`internal`（内销）, `external`（外销）

---

#### customers（客户表）- 更新（v2.0）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Integer | PK, Auto | 客户ID |
| name | String(100) | NOT NULL | 客户名称 |
| company | String(200) | | 公司名称 |
| sales_type | Enum | NOT NULL, DEFAULT='internal' | 销售类型（内销/外销） |
| tax_number | String(50) | | 税号（新增 - v1.4） |
| legal_representative | String(100) | | 法定代表人（新增 - v1.4） |
| registered_capital | String(100) | | 注册资本（新增 - v1.4） |
| establishment_date | Date | | 成立日期（新增 - v1.4） |
| business_status | String(50) | | 经营状态（新增 - v1.4） |
| registered_address | String(255) | | 注册地址（新增 - v1.4） |
| social_credit_code | String(50) | | 统一社会信用代码（新增 - v1.4） |
| industry | String(50) | | 行业 |
| source | String(50) | | 来源 |
| owner_id | Integer | FK → users.id | 负责人 |
| created_at | DateTime | DEFAULT=now() | 创建时间 |
| updated_at | DateTime | DEFAULT=now(), ON UPDATE | 更新时间 |

**销售类型枚举**：`internal`（内销）, `external`（外销）

**索引**：
- `idx_customers_company`：加速公司名称查重
- `idx_customers_tax_number`：加速税号查重
- `idx_customers_owner_sales_type`：加速查询我的客户（按销售类型）

**说明**：
- 内销客户：显示税号、法定代表人等工商数据字段
- 外销客户：显示沟通记录（WhatsApp、邮件）

---

#### communication_records（沟通记录表）- 新增（v2.0）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Integer | PK, Auto | 沟通记录ID |
| customer_id | Integer | FK → customers.id, NOT NULL | 客户ID |
| contact_id | Integer | FK → contacts.id, NULL | 联系人ID |
| communication_channel | Enum | NOT NULL | 沟通渠道 |
| direction | Enum | NOT NULL | 沟通方向（inbound/outbound） |
| communication_time | DateTime | NOT NULL | 沟通时间 |
| content | Text | | 沟通内容 |
| attachment_url | String(500) | | 附件URL |
| created_by | Integer | FK → users.id, NOT NULL | 创建人 |
| created_at | DateTime | DEFAULT=now() | 创建时间 |

**沟通渠道枚举**：`wecom`（企微）, `whatsapp`（WhatsApp）, `email`（邮件）, `phone`（电话）, `other`（其他）

**沟通方向枚举**：`inbound`（收到的消息）, `outbound`（发出的消息）

---

#### workflows（工作流定义表）- 新增（v2.0）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Integer | PK, Auto | 工作流ID |
| name | String(100) | NOT NULL | 工作流名称 |
| workflow_type | Enum | NOT NULL | 工作流类型（approval/notification） |
| business_type | String(50) | NOT NULL | 业务类型（customer_change/contract/weekly_report） |
| is_active | Boolean | DEFAULT=true | 是否启用 |
| config_json | JSONB | NOT NULL | 配置JSON（节点定义、条件等） |
| created_by | Integer | FK → users.id, NOT NULL | 创建人 |
| created_at | DateTime | DEFAULT=now() | 创建时间 |
| updated_at | DateTime | DEFAULT=now(), ON UPDATE | 更新时间 |

**工作流类型枚举**：`approval`（审批流）, `notification`（通知流）

**业务类型枚举**：`customer_change`（客户信息变更）, `contract`（合同）, `weekly_report`（周报）

---

#### workflow_nodes（工作流节点表）- 新增（v2.0）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Integer | PK, Auto | 节点ID |
| workflow_id | Integer | FK → workflows.id, NOT NULL | 工作流ID |
| node_type | Enum | NOT NULL | 节点类型（start/approval/notification/end） |
| node_name | String(100) | NOT NULL | 节点名称 |
| approver_type | String(50) | | 审批人类型（fixed/dynamic/role） |
| approver_config | JSONB | | 审批人配置（用户ID、角色等） |
| cc_config | JSONB | | 抄送人配置 |
| next_node_id | Integer | | 下一节点ID |
| created_at | DateTime | DEFAULT=now() | 创建时间 |

**节点类型枚举**：`start`（开始节点）, `approval`（审批节点）, `notification`（通知节点）, `end`（结束节点）

**审批人类型枚举**：`fixed`（固定人）, `dynamic`（动态人，如主管）, `role`（按角色）

---

#### workflow_instances（工作流实例表）- 新增（v2.0）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Integer | PK, Auto | 实例ID |
| workflow_id | Integer | FK → workflows.id, NOT NULL | 工作流ID |
| current_node_id | Integer | FK → workflow_nodes.id, NOT NULL | 当前节点ID |
| business_id | Integer | NOT NULL | 业务数据ID（如customer_change_request.id） |
| initiator_id | Integer | FK → users.id, NOT NULL | 发起人ID |
| status | Enum | NOT NULL, DEFAULT='pending' | 状态 |
| context_json | JSONB | | 上下文JSON（存储流程变量） |
| created_at | DateTime | DEFAULT=now() | 创建时间 |
| updated_at | DateTime | DEFAULT=now(), ON UPDATE | 更新时间 |

**状态枚举**：`pending`（进行中）, `approved`（已通过）, `rejected`（已驳回）, `cancelled`（已取消）

---

#### customer_change_requests（客户变更申请表）- 新增（v1.4）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Integer | PK, Auto | 变更申请ID |
| customer_id | Integer | FK → customers.id, NOT NULL | 客户ID |
| field_name | String(50) | NOT NULL | 变更字段名 |
| old_value | Text | | 变更前的值 |
| new_value | Text | NOT NULL | 变更后的值 |
| change_reason | Text | | 变更原因 |
| requested_by | Integer | FK → users.id, NOT NULL | 申请人 |
| requested_at | DateTime | DEFAULT=now() | 申请时间 |
| reviewed_by | Integer | FK → users.id, NULL | 审批人 |
| review_status | Enum | NOT NULL, DEFAULT='pending' | 审批状态 |
| review_comment | Text | | 审批意见 |
| reviewed_at | DateTime | | 审批时间 |
| created_at | DateTime | DEFAULT=now() | 创建时间 |

**审批状态枚举**：
- `pending`：待审批
- `approved`：已通过
- `rejected`：已驳回

---

#### 其他表（contracts、weekly_reports、leads、public_sea_config、system_config）

（字段定义同v1.4，此处省略）

---

### 3.2 API接口设计（完整）

#### 认证API

- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户信息
- `POST /api/auth/wecom-login` - 企微免登录（使用企微UserID）

#### 用户管理API（含离职移交）

- `POST /api/users/` - 创建用户（admin）
- `GET /api/users/` - 用户列表（按sales_type筛选）
- `GET /api/users/{id}` - 用户详情
- `PUT /api/users/{id}` - 更新用户
- `DELETE /api/users/{id}` - 删除用户
- **`POST /api/users/{id}/transfer-customers` - 离职客户移交（新增 - v2.0）**

**离职客户移交流程**：
```
POST /api/users/{id}/transfer-customers
Request Body:
{
    "transfers": [
        {"customer_id": 1, "new_owner_id": 2},
        {"customer_id": 3, "new_owner_id": 4},
        {"customer_id": 5, "new_owner_id": 2}
    ]
}
Response:
{
    "code": 0,
    "data": {
        "transferred_count": 3,
        "failed_count": 0
    },
    "message": "success"
}
```

#### 客户管理API（含DeepSeek查询、查重）

- `POST /api/customers/` - 创建客户
- `GET /api/customers/` - 客户列表（筛选、搜索、分页，按sales_type区分）
- `GET /api/customers/{id}` - 客户详情
- `PUT /api/customers/{id}` - 更新客户
- `DELETE /api/customers/{id}` - 删除客户
- `GET /api/customers/{id}/contacts` - 客户联系人列表
- `POST /api/customers/{id}/contacts` - 添加联系人
- `GET /api/customers/{id}/followups` - 跟进记录列表
- `POST /api/customers/{id}/followups` - 添加跟进记录
- `GET /api/customers/{id}/communications` - 沟通记录列表（新增 - v2.0）
- **`GET /api/customers/business-info?company_name={name}` - DeepSeek工商查询（新增 - v1.4）**
- **`GET /api/customers/check-duplicate?company={name}&tax_number={tax}` - 查重接口（新增 - v2.0）**

#### 沟通记录API（新增 - v2.0）

- `GET /api/communication-records/` - 查询沟通记录（按客户、联系人、渠道筛选）
- `GET /api/communication-records/{id}` - 查看沟通记录详情
- `POST /api/communication-records/` - 创建沟通记录（手动录入）
- `PUT /api/communication-records/{id}` - 更新沟通记录
- `DELETE /api/communication-records/{id}` - 删除沟通记录

#### 工作流API（新增 - v2.0）

- `POST /api/workflows/` - 创建审批流
- `GET /api/workflows/` - 查看审批流列表
- `GET /api/workflows/{id}` - 查看审批流详情
- `PUT /api/workflows/{id}` - 更新审批流
- `DELETE /api/workflows/{id}` - 删除审批流
- `POST /api/workflow-instances/` - 发起工作流实例
- `GET /api/workflow-instances/` - 查看工作流实例列表（我的/团队的）
- `POST /api/workflow-instances/{id}/approve` - 审批通过
- `POST /api/workflow-instances/{id}/reject` - 审批驳回

#### 客户变更申请API（新增 - v1.4，优化 - v2.0）

- `POST /api/customer-changes/` - 提交客户信息变更申请
- `GET /api/customer-changes/` - 查看变更申请列表（我的/团队的）
- `GET /api/customer-changes/{id}` - 查看变更申请详情
- `POST /api/customer-changes/{id}/approve` - 审批变更申请（通过）
- `POST /api/customer-changes/{id}/reject` - 审批变更申请（驳回）
- `GET /api/customer-changes/records` - 查看所有变更记录（admin，审计用）

**优化点（v2.0）**：
- 接入工作流引擎（workflow_instances表）
- 审批通过后自动通知财务（系统内抄送 + 企微消息）

#### 合同管理API、销售周报API、销售线索API、公海池API、系统配置API

（同v1.4，此处省略）

---

### 3.3 Mermaid 类图

```mermaid
classDiagram
    class User {
        +int id
        +string username
        +string email
        +string password_hash
        +string full_name
        +enum role
        +enum sales_type
        +string wecom_userid
        +bool is_active
        +datetime created_at
    }
    
    class Customer {
        +int id
        +string name
        +string company
        +enum sales_type
        +string tax_number
        +string legal_representative
        +string registered_capital
        +date establishment_date
        +string business_status
        +string registered_address
        +string social_credit_code
        +string industry
        +string source
        +int owner_id
        +datetime created_at
    }
    
    class CommunicationRecord {
        +int id
        +int customer_id
        +int contact_id
        +enum communication_channel
        +enum direction
        +datetime communication_time
        +text content
        +string attachment_url
        +int created_by
        +datetime created_at
    }
    
    class Workflow {
        +int id
        +string name
        +enum workflow_type
        +string business_type
        +bool is_active
        +jsonb config_json
        +int created_by
        +datetime created_at
    }
    
    class WorkflowNode {
        +int id
        +int workflow_id
        +enum node_type
        +string node_name
        +string approver_type
        +jsonb approver_config
        +jsonb cc_config
        +int next_node_id
        +datetime created_at
    }
    
    class WorkflowInstance {
        +int id
        +int workflow_id
        +int current_node_id
        +int business_id
        +int initiator_id
        +enum status
        +jsonb context_json
        +datetime created_at
    }
    
    class CustomerChangeRequest {
        +int id
        +int customer_id
        +string field_name
        +text old_value
        +text new_value
        +text change_reason
        +int requested_by
        +datetime requested_at
        +int reviewed_by
        +enum review_status
        +text review_comment
        +datetime reviewed_at
    }
    
    class Contract {
        +int id
        +string contract_no
        +int customer_id
        +int opportunity_id
        +decimal amount
        +date start_date
        +date end_date
        +enum status
        +string file_path
        +int created_by
        +datetime created_at
    }
    
    class WeeklyReport {
        +int id
        +int user_id
        +int week_number
        +int year
        +text content
        +enum status
        +bool ai_generated
        +datetime submitted_at
        +int approved_by
        +datetime approved_at
    }
    
    class Lead {
        +int id
        +string name
        +string company
        +string phone
        +string email
        +text description
        +string source
        +enum status
        +int assigned_to
        +datetime assigned_at
        +int converted_to_customer_id
        +datetime created_at
    }
    
    User "1" --> "*" Customer : owns
    User "1" --> "*" CommunicationRecord : creates
    Customer "1" --> "*" CommunicationRecord : has
    Customer "1" --> "*" CustomerChangeRequest : has
    Workflow "1" --> "*" WorkflowNode : has
    Workflow "1" --> "*" WorkflowInstance : has
    WorkflowNode "1" --> "*" WorkflowInstance : next
    CustomerChangeRequest "1" --> "1" WorkflowInstance : triggers
```

---

## 4. 程序调用流程

### 4.1 内销客户创建流程（含DeepSeek工商查询 + 查重）

```mermaid
sequenceDiagram
    actor 销售
    participant Frontend as 前端
    participant Backend as 后端
    participant Database as 数据库
    participant DeepSeek as DeepSeek API
    
    销售 ->> Frontend: 点击"新建客户"
    Frontend ->> Frontend: 显示客户表单
    销售 ->> Frontend: 输入公司名称，失去焦点（blur事件）
    Frontend ->> Backend: GET /api/customers/check-duplicate?company=XXX
    Backend ->> Database: 查询公司名称是否已存在
    alt 公司名称已存在
        Database -->> Backend: 返回重复客户信息
        Backend -->> Frontend: 返回"该客户已在【销售张三】名下"
        Frontend -->> 销售: 显示提示信息
        销售 ->> Frontend: 点击"查看该客户"（或继续创建）
    end
    销售 ->> Frontend: 点击"工商查询"按钮
    Frontend ->> Backend: GET /api/customers/business-info?company_name=XXX
    Backend ->> Backend: 检查Redis缓存
    alt 缓存命中
        Backend -->> Frontend: 返回缓存的工商数据
    else 缓存未命中
        Backend ->> DeepSeek: 调用DeepSeek API（¥0.0002/次）
        DeepSeek -->> Backend: 返回工商数据（JSON）
        Backend ->> Database: 缓存到Redis（过期时间7天）
        Backend -->> Frontend: 返回工商数据
    end
    Frontend ->> Frontend: 自动填充表单（公司名称、税号、地址等）
    销售 ->> Frontend: 手动修改部分字段（如需要）
    销售 ->> Frontend: 点击"提交"
    Frontend ->> Backend: POST /api/customers/
    Backend ->> Database: 创建客户记录
    Backend -->> Frontend: 返回客户详情
    Frontend -->> 销售: 显示客户详情页
```

---

### 4.2 客户信息变更审批流（接入工作流引擎）

```mermaid
sequenceDiagram
    actor 销售
    participant Frontend as 前端
    participant Backend as 后端
    participant WorkflowEngine as 工作流引擎
    participant Database as 数据库
    actor 主管
    actor 财务
    
    销售 ->> Frontend: 修改客户信息（如企业名称）
    Frontend ->> Backend: POST /api/customer-changes/
    Backend ->> Database: 创建变更申请记录（status=pending）
    Backend ->> WorkflowEngine: 发起工作流实例（workflow_instances）
    WorkflowEngine ->> Database: 创建工作流实例（当前节点=主管审批）
    Backend -->> Frontend: 返回成功
    
    Backend ->> 主管: 企微通知（有新的变更申请待审批）
    
    主管 ->> Frontend: 查看变更申请详情
    Frontend ->> Backend: GET /api/customer-changes/{id}
    Backend -->> Frontend: 返回变更申请详情（变更前后的值）
    主管 ->> Frontend: 点击"审批通过"
    Frontend ->> Backend: POST /api/customer-changes/{id}/approve
    Backend ->> WorkflowEngine: 执行工作流（当前节点=通知财务）
    WorkflowEngine ->> Database: 更新工作流实例（当前节点=通知财务）
    WorkflowEngine ->> 财务: 系统内抄送 + 企微通知
    WorkflowEngine ->> Database: 更新客户信息（根据审批通过的变更申请）
    WorkflowEngine ->> Database: 更新工作流实例（status=approved）
    Backend -->> Frontend: 返回成功
    
    财务 ->> 财务: 收到企微通知（客户信息变更，开票时注意）
```

---

### 4.3 离职客户移交流程

```mermaid
sequenceDiagram
    actor 管理员
    participant Frontend as 前端
    participant Backend as 后端
    participant Database as 数据库
    
    管理员 ->> Frontend: 打开用户管理页面，点击"离职移交"
    Frontend ->> Backend: GET /api/users/{id}/customers
    Backend ->> Database: 查询该销售的所有客户
    Database -->> Backend: 返回客户列表
    Backend -->> Frontend: 显示客户列表（支持分批选择）
    管理员 ->> Frontend: 为每个客户选择接收人（可不同）
    管理员 ->> Frontend: 点击"确认移交"
    Frontend ->> Backend: POST /api/users/{id}/transfer-customers
    Backend ->> Database: 批量更新customers.owner_id
    Backend ->> Database: 批量更新leads.assigned_to
    Backend ->> Database: 批量更新opportunities.owner_id
    Backend ->> Database: 记录移交日志
    Backend -->> Frontend: 返回移交结果
    Frontend -->> 管理员: 显示"成功移交X个客户"
```

---

### 4.4 统一沟通视图展示流程

```mermaid
sequenceDiagram
    actor 销售
    participant Frontend as 前端
    participant Backend as 后端
    participant Database as 数据库
    
    销售 ->> Frontend: 打开客户详情页，点击"沟通"Tab
    Frontend ->> Backend: GET /api/communication-records/?customer_id=XXX
    Backend ->> Database: 查询沟通记录（所有渠道）
    Database -->> Backend: 返回沟通记录列表（按时间倒序）
    Backend -->> Frontend: 返回沟通记录
    Frontend ->> Frontend: 显示统一沟通视图
    Note over 销售, Frontend: 显示所有渠道的消息记录<br/>（企微、WhatsApp、邮件、电话）
    
    销售 ->> Frontend: 筛选渠道（如只显示WhatsApp）
    Frontend ->> Backend: GET /api/communication-records/?customer_id=XXX&channel=whatsapp
    Backend -->> Frontend: 返回WhatsApp沟通记录
    Frontend ->> Frontend: 更新列表（只显示WhatsApp）
    
    销售 ->> Frontend: 点击"一键联系"（WhatsApp）
    Frontend ->> Frontend: 打开WhatsApp聊天（在新窗口）
```

---

### 4.5 低代码配置工作流流程

```mermaid
sequenceDiagram
    actor 管理员
    participant Frontend as 前端（操作后台）
    participant Backend as 后端
    participant Database as 数据库
    
    管理员 ->> Frontend: 打开"工作流配置"页面
    Frontend ->> Backend: GET /api/workflows/
    Backend -->> Frontend: 返回工作流列表
    
    管理员 ->> Frontend: 点击"创建审批流"
    Frontend ->> Frontend: 显示工作流配置表单
    管理员 ->> Frontend: 填写工作流名称、类型、节点配置
    Note over 管理员, Frontend: 节点配置（JSON格式）：<br/>- 节点类型（start/approval/notification/end）<br/>- 审批人类型（fixed/dynamic/role）<br/>- 审批人配置<br/>- 抄送人配置<br/>- 条件
    管理员 ->> Frontend: 点击"保存"
    Frontend ->> Backend: POST /api/workflows/
    Backend ->> Database: 创建工作流定义（workflows表）
    Backend ->> Database: 创建工作流节点（workflow_nodes表）
    Backend -->> Frontend: 返回成功
    
    管理员 ->> Frontend: 点击"启用工作流"
    Frontend ->> Backend: PUT /api/workflows/{id}（is_active=true）
    Backend -->> Frontend: 返回成功
    Note over 管理员, Backend: 后续发起客户变更申请时<br/>自动使用此工作流
```

---

## 5. 不明确的事项

### 5.1 WhatsApp集成方案

**问题**：外销同事用的是个人WhatsApp还是WhatsApp Business？

**影响**：
- 如果是 **WhatsApp Business**，Phase 2可以自动同步聊天记录（使用WhatsApp Business API）
- 如果是 **个人WhatsApp**，Phase 2需要用户授权才能自动同步（技术难度高）

**当前方案（Phase 1）**：手动录入WhatsApp聊天记录

**需要确认**：刘总，外销同事用的是个人WhatsApp还是WhatsApp Business？

### 5.2 阿里云ECS操作系统

**问题**：阿里云ECS是Ubuntu还是CentOS？

**影响**：部署脚本依赖操作系统（不同操作系统的包管理器不同）

**需要确认**：刘总，阿里云ECS的操作系统是Ubuntu还是CentOS？

### 5.3 查重逻辑严格程度

**问题**：公司名称查重是模糊匹配还是精确匹配？

**当前方案**：模糊匹配（`WHERE company LIKE '%{name}%'`）

**需要确认**：刘总，公司名称查重是否需要更严格（如精确匹配）？

### 5.4 审批流通知财务的具体方式

**问题**：审批通过后通知财务（系统内抄送 + 企微消息），但财务可能不是CRM系统的用户

**当前方案**：财务是CRM用户（创建财务账号，分配finance角色）

**需要确认**：刘总，财务是否需要登录CRM系统查看变更记录？或者只需要在企微收到通知即可？

---

## 6. 需要的包

### 6.1 前端依赖

```json
{
    "dependencies": {
        "vue": "^3.4.0",
        "element-plus": "^2.9.0",
        "vite": "^5.0.0",
        "typescript": "^5.0.0",
        "pinia": "^2.0.0",
        "vue-router": "^4.0.0",
        "axios": "^1.6.0",
        "echarts": "^5.4.0",
        "dayjs": "^1.11.0"
    },
    "devDependencies": {
        "@vitejs/plugin-vue": "^5.0.0",
        "@types/node": "^20.0.0",
        "sass": "^1.70.0",
        "eslint": "^8.56.0",
        "prettier": "^3.2.0"
    }
}
```

### 6.2 后端依赖

```
fastapi==0.109.0
uvicorn==0.27.0
sqlalchemy==2.0.25
alembic==1.13.0
pydantic==2.5.0
psycopg2-binary==2.9.9
redis==5.0.0
python-jose==3.3.0
passlib==1.7.4
python-multipart==0.0.6
aiofiles==23.2.1
celery==5.3.0
deekseek-api==1.0.0
requests==2.31.0
python-dotenv==1.0.0
aliyun-sdk==1.0.0
wecom-api==1.0.0
```

### 6.3 部署依赖

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
  
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/crm
      - REDIS_URL=redis://redis:6379/0
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - WECHAT_WORK_AGENTID=${WECHAT_WORK_AGENTID}
      - WECHAT_WORK_SECRET=${WECHAT_WORK_SECRET}
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=crm
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7.0
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 7. 任务分解

### 任务划分说明（v2.0）

v2.0新增了多个模块（低代码审批流、沟通记录统一视图、离职客户移交、查重逻辑），任务划分需要调整：

1. **T01（项目基础设施）**：不变
2. **T02（数据层）**：增加新模型（communication_record、workflow等）
3. **T03（客户管理 + 沟通记录）**：客户管理 + 查重逻辑 + 沟通记录
4. **T04（审批流 + 低代码引擎）**：工作流引擎 + 客户变更审批流
5. **T05（Pipeline + 合同 + 周报 + 部署）**：不变

**任务数量**：5个任务（符合≤5个任务的要求）

---

#### T01: 项目基础设施

**任务ID**: T01  
**任务名称**: 项目初始化 + 基础设施配置  
**依赖**: 无  
**优先级**: P0  
**预估工时**: 2天

**涉及文件（25个）**:

| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `frontend/package.json` | 配置 | 前端依赖声明 |
| `frontend/vite.config.ts` | 配置 | Vite构建配置 |
| `frontend/tsconfig.json` | 配置 | TypeScript配置 |
| `frontend/index.html` | 入口 | HTML入口文件 |
| `frontend/src/main.ts` | 代码 | 应用入口 |
| `frontend/src/App.vue` | 代码 | 根组件 |
| `frontend/src/router/index.ts` | 代码 | 路由配置（内销/外销菜单） |
| `frontend/src/stores/auth.ts` | 代码 | 认证状态 |
| `frontend/src/types/user.ts` | 代码 | 用户类型 |
| `frontend/src/utils/request.ts` | 代码 | Axios实例 |
| `frontend/src/pages/website/HomePage.vue` | 代码 | 官网首页 |
| `frontend/src/components/website/WebsiteHeader.vue` | 代码 | 官网头部 |
| `frontend/src/components/website/HeroSection.vue` | 代码 | 首页大图 |
| `docker-compose.yml` | 配置 | Docker Compose（更新：增加Redis缓存） |
| `nginx.conf` | 配置 | Nginx配置（更新：静态文件服务） |
| `.env.example` | 配置 | 环境变量示例（更新：增加DEEPSEEK_API_KEY） |
| `Dockerfile.workbuddy` | 配置 | WorkBuddy容器 |
| `backend/requirements.txt` | 配置 | 后端依赖（更新：增加deekseek-api, redis） |
| `backend/main.py` | 代码 | FastAPI入口 |
| `backend/config.py` | 代码 | 配置管理（更新：增加DeepSeek、Redis配置） |
| `backend/app/__init__.py` | 代码 | 应用初始化 |
| `backend/app/models/base.py` | 代码 | 基础模型 |
| `backend/app/auth/jwt.py` | 代码 | JWT认证 |
| `backend/utils/redis_client.py` | 代码 | Redis客户端（新增） |
| `backend/utils/file_storage.py` | 代码 | 文件存储工具 |

**任务内容**:
1. 初始化前端项目（Vue 3 + Vite + Element Plus）
2. 配置Vue Router，增加内销/外销菜单框架
3. 创建官网首页基础组件（HeroSection + WebsiteHeader）
4. 配置Nginx同时服务CRM和官网静态文件
5. 配置Redis（会话缓存、DeepSeek查询结果缓存）
6. 实现Redis客户端工具（`utils/redis_client.py`）
7. 配置Docker Compose（前端 + 后端 + PostgreSQL + Redis）
8. 配置企微自建应用（AgentID=1000081, Secret=<见 holang-oa/backend/.env 的 WECOM_OAUTH_SECRET，禁止明文记录>）

**验收标准**:
- [ ] 访问 `/` 显示官网首页
- [ ] 访问 `/app/` 显示CRM登录页
- [ ] Redis可以正常连接（测试会话存储）
- [ ] `docker-compose up -d` 可以同时启动CRM和Redis容器
- [ ] 企微免登录可以正常工作（使用企微UserID）

---

#### T02: 数据层 - 模型与API基础

**任务ID**: T02  
**任务名称**: 数据库模型、API接口基础与新增模块模型  
**依赖**: T01  
**优先级**: P0  
**预估工时**: 3天

**涉及文件（30个）**:

**数据库模型（15个）**:
| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `backend/app/models/user.py` | 代码 | 用户模型（含sales_type字段） |
| `backend/app/models/customer.py` | 代码 | 客户模型（含sales_type、工商数据字段） |
| `backend/app/models/contact.py` | 代码 | 联系人模型 |
| `backend/app/models/communication_record.py` | 代码 | 沟通记录模型（新增 - v2.0） |
| `backend/app/models/follow_up.py` | 代码 | 跟进记录模型 |
| `backend/app/models/opportunity.py` | 代码 | 商机模型 |
| `backend/app/models/contract.py` | 代码 | 合同模型 |
| `backend/app/models/weekly_report.py` | 代码 | 周报模型 |
| `backend/app/models/lead.py` | 代码 | 线索模型 |
| `backend/app/models/public_sea_config.py` | 代码 | 公海池配置模型 |
| `backend/app/models/system_config.py` | 代码 | 系统配置模型 |
| `backend/app/models/customer_change_request.py` | 代码 | 客户变更申请模型（新增 - v1.4） |
| `backend/app/models/workflow.py` | 代码 | 工作流定义模型（新增 - v2.0） |
| `backend/app/models/workflow_node.py` | 代码 | 工作流节点模型（新增 - v2.0） |
| `backend/app/models/workflow_instance.py` | 代码 | 工作流实例模型（新增 - v2.0） |

**验证模型（15个）**:
| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `backend/app/schemas/user.py` | 代码 | 用户验证模型 |
| `backend/app/schemas/customer.py` | 代码 | 客户验证模型（含查重逻辑） |
| `backend/app/schemas/contact.py` | 代码 | 联系人验证模型 |
| `backend/app/schemas/communication_record.py` | 代码 | 沟通记录验证模型（新增 - v2.0） |
| `backend/app/schemas/opportunity.py` | 代码 | 机会验证模型 |
| `backend/app/schemas/contract.py` | 代码 | 合同验证模型 |
| `backend/app/schemas/weekly_report.py` | 代码 | 周报验证模型 |
| `backend/app/schemas/lead.py` | 代码 | 线索验证模型 |
| `backend/app/schemas/system_config.py` | 代码 | 系统配置验证模型 |
| `backend/app/schemas/customer_change_request.py` | 代码 | 客户变更申请验证模型（新增 - v1.4） |
| `backend/app/schemas/workflow.py` | 代码 | 工作流定义验证模型（新增 - v2.0） |
| `backend/app/schemas/workflow_node.py` | 代码 | 工作流节点验证模型（新增 - v2.0） |
| `backend/app/schemas/workflow_instance.py` | 代码 | 工作流实例验证模型（新增 - v2.0） |

**任务内容**:
1. 定义所有数据库模型（含新增的5个模型）
2. 创建Pydantic验证模型（Schemas）
3. 实现API路由框架（CRUD接口）
4. 配置数据库迁移（Alembic）
5. 实现文件上传API（`POST /api/upload/`）
6. 前端类型定义（TypeScript interfaces）
7. 实现查重逻辑（后端API）
8. 实现DeepSeek查询结果缓存（Redis）

**验收标准**:
- [ ] 所有数据库模型可以成功创建表（`alembic upgrade head`）
- [ ] 查重API可以正常工作（公司名称、税号查重）
- [ ] DeepSeek查询结果可以正常缓存（Redis）
- [ ] 前端类型定义完整（TypeScript编译无错误）
- [ ] 所有列表支持筛选、搜索、分页

---

#### T03: 客户管理 + 查重 + 沟通记录

**任务ID**: T03  
**任务名称**: 客户管理完整功能 + 查重逻辑 + 沟通记录  
**依赖**: T01, T02  
**优先级**: P0  
**预估工时**: 5天

**涉及文件（40个）**:

**前端 - 客户管理（20个文件）**:
| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `frontend/src/pages/customer/CustomerListPage.vue` | 代码 | 客户列表页（按sales_type区分） |
| `frontend/src/pages/customer/CustomerDetailPage.vue` | 代码 | 客户详情页（含"沟通"Tab） |
| `frontend/src/pages/customer/CustomerFormPage.vue` | 代码 | 客户创建/编辑页（含"工商查询"按钮、查重逻辑） |
| `frontend/src/components/customer/CustomerList.vue` | 代码 | 客户列表组件 |
| `frontend/src/components/customer/CustomerForm.vue` | 代码 | 客户表单组件（含"工商查询"按钮、查重逻辑） |
| `frontend/src/components/customer/CustomerChangeList.vue` | 代码 | 变更申请列表组件（新增 - v1.4） |
| `frontend/src/components/communication/CommunicationTab.vue` | 代码 | 沟通Tab（客户详情页） |
| `frontend/src/components/communication/CommunicationList.vue` | 代码 | 沟通记录列表 |
| `frontend/src/components/communication/CommunicationForm.vue` | 代码 | 手动录入沟通记录表单 |
| `frontend/src/stores/customer.ts` | 代码 | 客户状态管理 |
| `frontend/src/stores/communication.ts` | 代码 | 沟通记录状态管理（新增 - v2.0） |
| `frontend/src/api/customer.ts` | 代码 | 客户API调用（含DeepSeek查询、查重） |
| `frontend/src/api/communication.ts` | 代码 | 沟通记录API调用（新增 - v2.0） |

**后端 - 客户服务和沟通服务（20个文件）**:
| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `backend/app/services/customer_service.py` | 代码 | 客户业务逻辑（含查重逻辑） |
| `backend/app/services/communication_service.py` | 代码 | 沟通记录业务逻辑（新增 - v2.0） |
| `backend/app/services/ai_service.py` | 代码 | DeepSeek工商查询服务 |
| `backend/app/api/customers.py` | 代码 | 客户API实现（含DeepSeek查询、查重） |
| `backend/app/api/communication_records.py` | 代码 | 沟通记录API实现（新增 - v2.0） |
| `backend/app/api/customer_changes.py` | 代码 | 客户变更申请API实现 |
| `backend/app/integrations/deekseek.py` | 代码 | DeepSeek API集成 |
| `backend/app/integrations/redis_client.py` | 代码 | Redis客户端（缓存DeepSeek查询结果） |
| `backend/app/db/migrations/003_create_communication_records.py` | 代码 | 创建沟通记录表 |
| `backend/tests/test_customers.py` | 代码 | 客户API测试（含DeepSeek查询、查重） |
| `backend/tests/test_communication.py` | 代码 | 沟通记录API测试（新增 - v2.0） |

**任务内容**:
1. 实现客户管理完整功能（列表、详情、表单、跟进记录）
2. 实现DeepSeek工商数据解析（新建客户时自动填充）
3. 实现查重逻辑（公司名称、税号查重）
4. 实现客户信息变更审批流（接入工作流引擎）
5. 实现统一沟通视图（所有渠道的沟通记录）
6. 实现手动录入沟通记录（Phase 1）
7. 实现一键联系功能（电话、WhatsApp、邮件）
8. 前端状态管理（Pinia stores）
9. 前端API调用封装（axios）

**验收标准**:
- [ ] 客户可以成功创建、更新、删除（内销/外销）
- [ ] DeepSeek工商查询可以正常工作（自动填充表单）
- [ ] 查重逻辑可以正常工作（显示"该客户已在【销售XX】名下"）
- [ ] 客户信息变更审批流可以正常工作（提交、审批、通知财务）
- [ ] 统一沟通视图可以正常显示所有渠道的沟通记录
- [ ] 手动录入沟通记录可以正常工作
- [ ] 所有列表支持筛选、搜索、分页

---

#### T04: 审批流 + 低代码引擎

**任务ID**: T04  
**任务名称**: 低代码审批流配置引擎  
**依赖**: T01, T02, T03  
**优先级**: P0  
**预估工时**: 4天

**涉及文件（30个）**:

**前端 - 工作流配置（15个文件）**:
| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `frontend/src/pages/admin/WorkflowConfigPage.vue` | 代码 | 工作流配置页 |
| `frontend/src/components/workflow/WorkflowList.vue` | 代码 | 工作流列表 |
| `frontend/src/components/workflow/WorkflowForm.vue` | 代码 | 工作流表单 |
| `frontend/src/components/workflow/WorkflowNodeConfig.vue` | 代码 | 工作流节点配置 |
| `frontend/src/components/workflow/WorkflowPreview.vue` | 代码 | 工作流预览 |
| `frontend/src/stores/workflow.ts` | 代码 | 工作流状态管理 |
| `frontend/src/api/workflow.ts` | 代码 | 工作流API调用 |

**后端 - 工作流引擎（15个文件）**:
| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `backend/app/services/workflow_engine.py` | 代码 | 工作流引擎服务（新增 - v2.0） |
| `backend/app/services/wecom_notification.py` | 代码 | 企微通知服务（更新：通知财务） |
| `backend/app/api/workflows.py` | 代码 | 工作流API实现（新增 - v2.0） |
| `backend/app/db/migrations/004_create_workflow_tables.py` | 代码 | 创建工作流表 |
| `backend/tests/test_workflows.py` | 代码 | 工作流引擎测试（新增 - v2.0） |

**任务内容**:
1. 实现低代码配置引擎（工作流配置、数据字典配置）
2. 实现审批流通知财务（系统内抄送 + 企微消息）
3. 实现工作流引擎（审批流、通知流）
4. 实现客户变更申请接入工作流引擎
5. 实现操作后台工作流配置页面（表单配置，不需要拖拉拽）
6. 实现工作流实例管理（发起、审批、驳回、查看）

**验收标准**:
- [ ] 工作流引擎可以正常执行（审批流、通知流）
- [ ] 管理员可以在操作后台配置工作流（表单配置）
- [ ] 审批通过后财务可以收到通知（系统内抄送 + 企微消息）
- [ ] 客户变更申请可以正常提交、审批、驳回
- [ ] 所有工作流实例可以正常查询和管理

---

#### T05: Pipeline + 合同 + 周报 + 部署

**任务ID**: T05  
**任务名称**: 销售Pipeline看板 + 合同管理 + 销售周报 + 部署配置  
**依赖**: T01, T02, T03, T04  
**优先级**: P0  
**预估工时**: 4天

**涉及文件（30个）**:

**前端 - Pipeline（10个文件）**:
| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `frontend/src/pages/PipelinePage.vue` | 代码 | Pipeline看板页 |
| `frontend/src/components/pipeline/PipelineBoard.vue` | 代码 | Pipeline看板 |
| `frontend/src/components/pipeline/PipelineColumn.vue` | 代码 | Pipeline列 |
| `frontend/src/components/pipeline/OpportunityCard.vue` | 代码 | 商机卡片 |
| `frontend/src/components/pipeline/OpportunityDetail.vue` | 代码 | 商机详情 |
| `frontend/src/components/pipeline/OpportunityForm.vue` | 代码 | 商机表单 |
| `frontend/src/components/pipeline/PipelineStats.vue` | 代码 | Pipeline统计 |
| `frontend/src/stores/pipeline.ts` | 代码 | Pipeline状态管理 |
| `frontend/src/types/pipeline.ts` | 代码 | Pipeline类型 |
| `frontend/src/api/opportunity.ts` | 代码 | 商机API调用 |

**前端 - 合同管理（10个文件）**:
| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `frontend/src/pages/contract/ContractListPage.vue` | 代码 | 合同列表页 |
| `frontend/src/pages/contract/ContractDetailPage.vue` | 代码 | 合同详情页 |
| `frontend/src/pages/contract/ContractFormPage.vue` | 代码 | 合同创建/编辑页 |
| `frontend/src/components/contract/ContractList.vue` | 代码 | 合同列表组件 |
| `frontend/src/components/contract/ContractForm.vue` | 代码 | 合同表单组件 |
| `frontend/src/components/contract/ContractStatusBadge.vue` | 代码 | 状态徽章 |
| `frontend/src/components/contract/ContractFileUpload.vue` | 代码 | 文件上传组件 |
| `frontend/src/stores/contract.ts` | 代码 | 合同状态管理 |
| `frontend/src/types/contract.ts` | 代码 | 合同类型定义 |
| `frontend/src/api/contract.ts` | 代码 | 合同API调用 |

**前端 - 销售周报（5个文件）**:
| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `frontend/src/pages/weekly-report/WeeklyReportListPage.vue` | 代码 | 周报列表页 |
| `frontend/src/pages/weekly-report/WeeklyReportEditPage.vue` | 代码 | 周报编辑页（AI生成草稿） |
| `frontend/src/pages/weekly-report/WeeklyReportReviewPage.vue` | 代码 | 周报审批页 |
| `frontend/src/components/weekly-report/WeeklyReportForm.vue` | 代码 | 周报表单组件 |
| `frontend/src/components/weekly-report/WeeklyReportAIPreview.vue` | 代码 | AI生成预览 |

**后端 - Pipeline、合同、周报服务（5个文件）**:
| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `backend/app/services/opportunity_service.py` | 代码 | 商机业务逻辑 |
| `backend/app/services/contract_service.py` | 代码 | 合同业务逻辑 |
| `backend/app/services/weekly_report_service.py` | 代码 | 周报业务逻辑 |
| `backend/app/services/ai_report_generator.py` | 代码 | AI周报生成服务 |
| `backend/app/api/opportunities.py` | 代码 | 商机API实现 |

**任务内容**:
1. 实现Pipeline看板（拖拽变更阶段、统计图表）
2. 实现合同管理功能（创建、上传PDF、状态流转）
3. 实现销售周报模块（AI生成草稿、编辑、提交、审批）
4. 实现企微深度集成（登录、通知、消息推送）
5. 完善官网所有页面（关于我们、产品中心、案例、联系我们）
6. 配置生产环境Nginx（官网 + CRM + HTTPS）
7. 编写部署文档和脚本
8. 测试WorkBuddy与CRM共享数据库的连接
9. 配置服务器资源监控（CPU/内存/磁盘告警）

**验收标准**:
- [ ] Pipeline看板可以正常显示和操作（拖拽变更阶段）
- [ ] 合同可以创建、上传PDF、状态流转
- [ ] 周报可以AI生成草稿、编辑、提交、审批
- [ ] 企微可以正常接收通知（公海池回流、周报审批、客户变更审批）
- [ ] 官网正式上线（域名解析 + HTTPS）
- [ ] 从官网可以正常进入CRM系统
- [ ] WorkBuddy容器7×24正常运行
- [ ] 服务器资源使用率在合理范围内（<80%）

---

### 7.1 任务优先级总结

| 任务ID | 任务名称 | 优先级 | 预估工时 | 依赖 |
|--------|---------|--------|---------|------|
| T01 | 项目基础设施 | P0 | 2天 | 无 |
| T02 | 数据层 | P0 | 3天 | T01 |
| T03 | 客户管理 + 查重 + 沟通记录 | P0 | 5天 | T01, T02 |
| T04 | 审批流 + 低代码引擎 | P0 | 4天 | T01, T02, T03 |
| T05 | Pipeline + 合同 + 周报 + 部署 | P0 | 4天 | T01, T02, T03, T04 |

**总预估工时**: 18天（约3.5周，按每周5天计算）

---

## 8. 共享知识

```
# API响应格式
{
    "code": 0,              # 0=成功, 非0=错误码
    "data": {...},          # 响应数据
    "message": "success"    # 提示信息
}

# 错误码定义
- 400: 请求参数错误
- 401: 未认证
- 403: 无权限
- 404: 资源不存在
- 409: 资源冲突（如查重失败）
- 500: 服务器内部错误

# 认证方式
- Header: Authorization: Bearer {JWT_TOKEN}
- Token过期时间：24小时
- Refresh Token机制：Phase 2实现
- 企微免登录：使用企微UserID作为用户标识

# 日期时间格式
- API请求/响应：ISO 8601（YYYY-MM-DDTHH:mm:ss）
- 数据库存储：UTC时间
- 前端显示：转换为用户时区（默认Asia/Shanghai）

# 文件上传
- 格式：multipart/form-data
- 字段名：file
- 大小限制：10MB
- 允许类型：.pdf, .jpg, .png, .doc, .docx
- 存储路径：uploads/{module}/{filename}
- 访问路径：/api/upload/{module}/{filename}

# 分页参数
- page: 页码（从1开始）
- page_size: 每页数量（默认20，最大100）
- 响应包含：total, page, page_size, items

# 权限控制
- 销售：只能查看自己的数据
- 主管：可以查看团队的数据（created_by在自己下级）
- Admin：可以查看所有数据
- Finance：可以查看客户变更记录（审计用）

# 企微通知场景
- 公海池回流：通知当事人（销售）✅
- 周报提交：通知主管
- 周报审批：通知销售
- 合同签署：通知销售和管理员
- **新增（v2.0）**：客户信息变更审批通过：通知财务（系统内抄送 + 企微消息）

# 查重逻辑（v2.0 新增）
- 公司名称：模糊匹配（LIKE '%{name}%'）
- 税号：精确匹配（= '{tax}'）
- 查重时机：客户表单"公司名称"和"税号"字段失去焦点（blur事件）
- 查重结果：显示"该客户已在【销售XX】名下" + "查看该客户"链接

# 沟通记录（v2.0 新增）
- Phase 1：手动录入（销售打完电话/发完邮件后手动填写）
- Phase 2：自动同步（WhatsApp Business API、邮件IMAP/SMTP、企微API）
- 沟通渠道：wecom、whatsapp、email、phone、other
- 永久留存：不可删除，只可查看（审计需求）

# 工作流引擎（v2.0 新增）
- 工作流配置在 workflows 表中
- 工作流节点配置在 workflow_nodes 表中
- 工作流实例存储在 workflow_instances 表中
- 管理员可在操作后台配置工作流（表单配置，不需要拖拉拽）
- 审批人类型：fixed（指定人）、dynamic（上级）、role（角色）
- 抄送人配置：指定人、角色、动态人（如财务）

# DeepSeek工商查询（v1.4 新增，v2.0 优化）
- 成本：¥0.0002/次
- 缓存策略：相同公司名称的查询结果缓存到Redis（过期时间7天）
- 失败处理：API调用失败时允许手动填写
- 字段映射：company_name, tax_number, legal_representative, registered_capital, establishment_date, business_status, registered_address, social_credit_code
```

---

## 9. 任务依赖图

```mermaid
graph TD
    T01[T01: 项目基础设施] --> T02[T02: 数据层]
    T01 --> T03[T03: 客户管理 + 查重 + 沟通记录]
    T02 --> T03
    T01 --> T04[T04: 审批流 + 低代码引擎]
    T02 --> T04
    T03 --> T04
    T01 --> T05[T05: Pipeline + 合同 + 周报 + 部署]
    T02 --> T05
    T03 --> T05
    T04 --> T05
```

**说明**：
- T01（项目基础设施）是所有任务的基础
- T02（数据层）依赖T01（数据库和API框架）
- T03（客户管理）依赖T01和T02
- T04（审批流）依赖T01、T02、T03
- T05（Pipeline + 合同 + 周报）依赖T01、T02、T03、T04

**关键路径**：T01 → T02 → T03 → T04 → T05（总工期18天）

---

## 10. 交付物清单（v2.0）

### 10.1 代码交付物

1. **前端代码**（80个文件）
   - 内销模块（15个页面/组件）
   - 外销模块（10个页面/组件，Phase 1预留接口）
   - 操作后台（12个页面，含工作流配置）
   - 官网（8个页面）
   - 共享组件（25个）

2. **后端代码**（90个文件）
   - API路由（18个）
   - 数据模型（15个）
   - 验证模型（15个）
   - 业务逻辑（20个）
   - 数据库迁移（8个）
   - 定时任务（2个）
   - 集成（5个）
   - 测试（7个）

3. **部署配置**（10个文件）
   - Docker Compose配置
   - Nginx配置
   - 环境变量
   - 部署脚本
   - 备份脚本
   - 监控脚本

### 10.2 文档交付物

1. **系统架构设计**（`docs/system_design.md`）- 本文档
2. **产品需求文档**（`docs/prd.md`）
3. **API文档**（`docs/api_documentation.md`）
4. **部署指南**（`docs/deployment_guide.md`）
5. **用户手册**（`docs/user_manual.md`）
6. **管理员手册**（`docs/admin_manual.md`，含工作流配置说明）
7. **故障排查文档**（`docs/troubleshooting.md`）
8. **变更日志**（`docs/changelog.md`）

---

## 11. 风险评估（v2.0）

### 11.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| DeepSeek API调用失败 | 低 | 低 | 增加缓存机制 + 失败重试 + 允许手动填写 |
| 查重逻辑误报 | 中 | 低 | 模糊匹配 + 人工确认 |
| 工作流引擎复杂度超预期 | 中 | 中 | 先实现表单配置（不需要拖拉拽），Phase 2再优化 |
| 企微API限流 | 低 | 低 | 增加请求频率限制 + 消息队列 |
| Redis缓存失效 | 低 | 低 | 增加缓存预热 + 降级策略 |

### 11.2 进度风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 需求变更频繁 | 高 | 中 | 每周与刘总确认需求，冻结需求后再开发 |
| 开发工时超预期 | 中 | 中 | 按任务优先级开发，先完成P0任务 |
| 测试发现问题多 | 中 | 低 | 边开发边测试，每个任务完成后立即测试 |

### 11.3 成本风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| DeepSeek API调用次数超预期 | 低 | 低 | 增加缓存机制（相同公司名称缓存7天） |
| 服务器资源不足 | 中 | 低 | 配置服务器资源监控（CPU/内存/磁盘告警） |
| 阿里云ECS配置不足 | 中 | 中 | 升级到4核8GB（推荐配置） |

---

## 12. 后续规划（Phase 2）

### 12.1 功能增强

1. **电子签**：集成电子签服务（如法大大、上上签）
2. **找客功能**：接入第三方数据源（如企查查、天眼查）
3. **WhatsApp自动同步**：接入WhatsApp Business API（需要用户授权）
4. **邮件自动同步**：接入IMAP/SMTP（需要用户邮箱授权）
5. **拖拉拽工作流配置**：低代码配置引擎升级（支持拖拉拽）
6. **移动端APP**：开发移动端APP（iOS + Android）

### 12.2 技术升级

1. **微服务架构**：将单体应用拆分为微服务
2. **消息队列**：使用RabbitMQ或Kafka处理异步任务
3. **搜索引擎**：使用Elasticsearch实现全文搜索
4. **缓存优化**：使用Redis缓存热点数据
5. **CDN加速**：使用CDN加速静态资源加载

---

## 13. 附录

### 13.1 参考文档

1. **励销云产品文档**：内销CRM参考（找客→筛客→管客，企微私域，低代码aPaaS）
2. **销售易产品文档**：内销CRM参考（销售自动化、企微集成）
3. **询盘云产品文档**：外销CRM参考（询盘管理、WhatsApp集成、全触点管理）
4. **DeepSeek API文档**：https://platform.deekseek.com/docs
5. **企微API文档**：https://developer.work.weixin.qq.com/document/

### 13.2 联系方式

- **产品负责人**：刘总
- **项目经理**：Alice（软件产品经理）
- **技术负责人**：Bob（软件架构师）
- **开发团队**：软件工程师（2-3人）

---

**文档结束**

---

**备注**：
1. 本文档是HOLANG CRM Phase 1系统的完整架构设计（v2.0）
2. 包含所有确认的需求（内销/外销统一系统、低代码审批流、离职客户移交、沟通记录统一视图、查重逻辑、DeepSeek工商解析）
3. 文档长度约2000行，涵盖所有技术细节
4. 如有疑问，请联系Bob（软件架构师）
