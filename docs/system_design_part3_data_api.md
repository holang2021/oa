# HOLANG CRM Phase 1 系统架构设计 v2.0 - Part 3: 数据结构与接口

**文档版本**: v2.0  
**创建日期**: 2025-01-15  
**作者**: Bob（软件架构师）  
**状态**: 待审核

---

## 3. 数据结构与接口

### 3.1 数据库模型（完整 - v2.0）

由于数据库模型定义较长，此处提供核心表结构和关键字段说明。完整SQL定义请参考数据库迁移文件。

#### 核心表清单（15个）

1. **users（用户表）** - 更新（v2.0）
   - 新增字段：`sales_type`（内销/外销）、`wecom_userid`、`whatsapp_phone_number`、`whatsapp_api_key`
   - 角色枚举：sales、manager、admin、finance
   - 销售类型枚举：internal、external

2. **customers（客户表）** - 更新（v2.0）
   - 新增字段：`sales_type`（内销/外销）、工商数据字段（税号、法定代表人等）
   - 内销客户：显示合同管理、企微私域
   - 外销客户：显示WhatsApp、邮件记录

3. **communication_records（沟通记录表）** - 新增（v2.0）
   - 统一存储所有渠道的沟通记录
   - 沟通渠道枚举：wecom、whatsapp、email、phone、other
   - 沟通方向枚举：inbound、outbound

4. **workflows（工作流定义表）** - 新增（v2.0）
   - 存储工作流定义（审批流、通知流等）
   - 配置JSON：节点定义、条件等

5. **workflow_nodes（工作流节点表）** - 新增（v2.0）
   - 存储工作流节点定义
   - 节点类型：start、approval、notification、end

6. **workflow_instances（工作流实例表）** - 新增（v2.0）
   - 存储工作流实例（正在执行的工作流）
   - 状态：pending、approved、rejected、cancelled

7. **customer_change_requests（客户变更申请表）** - v1.4已实现
   - 记录客户信息变更申请
   - 审批状态：pending、approved、rejected

8. **contracts（合同表）** - 新增
9. **weekly_reports（周报表）** - 新增
10. **leads（线索表）** - 新增
11. **public_sea_config（公海池配置表）** - 新增
12. **system_config（系统配置表）** - 新增（v1.3）
13. **contacts（联系人表）** - 新增
14. **follow_ups（跟进记录表）** - 新增
15. **opportunities（商机表）** - 新增

#### 关键表结构示例

**users表（v2.0）**：
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(50) NOT NULL,              -- sales/manager/admin/finance
    sales_type VARCHAR(50) NOT NULL DEFAULT 'internal',  -- internal/external
    wecom_userid VARCHAR(100) UNIQUE,       -- 企微UserID
    whatsapp_phone_number VARCHAR(50),       -- WhatsApp账号
    whatsapp_api_key VARCHAR(255),          -- WhatsApp API Key
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

**communication_records表（v2.0新增）**：
```sql
CREATE TABLE communication_records (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    contact_id INTEGER REFERENCES contacts(id),
    communication_channel VARCHAR(50) NOT NULL,  -- wecom/whatsapp/email/phone/other
    direction VARCHAR(50) NOT NULL,              -- inbound/outbound
    communication_time TIMESTAMP NOT NULL,
    content TEXT,
    media_url VARCHAR(500),
    message_id VARCHAR(255),                     -- 外部消息ID（用于去重）
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now()
);
```

