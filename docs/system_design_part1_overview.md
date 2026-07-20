# HOLANG CRM Phase 1 系统架构设计 v2.0 - Part 1: 实现方案

**文档版本**: v2.0  
**创建日期**: 2025-01-15  
**作者**: Bob（软件架构师）  
**状态**: 待审核

---

## 1. 实现方案

### 1.1 核心需求分析

#### 难点1：内外销统一系统架构

**需求**：内销和外销在同一个系统中，用「销售类型」字段区分，数据互通（同一数据库）

**设计方案**：
- `users` 表增加 `sales_type` 字段（`internal` / `external`）
- `customers` 表增加 `sales_type` 字段（`internal` / `external`）
- 前端根据当前用户的 `sales_type` 显示不同的菜单和字段
- 内销参考：励销云、销售易（找客→筛客→管客，企微私域，低代码aPaaS）
- 外销参考：询盘云（询盘管理、WhatsApp集成、全触点管理、邮件集成）
- 数据共享：同一套系统，同一数据库，管理员可查看所有数据

**内销特有功能**：
- 企微私域管理（企微消息推送、企微客户标签）
- 找客功能（预留接口，当前不需要）
- 合同管理（PDF上传、电子签Phase 2）

**外销特有功能**：
- WhatsApp集成（同步聊天记录）
- 邮件集成（同步邮件记录）
- 询盘管理（预留接口）

#### 难点2：WhatsApp集成

**需求**：CRM系统能同步WhatsApp聊天记录（不是用WhatsApp登录，是同步沟通记录）

**设计方案**：
- 使用 **WhatsApp Business API**（Meta官方）
- 或者第三方工具（如 Twilio、360dialog）
- 同步方案：
  1. 用户在WhatsApp Business账户中授权CRM系统访问
  2. CRM系统通过Webhook接收WhatsApp消息
  3. 消息存储到 `communication_records` 表
  4. 在客户详情页的"沟通"Tab中统一显示

**技术选型**：
- **WhatsApp Business API**（官方，稳定，但需要Meta审核）
- **360dialog**（第三方，快速接入，按消息收费）
- **Twilio**（第三方，全球覆盖，按消息收费）

**推荐方案**：使用 **360dialog** 作为WhatsApp Business API的提供商（快速接入，无需Meta审核）

#### 难点3：低代码配置引擎

**需求**：各个模块需要配置的地方尽量低代码（审批流节点/审批人/抄送人、线索分配规则、公海池回流期限、数据字典等）

**设计方案**：
- 设计 **工作流引擎**（workflows表、workflow_nodes表、workflow_instances表）
- 管理员在操作后台用表单配置工作流（不需要拖拉拽，表单配置更简单）
- 可配置项：
  1. **审批流**：客户信息变更审批、合同审批、周报审批等
  2. **线索分配规则**：自行分配/随机分配/自动轮询/指定人员
  3. **公海池回流期限**：国内/国外线索回流期限
  4. **数据字典**：客户行业、客户来源、合同类型等
  5. **通知规则**：企微通知场景、通知人配置

**工作流引擎设计**：
- `workflows` 表：工作流定义（名称、类型、是否启用）
- `workflow_nodes` 表：工作流节点（节点类型、审批人、抄送人、条件）
- `workflow_instances` 表：工作流实例（当前节点、状态、发起人）

#### 难点4：统一沟通视图

**需求**：同一客户下所有联系人的所有沟通记录统一查看（社媒 + 邮件 + WhatsApp + 企微/微信）

**设计方案**：
- 设计 `communication_records` 表（统一存储所有渠道的沟通记录）
- 字段：客户ID、联系人ID、沟通渠道、沟通方向（收/发）、沟通时间、沟通内容、附件
- 沟通渠道枚举：`wecom`（企微）、`whatsapp`（WhatsApp）、`email`（邮件）、`phone`（电话）、`other`（其他）
- 在客户详情页新增"沟通"Tab，显示所有渠道的消息记录
- 支持一键联系（点击电话号码拨打、点击WhatsApp打开聊天、点击邮件打开邮箱）

