# HOLANG CRM Phase 1 系统架构设计 v2.0 - Part 4: 程序调用流程

**文档版本**: v2.0  
**创建日期**: 2025-01-15  
**作者**: Bob（软件架构师）  
**状态**: 待审核

---

## 4. 程序调用流程

### 4.1 内销客户创建流程（含DeepSeek工商查询）

```mermaid
sequenceDiagram
    actor 销售
    participant Frontend as 前端
    participant Backend as 后端
    participant DeepSeek as DeepSeek API
    participant Database as 数据库
    participant Redis as Redis缓存
    
    销售 ->> Frontend: 点击"新建客户"
    Frontend ->> Frontend: 显示客户表单
    销售 ->> Frontend: 输入公司名称，点击"工商查询"
    Frontend ->> Backend: GET /api/customers/business-info?company_name=XXX
    Backend ->> Redis: 检查缓存
    alt 缓存命中
        Redis -->> Backend: 返回缓存的工商数据
        Backend -->> Frontend: 返回工商数据
    else 缓存未命中
        Backend ->> DeepSeek: 调用DeepSeek API（¥0.0002/次）
        DeepSeek -->> Backend: 返回工商数据（JSON）
        Backend ->> Backend: 解析并验证数据
        Backend ->> Redis: 缓存到Redis（过期时间7天）
        Backend -->> Frontend: 返回工商数据
    end
    Frontend ->> Frontend: 自动填充表单
    销售 ->> Frontend: 手动修改字段（如需要）
    销售 ->> Frontend: 点击"提交"
    Frontend ->> Backend: POST /api/customers/
    Backend ->> Database: 创建客户记录
    Backend -->> Frontend: 返回客户详情
    Frontend -->> 销售: 显示客户详情页
```

---

### 4.2 外销客户WhatsApp消息同步流程

```mermaid
sequenceDiagram
    actor 客户
    participant WhatsApp as WhatsApp
    participant Webhook as 360dialog Webhook
    participant Backend as 后端
    participant Database as 数据库
    actor 销售
    
    客户 ->> WhatsApp: 发送消息给销售
    WhatsApp ->> Webhook: 推送消息（Webhook）
    Webhook ->> Backend: POST /api/whatsapp/webhook
    Backend ->> Backend: 验证消息签名
    Backend ->> Database: 存储到communication_records表
    Backend -->> Webhook: 返回200 OK
    
    销售 ->> Backend: 打开客户详情页的"沟通"Tab
    Backend ->> Database: 查询沟通记录
    Database -->> Backend: 返回沟通记录列表
    Backend -->> 销售: 显示沟通记录（含WhatsApp消息）
    
    销售 ->> Backend: 点击"回复"（WhatsApp）
    Backend ->> WhatsApp: 调用360dialog API发送消息
    WhatsApp -->> 客户: 收到消息
    Backend ->> Database: 存储发送的消息
    Backend -->> 销售: 显示发送成功
```

---

### 4.3 客户信息变更审批流（接入工作流引擎）

```mermaid
sequenceDiagram
    actor 销售
    participant Frontend as 前端
    participant Backend as 后端
    participant WorkflowEngine as 工作流引擎
    participant Database as 数据库
    actor 主管
    actor 财务
    
    销售 ->> Frontend: 修改客户信息
    Frontend ->> Backend: POST /api/customer-changes/
    Backend ->> Database: 创建变更申请（status=pending）
    Backend ->> WorkflowEngine: 发起工作流实例
    WorkflowEngine ->> Database: 创建工作流实例
    Backend -->> Frontend: 返回成功
    
    Backend ->> 主管: 企微通知（有新审批）
    
    主管 ->> Frontend: 查看变更申请
    Frontend ->> Backend: GET /api/customer-changes/{id}
    Backend -->> Frontend: 返回详情
    主管 ->> Frontend: 点击"审批通过"
    Frontend ->> Backend: POST /api/customer-changes/{id}/approve
    Backend ->> WorkflowEngine: 执行工作流
    WorkflowEngine ->> Database: 更新工作流实例
    WorkflowEngine ->> 财务: 系统内抄送 + 企微通知
    WorkflowEngine ->> Database: 更新客户信息
    Backend -->> Frontend: 返回成功
    
    财务 ->> 财务: 收到企微通知（客户信息变更）
```

---

### 4.4 统一沟通视图展示流程

```mermaid
sequenceDiagram
    actor 销售
    participant Frontend as 前端
    participant Backend as 后端
    participant Database as 数据库
    
    销售 ->> Frontend: 打开客户详情页"沟通"Tab
    Frontend ->> Backend: GET /api/communication-records/?customer_id=XXX
    Backend ->> Database: 查询沟通记录（所有渠道）
    Database -->> Backend: 返回记录列表
    Backend -->> Frontend: 返回记录
    Frontend ->> Frontend: 显示统一沟通视图
    Note over 销售, Frontend: 显示所有渠道消息<br/>（企微、WhatsApp、邮件、电话）
    
    销售 ->> Frontend: 筛选渠道（如只显示WhatsApp）
    Frontend ->> Backend: GET /api/communication-records/?channel=whatsapp
    Backend -->> Frontend: 返回WhatsApp记录
    Frontend ->> Frontend: 更新列表
    
    销售 ->> Frontend: 点击"一键联系"（WhatsApp）
    Frontend ->> Frontend: 打开WhatsApp聊天（新窗口）
```

---

### 4.5 低代码配置工作流流程

```mermaid
sequenceDiagram
    actor 管理员
    participant Frontend as 前端
    participant Backend as 后端
    participant Database as 数据库
    
    管理员 ->> Frontend: 打开"工作流配置"页面
    Frontend ->> Backend: GET /api/workflows/
    Backend -->> Frontend: 返回工作流列表
    
    管理员 ->> Frontend: 点击"创建审批流"
    Frontend ->> Frontend: 显示配置表单
    管理员 ->> Frontend: 填写配置（节点、审批人、抄送人）
    管理员 ->> Frontend: 点击"保存"
    Frontend ->> Backend: POST /api/workflows/
    Backend ->> Database: 创建工作流定义
    Backend ->> Database: 创建工作流节点
    Backend -->> Frontend: 返回成功
    
    管理员 ->> Frontend: 点击"启用工作流"
    Frontend ->> Backend: PUT /api/workflows/{id}
    Backend -->> Frontend: 返回成功
    Note over 管理员, Backend: 后续发起变更申请时<br/>自动使用此工作流
```

---

### 4.6 线索公海池自动回流流程

```mermaid
sequenceDiagram
    participant Scheduler as 定时任务
    participant Backend as 后端
    participant Database as 数据库
    participant WeCom as 企微
    
    Scheduler ->> Backend: 每天凌晨2点触发
    Backend ->> Database: 查询超时线索
    Database -->> Backend: 返回超时线索列表
    
    loop 每个超时线索
        Backend ->> Database: 更新线索状态（returned_to_pool）
        Backend ->> Database: 插入公海池记录
        Backend ->> WeCom: 发送企微通知
        WeCom -->> 销售: 收到通知（公海池回流）
    end
    
    Backend -->> Scheduler: 执行完成
```

---

**继续阅读**: [Part 5: 任务分解](./system_design_part5_tasks.md)