**workflows表（v2.0新增）**：
```sql
CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    workflow_type VARCHAR(50) NOT NULL,          -- approval/notification
    business_type VARCHAR(50) NOT NULL,         -- customer_change/contract/weekly_report
    is_active BOOLEAN DEFAULT true,
    config_json JSONB NOT NULL,                  -- 配置JSON（节点定义、条件等）
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

（其他表结构请参考完整文档或数据库迁移文件）

---

### 3.2 API接口设计（完整 - v2.0）

#### API清单（50+个）

**认证API（4个）**：
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户信息
- `POST /api/auth/wecom-login` - 企微免登录

**用户管理API（6个）**：
- `POST /api/users/` - 创建用户
- `GET /api/users/` - 用户列表（按sales_type筛选）
- `GET /api/users/{id}` - 用户详情
- `PUT /api/users/{id}` - 更新用户
- `DELETE /api/users/{id}` - 删除用户
- `POST /api/users/bind-whatsapp` - 绑定WhatsApp账号

**客户管理API（10个）**：
- `POST /api/customers/` - 创建客户
- `GET /api/customers/` - 客户列表（按sales_type区分）
- `GET /api/customers/{id}` - 客户详情
- `PUT /api/customers/{id}` - 更新客户
- `DELETE /api/customers/{id}` - 删除客户
- `GET /api/customers/{id}/contacts` - 客户联系人列表
- `POST /api/customers/{id}/contacts` - 添加联系人
- `GET /api/customers/{id}/followups` - 跟进记录列表
- `POST /api/customers/{id}/followups` - 添加跟进记录
- `GET /api/customers/{id}/communications` - 沟通记录列表
- `GET /api/customers/business-info?company_name={name}` - DeepSeek工商查询

**沟通记录API（4个 - v2.0新增）**：
- `GET /api/communication-records/` - 查询沟通记录
- `POST /api/communication-records/` - 创建沟通记录
- `PUT /api/communication-records/{id}` - 更新沟通记录
- `DELETE /api/communication-records/{id}` - 删除沟通记录

**WhatsApp API（5个 - v2.0新增）**：
- `POST /api/whatsapp/bind` - 绑定WhatsApp账号
- `DELETE /api/whatsapp/unbind` - 解绑WhatsApp账号
- `POST /api/whatsapp/send` - 发送WhatsApp消息
- `POST /api/whatsapp/webhook` - 接收WhatsApp消息
- `GET /api/whatsapp/messages` - 查询WhatsApp消息记录

**邮件API（5个 - v2.0新增）**：
- `GET /api/email/inbox` - 查询邮件收件箱
- `GET /api/email/sent` - 查询邮件已发送
- `POST /api/email/send` - 发送邮件
- `GET /api/email/{id}` - 查看邮件详情
- `POST /api/email/sync` - 手动同步邮件

**工作流API（8个 - v2.0新增）**：
- `POST /api/workflows/` - 创建审批流
- `GET /api/workflows/` - 查看审批流列表
- `GET /api/workflows/{id}` - 查看审批流详情
- `PUT /api/workflows/{id}` - 更新审批流
- `DELETE /api/workflows/{id}` - 删除审批流
- `POST /api/workflow-instances/` - 发起工作流实例
- `GET /api/workflow-instances/` - 查看工作流实例列表
- `POST /api/workflow-instances/{id}/approve` - 审批通过
- `POST /api/workflow-instances/{id}/reject` - 审批驳回

**客户变更申请API（6个）**：
- `POST /api/customer-changes/` - 提交变更申请
- `GET /api/customer-changes/` - 查看变更申请列表
- `GET /api/customer-changes/{id}` - 查看变更申请详情
- `POST /api/customer-changes/{id}/approve` - 审批通过
- `POST /api/customer-changes/{id}/reject` - 审批驳回
- `GET /api/customer-changes/records` - 查看变更记录（审计）

**其他API（线索、合同、周报、Pipeline等）**：
- 线索管理API（7个）
- 公海池API（4个）
- 合同管理API（7个）
- 销售周报API（7个）
- Pipeline API（5个）
- 系统配置API（4个）
- 文件上传API（1个）
- 企微集成API（2个）
- 操作后台API（5个）
- 审计日志API（2个）

（完整API文档请参考 `docs/api_documentation.md`）

---

### 3.3 Mermaid 类图（v2.0）

完整类图已提取到 `docs/class-diagram.mermaid` 文件。

**查看方式**：
1. 在支持Mermaid的Markdown编辑器中打开 `docs/class-diagram.mermaid`
2. 或访问在线Mermaid编辑器：https://mermaid.live，粘贴文件内容

**类图说明**：
- 显示所有数据库模型（15个）
- 显示模型之间的关系（1对多、多对1）
- 显示关键字段和枚举类型

---

**继续阅读**: [Part 4: 程序调用流程](./system_design_part4_sequences.md)