**统一沟通视图参考**：
- 询盘云的"全触点管理"统一收件箱
- 显示所有渠道的消息记录（按时间倒序）
- 支持按渠道筛选
- 支持回复（直接在当前页面回复，自动同步到对应渠道）

### 1.2 技术栈选型

#### 前端技术栈

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| Vue | 3.4+ | 前端框架 | 响应式、组件化 |
| Element Plus | 2.9+ | UI组件库 | 企业级UI（内销风格） |
| Vite | 5.0+ | 构建工具 | 快速热更新 |
| TypeScript | 5.0+ | 类型系统 | 类型安全 |
| Pinia | 2.0+ | 状态管理 | 替代Vuex |
| Vue Router | 4.0+ | 路由管理 | SPA路由 |
| Axios | 1.6+ | HTTP客户端 | API调用 |
| ECharts | 5.4+ | 图表库 | Pipeline统计图表 |
| Tailwind CSS | 3.4+ | CSS框架 | 快速样式开发 |

**外销特有**：
- **询盘云风格UI**：参考询盘云的UI设计（更国际化）
- **WhatsApp Web SDK**：集成WhatsApp聊天界面
- **邮件客户端**：集成邮件收发功能（使用IMAP/SMTP）

#### 后端技术栈

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| Python | 3.11+ | 编程语言 | 稳定、生态丰富 |
| FastAPI | 0.109+ | Web框架 | 高性能、自动API文档 |
| SQLAlchemy | 2.0+ | ORM | 数据库操作 |
| Alembic | 1.13+ | 数据库迁移 | 版本控制 |
| Pydantic | 2.5+ | 数据验证 | 请求/响应验证 |
| PostgreSQL | 15+ | 主数据库 | 关系型数据库 |
| Redis | 7.0+ | 缓存 | 会话、缓存 |
| Celery | 5.3+ | 异步任务 | 定时任务、异步任务 |
| DeepSeek | 1.0+ | AI服务 | 工商数据解析、周报生成 |

**外销特有**：
- **WhatsApp Business API SDK**：集成WhatsApp Business API
- **邮件解析库**：解析邮件内容（使用 `email` 标准库）
- **IMAP/SMTP客户端**：同步邮件（使用 `imaplib`、`smtplib`）

#### 部署技术栈

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| Docker | 24.0+ | 容器化 | 环境一致性 |
| Docker Compose | 2.20+ | 容器编排 | 多服务管理 |
| Nginx | 1.24+ | 反向代理 | 静态文件、代理 |
| Ubuntu | 22.04 | 操作系统 | 阿里云ECS |
| 阿里云ECS | - | 云服务器 | 2核4GB |

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
│  │ 审批流    │  │ WhatsApp │  │ 邮件同步  │  │ 低代码    │   │
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

**内销/外销模块区分**：
- 前端：根据 `sales_type` 显示不同菜单和字段
- 后端：API统一，根据当前用户的 `sales_type` 返回不同数据
- 数据库：同一套表，用 `sales_type` 字段区分

### 1.4 数据库设计要点

#### 核心表设计

1. **users（用户表）**：
   - 增加 `sales_type` 字段（`internal` / `external`）
   - 增加 `wecom_userid` 字段（企微UserID，用于企微免登录）
   - 增加 `whatsapp_account` 字段（WhatsApp账号，外销用）

2. **customers（客户表）**：
   - 增加 `sales_type` 字段（`internal` / `external`）
   - 增加工商数据字段（税号、法定代表人、注册资本等，v1.4已实现）
   - 内销客户：显示合同管理、企微私域
   - 外销客户：显示WhatsApp、邮件记录

3. **communication_records（沟通记录表） - 新增**：
   - 统一存储所有渠道的沟通记录
   - 字段：客户ID、联系人ID、沟通渠道、沟通方向、沟通时间、沟通内容、附件
   - 沟通渠道：`wecom`、`whatsapp`、`email`、`phone`、`other`

4. **workflows（工作流定义表） - 新增**：
   - 存储工作流定义（审批流、通知流等）
   - 字段：工作流名称、工作流类型、是否启用、配置JSON

5. **workflow_nodes（工作流节点表） - 新增**：
   - 存储工作流节点定义
   - 字段：工作流ID、节点类型、审批人、抄送人、条件JSON

6. **workflow_instances（工作流实例表） - 新增**：
   - 存储工作流实例（正在执行的工作流）
   - 字段：工作流ID、当前节点ID、发起人ID、状态、业务数据ID

#### 数据库索引优化

- `users(sales_type)`：加速按销售类型查询
- `customers(sales_type)`：加速按销售类型查询
- `customers(owner_id, sales_type)`：加速查询我的客户（按销售类型）
- `communication_records(customer_id, contact_id)`：加速查询客户的沟通记录
- `communication_records(communication_channel)`：加速按渠道筛选

### 1.5 低代码配置引擎设计

#### 配置项清单

1. **审批流配置**：
   - 客户信息变更审批
   - 合同审批
   - 周报审批
   - 可配置：审批节点、审批人、抄送人、条件

2. **线索分配规则配置**：
   - 分配模式：自行分配/随机分配/自动轮询/指定人员
   - 指定人员列表（当选择"指定人员"模式时）

3. **公海池配置**：
   - 国内线索回流期限（天）
   - 国外线索回流期限（天）

4. **数据字典配置**：
   - 客户行业
   - 客户来源
   - 合同类型
   - 沟通渠道

5. **通知规则配置**：
   - 企微通知场景（公海池回流、周报审批、合同签署等）
   - 通知人配置（固定人、动态人（发起人主管））

#### 工作流引擎设计

**表设计**：

```sql
-- 工作流定义表
CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,              -- 工作流名称
    workflow_type VARCHAR(50) NOT NULL,      -- 工作流类型（approval/notification）
    business_type VARCHAR(50) NOT NULL,      -- 业务类型（customer_change/contract/weekly_report）
    is_active BOOLEAN DEFAULT true,           -- 是否启用
    config_json JSONB NOT NULL,               -- 配置JSON（节点定义、条件等）
    created_by INTEGER NOT NULL,             -- 创建人
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 工作流节点表
CREATE TABLE workflow_nodes (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL,             -- 工作流ID
    node_type VARCHAR(50) NOT NULL,           -- 节点类型（start/approval/notification/end）
    node_name VARCHAR(100) NOT NULL,          -- 节点名称
    approver_type VARCHAR(50),                -- 审批人类型（fixed/dynamic/role）
    approver_config JSONB,                    -- 审批人配置（用户ID、角色等）
    cc_config JSONB,                          -- 抄送人配置
    condition_json JSONB,                    -- 条件JSON（何时执行此节点）
    next_node_id INTEGER,                     -- 下一节点ID
    created_at TIMESTAMP DEFAULT now()
);

-- 工作流实例表
CREATE TABLE workflow_instances (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL,             -- 工作流ID
    current_node_id INTEGER NOT NULL,         -- 当前节点ID
    business_id INTEGER NOT NULL,             -- 业务数据ID（如customer_change_request.id）
    initiator_id INTEGER NOT NULL,            -- 发起人ID
    status VARCHAR(50) NOT NULL,              -- 状态（pending/approved/rejected/cancelled）
    context_json JSONB,                       -- 上下文JSON（存储流程变量）
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 工作流实例日志表
CREATE TABLE workflow_instance_logs (
    id SERIAL PRIMARY KEY,
    workflow_instance_id INTEGER NOT NULL,    -- 工作流实例ID
    node_id INTEGER NOT NULL,                 -- 节点ID
    action VARCHAR(50) NOT NULL,              -- 操作（approve/reject/submit）
    operator_id INTEGER NOT NULL,             -- 操作人ID
    comment TEXT,                             -- 操作意见
    created_at TIMESTAMP DEFAULT now()
);
```

**配置示例（客户信息变更审批流）**：

```json
{
    "workflow_name": "客户信息变更审批流",
    "workflow_type": "approval",
    "business_type": "customer_change",
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
                "type": "fixed",
                "user_ids": [1001, 1002]
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
- 管理员选择工作流类型 → 配置节点 → 保存

### 1.6 WhatsApp集成设计

#### 集成方案

**方案选择**：使用 **360dialog** 作为WhatsApp Business API提供商

**原因**：
- 无需Meta审核（360dialog是Meta官方合作伙伴）
- 快速接入（1-2天可完成）
- 按消息收费（¥0.05/条）
- 提供Webhook接收消息

#### 技术实现

1. **用户授权**：
   - 外销用户在CRM系统中绑定WhatsApp Business账号
   - 存储 `whatsapp_phone_number` 和 `whatsapp_api_key` 到 `users` 表

2. **消息同步**：
   - 360dialog通过Webhook推送消息到CRM系统
   - CRM系统接收消息并存储到 `communication_records` 表
   - 消息方向：`inbound`（客户发来）、`outbound`（销售发出）

3. **消息发送**：
   - 销售在CRM系统中点击"WhatsApp回复"
   - CRM系统调用360dialog API发送消息
   - 消息记录存储到 `communication_records` 表

#### 数据库设计

**users表增加字段**：
- `whatsapp_phone_number`：WhatsApp账号（手机号）
- `whatsapp_api_key`：WhatsApp Business API Key
- `whatsapp_webhook_url`：Webhook回调地址

**communication_records表**：
- `communication_channel = 'whatsapp'`
- `direction`：消息方向（inbound/outbound）
- `content`：消息内容（文本/图片/文件）
- `media_url`：媒体文件URL（如果是图片/文件）
- `message_id`：WhatsApp消息ID（用于去重）

#### API设计

**WhatsApp相关API**：

```
POST /api/whatsapp/bind - 绑定WhatsApp账号
POST /api/whatsapp/unbind - 解绑WhatsApp账号
POST /api/whatsapp/send - 发送WhatsApp消息
POST /api/whatsapp/webhook - 接收WhatsApp消息（Webhook）
GET /api/whatsapp/messages - 查询WhatsApp消息记录
```

**统一沟通记录API**：

```
GET /api/communication-records/?customer_id={id} - 查询客户的沟通记录
POST /api/communication-records/ - 创建沟通记录（手动记录）
PUT /api/communication-records/{id} - 更新沟通记录
```

### 1.7 统一沟通视图设计

#### 数据模型

**communication_records（沟通记录表）**：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Integer | PK, Auto | 沟通记录ID |
| customer_id | Integer | FK → customers.id, NOT NULL | 客户ID |
| contact_id | Integer | FK → contacts.id, NULL | 联系人ID |
| communication_channel | Enum | NOT NULL | 沟通渠道 |
| direction | Enum | NOT NULL | 沟通方向（inbound/outbound） |
| communication_time | DateTime | NOT NULL | 沟通时间 |
| content | Text | | 沟通内容 |
| media_url | String(500) | | 媒体文件URL |
| message_id | String(255) | | 外部消息ID（用于去重） |
| created_by | Integer | FK → users.id, NOT NULL | 创建人 |
| created_at | DateTime | DEFAULT=now() | 创建时间 |

**沟通渠道枚举**：
- `wecom`：企微
- `whatsapp`：WhatsApp
- `email`：邮件
- `phone`：电话
- `other`：其他

**沟通方向枚举**：
- `inbound`：收到的消息
- `outbound`：发出的消息

#### 前端设计

**客户详情页"沟通"Tab**：

1. **沟通记录列表**：
   - 显示所有渠道的沟通记录（按时间倒序）
   - 每条记录显示：渠道图标、沟通时间、沟通方向、沟通内容、附件
   - 支持按渠道筛选（全部/企微/WhatsApp/邮件/电话）
   - 支持按时间范围筛选

2. **一键联系**：
   - 点击电话号码 → 拨打（调用系统电话应用）
   - 点击WhatsApp → 打开WhatsApp聊天（在新窗口）
   - 点击邮件 → 打开邮件客户端（预填收件人）
   - 点击企微 → 打开企微聊天（在新窗口）

3. **回复功能**：
   - 直接在CRM系统中回复（WhatsApp、邮件、企微）
   - 回复内容自动同步到对应渠道

#### 后端设计

**沟通记录同步服务**：

1. **企微消息同步**：
   - 通过企微API获取聊天记录
   - 存储到 `communication_records` 表

2. **WhatsApp消息同步**：
   - 通过360dialog Webhook接收消息
   - 存储到 `communication_records` 表

3. **邮件同步**：
   - 通过IMAP协议读取邮件
   - 存储到 `communication_records` 表

4. **电话记录同步**：
   - 手动记录（销售打完电话后手动填写）
   - 或集成电话系统API自动同步

### 1.8 DeepSeek工商数据解析设计（v1.4已实现，v2.0优化）

#### 优化点

1. **增加缓存机制**：
   - 相同公司名称的工商数据缓存到Redis（过期时间7天）
   - 减少API调用次数（节省成本）

2. **增加失败重试**：
   - API调用失败时自动重试3次
   - 仍失败则允许手动填写

3. **增加字段映射配置**：
   - 在系统配置表中配置DeepSeek返回字段与数据库字段的映射关系
   - 方便后续调整（不需要改代码）

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

### 1.9 客户信息变更审批流设计（v1.4已实现，v2.0优化）

#### 优化点

1. **接入低代码配置引擎**：
   - 审批流节点、审批人、抄送人可配置
   - 不需要修改代码即可调整审批流程

2. **增加财务通知**：
   - 审批通过后，系统自动抄送 + 企微消息通知财务
   - 财务在企微收到通知，知道客户信息变了，开票时注意

3. **增加变更记录审计**：
   - 所有变更记录永久留存（审计需求）
   - 管理员可查看所有变更记录

#### 审批流配置

**默认审批流**（可配置）：

1. **节点1：提交申请**
   - 操作人：销售
   - 操作：填写变更申请（变更字段、变更前的值、变更后的值、变更原因）

2. **节点2：主管审批**
   - 审批人：销售的直接主管（动态获取）
   - 操作：审批通过/审批驳回
   - 抄送人：财务（固定人）

3. **节点3：通知财务**
   - 通知渠道：系统内抄送 + 企微消息
   - 通知内容：客户信息变更通知（客户名称、变更字段、变更前后的值）

4. **节点4：自动更新**
   - 操作：系统自动更新客户信息（根据审批通过的变更申请）

5. **节点5：完成**

#### API设计

**客户变更申请API**（v1.4已实现）：

```
POST /api/customer-changes/ - 提交客户信息变更申请
GET /api/customer-changes/ - 查看变更申请列表（我的/团队的）
GET /api/customer-changes/{id} - 查看变更申请详情
POST /api/customer-changes/{id}/approve - 审批变更申请（通过）
POST /api/customer-changes/{id}/reject - 审批变更申请（驳回）
GET /api/customer-changes/records - 查看所有变更记录（admin，审计用）
```

**新增API（v2.0）**：

```
POST /api/workflows/ - 创建审批流
GET /api/workflows/ - 查看审批流列表
PUT /api/workflows/{id} - 更新审批流
DELETE /api/workflows/{id} - 删除审批流
```

---

**继续阅读**: [Part 2: 文件清单](./system_design_part2_file_list.md)
