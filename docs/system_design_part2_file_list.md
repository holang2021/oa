# HOLANG CRM Phase 1 系统架构设计 v2.0 - Part 2: 文件清单

**文档版本**: v2.0  
**创建日期**: 2025-01-15  
**作者**: Bob（软件架构师）  
**状态**: 待审核

---

## 2. 文件清单

### 2.1 前端文件（85个）

**项目配置（7个）**：
```
frontend/
├── package.json                      # 项目配置
├── vite.config.ts                    # Vite配置
├── tsconfig.json                     # TypeScript配置
├── index.html                        # 入口HTML
├── env.development                    # 开发环境变量
├── env.production                     # 生产环境变量
└── Dockerfile                        # 前端容器配置
```

**路由和状态管理（5个）**：
```
frontend/src/
├── router/
│   └── index.ts                      # 路由配置（内销/外销菜单）
├── stores/
│   ├── auth.ts                       # 认证状态
│   ├── customer.ts                    # 客户状态
│   ├── lead.ts                       # 线索状态
│   ├── communication.ts               # 沟通记录状态（新增 - v2.0）
│   └── workflow.ts                    # 工作流状态（新增 - v2.0）
└── types/
    ├── customer.ts                    # 客户类型
    ├── lead.ts                        # 线索类型
    ├── communication.ts               # 沟通记录类型（新增 - v2.0）
    └── workflow.ts                     # 工作流类型（新增 - v2.0）
```

**API调用封装（10个）**：
```
frontend/src/api/
├── auth.ts                           # 认证API
├── customer.ts                        # 客户API
├── lead.ts                           # 线索API
├── contract.ts                        # 合同API
├── weeklyReport.ts                    # 周报API
├── communication.ts                   # 沟通记录API（新增 - v2.0）
├── whatsapp.ts                        # WhatsApp API（新增 - v2.0）
├── email.ts                           # 邮件API（新增 - v2.0）
├── workflow.ts                        # 工作流API（新增 - v2.0）
└── systemConfig.ts                    # 系统配置API
```

**页面组件（35个）**：

*内销模块（20个）*：
```
frontend/src/pages/
├── customer/
│   ├── CustomerListPage.vue           # 客户列表页
│   ├── CustomerDetailPage.vue         # 客户详情页（含"沟通"Tab）
│   └── CustomerFormPage.vue           # 客户创建/编辑页（含DeepSeek查询按钮）
├── lead/
│   ├── LeadListPage.vue               # 线索列表页
│   ├── LeadDetailPage.vue             # 线索详情页
│   └── LeadFormPage.vue               # 线索创建/编辑页
├── pipeline/
│   └── PipelinePage.vue               # Pipeline看板页
├── contract/
│   ├── ContractListPage.vue           # 合同列表页
│   ├── ContractDetailPage.vue         # 合同详情页
│   └── ContractFormPage.vue           # 合同创建/编辑页
├── weekly-report/
│   ├── WeeklyReportListPage.vue       # 周报列表页
│   ├── WeeklyReportEditPage.vue       # 周报编辑页（含AI生成草稿）
│   └── WeeklyReportReviewPage.vue     # 周报审批页
└── public-sea/
    ├── PublicSeaPoolPage.vue          # 公海池页面
    └── PublicSeaConfigPage.vue        # 公海池配置页（admin）
```

*外销模块（15个）*：
```
frontend/src/pages/
├── customer/
│   └── CustomerDetailPageExternal.vue # 外销客户详情页（含WhatsApp/邮件）
├── inquiry/
│   ├── InquiryListPage.vue            # 询盘列表页（预留接口）
│   └── InquiryDetailPage.vue          # 询盘详情页（预留接口）
├── whatsapp/
│   ├── WhatsAppBindPage.vue           # WhatsApp绑定页
│   └── WhatsAppChatPage.vue           # WhatsApp聊天页（集成WhatsApp Web）
├── email/
│   ├── EmailInboxPage.vue             # 邮件收件箱页
│   └── EmailComposePage.vue           # 邮件撰写页
└── communication/
    └── UnifiedCommunicationPage.vue   # 统一沟通视图页（所有渠道）
```

**操作后台（10个）**：
```
frontend/src/pages/admin/
├── DashboardPage.vue                  # 操作后台首页
├── UserManagementPage.vue             # 用户管理页
├── SystemConfigPage.vue               # 系统配置页
├── WorkflowConfigPage.vue             # 工作流配置页（新增 - v2.0）
├── DataDictionaryPage.vue              # 数据字典配置页（新增 - v2.0）
├── CustomerChangeRecordsPage.vue      # 客户变更记录页（审计）
├── CommunicationLogsPage.vue          # 沟通记录查询页（新增 - v2.0）
├── WeeklyReportConfigPage.vue         # 周报配置页（AI模板配置）
└── AuditLogsPage.vue                  # 操作日志页
```

**官网（8个）**：
```
frontend/src/pages/website/
├── HomePage.vue                       # 官网首页
├── AboutPage.vue                      # 关于我们
├── ProductsPage.vue                   # 产品中心
├── CasesPage.vue                      # 案例展示
├── ContactPage.vue                    # 联系我们
├── LoginPage.vue                      # 登录页（含企微免登录）
└── PrivacyPolicyPage.vue              # 隐私政策
```

**业务组件（20个）**：

*内销组件（12个）*：
```
frontend/src/components/customer/
├── CustomerList.vue                   # 客户列表
├── CustomerDetail.vue                 # 客户详情
├── CustomerForm.vue                   # 客户表单（含DeepSeek查询按钮）
├── ContactList.vue                    # 联系人列表
├── ContactForm.vue                    # 联系人表单
├── FollowUpList.vue                   # 跟进记录列表
└── FollowUpForm.vue                   # 跟进记录表单

frontend/src/components/communication/
├── CommunicationTab.vue               # 沟通Tab（客户详情页）
├── CommunicationList.vue              # 沟通记录列表
├── CommunicationDetail.vue            # 沟通记录详情
├── CommunicationForm.vue              # 手动记录沟通表单
└── QuickContactButton.vue             # 一键联系按钮
```

*外销组件（8个）*：
```
frontend/src/components/whatsapp/
├── WhatsAppBindDialog.vue             # WhatsApp绑定对话框
├── WhatsAppChatBox.vue                # WhatsApp聊天框
└── WhatsAppMessageList.vue            # WhatsApp消息列表

frontend/src/components/email/
├── EmailInboxList.vue                 # 邮件收件箱列表
├── EmailComposeDialog.vue             # 邮件撰写对话框
└── EmailDetailDialog.vue               # 邮件详情对话框

frontend/src/components/communication/
├── UnifiedCommunicationView.vue        # 统一沟通视图
└── CommunicationChannelFilter.vue     # 沟通渠道筛选
```

### 2.2 后端文件（95个）

**项目配置（8个）**：
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                        # FastAPI应用入口
│   ├── config.py                      # 配置（数据库、Redis、DeepSeek）
│   ├── dependencies.py                # 依赖注入
│   └── constants.py                   # 常量定义
├── requirements.txt                   # Python依赖
├── alembic.ini                        # Alembic配置
├── env.development                     # 开发环境变量
├── env.production                      # 生产环境变量
└── Dockerfile                         # 后端容器配置
```

**数据模型（15个）**：
```
backend/app/models/
├── user.py                           # 用户模型（含sales_type、whatsapp_account）
├── customer.py                       # 客户模型（含sales_type、工商数据字段）
├── contact.py                        # 联系人模型
├── communication_record.py           # 沟通记录模型（新增 - v2.0）
├── follow_up.py                      # 跟进记录模型
├── opportunity.py                    # 商机模型
├── contract.py                       # 合同模型
├── weekly_report.py                  # 周报模型
├── lead.py                           # 线索模型
├── public_sea_config.py              # 公海池配置模型
├── system_config.py                  # 系统配置模型
├── customer_change_request.py        # 客户变更申请模型
├── workflow.py                       # 工作流定义模型（新增 - v2.0）
├── workflow_node.py                  # 工作流节点模型（新增 - v2.0）
└── workflow_instance.py             # 工作流实例模型（新增 - v2.0）
```

**验证模型（15个）**：
```
backend/app/schemas/
├── user.py                           # 用户验证模型
├── customer.py                       # 客户验证模型
├── contact.py                        # 联系人验证模型
├── communication_record.py           # 沟通记录验证模型（新增 - v2.0）
├── opportunity.py                    # 机会验证模型
├── contract.py                       # 合同验证模型
├── weekly_report.py                  # 周报验证模型
├── lead.py                           # 线索验证模型
├── system_config.py                  # 系统配置验证模型
├── customer_change_request.py        # 客户变更申请验证模型
├── workflow.py                       # 工作流定义验证模型（新增 - v2.0）
├── workflow_node.py                  # 工作流节点验证模型（新增 - v2.0）
├── workflow_instance.py             # 工作流实例验证模型（新增 - v2.0）
├── whatsapp.py                       # WhatsApp验证模型（新增 - v2.0）
└── email.py                          # 邮件验证模型（新增 - v2.0）
```

**API路由（20个）**：
```
backend/app/api/
├── auth.py                           # 认证API
├── users.py                          # 用户管理API
├── customers.py                      # 客户管理API（含DeepSeek查询）
├── contacts.py                       # 联系人API
├── communication_records.py          # 沟通记录API（新增 - v2.0）
├── opportunities.py                  # 商机API
├── contracts.py                      # 合同API
├── weekly_reports.py                 # 周报API
├── leads.py                          # 线索API
├── public_sea.py                     # 公海池API
├── system_config.py                  # 系统配置API
├── customer_changes.py               # 客户变更申请API
├── workflows.py                      # 工作流API（新增 - v2.0）
├── whatsapp.py                       # WhatsApp API（新增 - v2.0）
├── email.py                          # 邮件API（新增 - v2.0）
├── upload.py                         # 文件上传API
├── wecom.py                          # 企微集成API
├── dashboard.py                      # 操作后台API
└── audit.py                          # 审计日志API（新增 - v2.0）
```

**业务逻辑（20个）**：
```
backend/app/services/
├── auth_service.py                   # 认证服务
├── user_service.py                   # 用户服务
├── customer_service.py               # 客户服务
├── communication_service.py          # 沟通记录服务（新增 - v2.0）
├── opportunity_service.py            # 商机服务
├── contract_service.py                # 合同服务
├── weekly_report_service.py           # 周报服务
├── ai_report_generator.py            # AI周报生成服务
├── lead_service.py                   # 线索服务
├── public_sea_service.py             # 公海池服务
├── ai_service.py                     # DeepSeek工商查询服务
├── workflow_engine.py                # 工作流引擎服务（新增 - v2.0）
├── whatsapp_service.py               # WhatsApp同步服务（新增 - v2.0）
├── email_service.py                  # 邮件同步服务（新增 - v2.0）
├── wecom_notification.py            # 企微通知服务
├── wecom_integration.py             # 企微集成服务
├── audit_service.py                  # 审计服务（新增 - v2.0）
└── data_sync_service.py              # 数据同步服务（新增 - v2.0）
```

**数据库迁移（10个）**：
```
backend/app/db/migrations/
├── 001_create_users.py
├── 002_create_customers.py
├── 003_create_contacts.py
├── 004_create_communication_records.py   # 新增（v2.0）
├── 005_create_opportunities.py
├── 006_create_contracts.py
├── 007_create_weekly_reports.py
├── 008_create_leads.py
├── 009_create_workflow_tables.py         # 新增（v2.0）
└── 010_add_sales_type_to_users.py        # 新增（v2.0）
```

**定时任务（5个）**：
```
backend/tasks/
├── scheduled_tasks.py                # 定时任务（公海池回流）
├── whatsapp_sync_task.py             # WhatsApp同步任务（新增 - v2.0）
├── email_sync_task.py                # 邮件同步任务（新增 - v2.0）
├── communication_sync_task.py        # 沟通记录同步任务（新增 - v2.0）
└── audit_cleanup_task.py            # 审计日志清理任务（新增 - v2.0）
```

**集成（5个）**：
```
backend/app/integrations/
├── deepseek.py                       # DeepSeek API集成
├── wecom.py                          # 企微API集成
├── whatsapp.py                       # WhatsApp Business API集成（新增 - v2.0）
├── email.py                          # 邮件API集成（新增 - v2.0）
└── redis_client.py                   # Redis客户端
```

**测试（7个）**：
```
backend/tests/
├── test_auth.py
├── test_customers.py
├── test_communication.py             # 新增（v2.0）
├── test_workflows.py                 # 新增（v2.0）
├── test_whatsapp.py                  # 新增（v2.0）
├── test_email.py                     # 新增（v2.0）
└── test_integration.py
```

### 2.3 部署配置文件（12个）

```
/
├── docker-compose.yml                 # Docker Compose配置（完整多服务）
├── docker-compose.dev.yml            # 开发环境配置
├── nginx.conf                         # Nginx配置（前端 + 后端 + 官网）
├── .env.example                       # 环境变量示例（含WhatsApp、邮件配置）
├── deploy.sh                          # 部署脚本
├── backup.sh                          # 备份脚本（数据库 + 文件）
├── monitor.sh                        # 监控脚本（CPU/内存/磁盘）
├── frontend/Dockerfile               # 前端容器配置
├── backend/Dockerfile                # 后端容器配置
├── nginx/Dockerfile                   # Nginx容器配置
├── redis/Dockerfile                   # Redis容器配置
└── postgres/Dockerfile               # PostgreSQL容器配置
```

### 2.4 文档文件（8个）

```
docs/
├── system_design.md                   # 系统架构设计（索引文件）
├── system_design_part1_overview.md    # Part 1: 实现方案
├── system_design_part2_file_list.md   # Part 2: 文件清单
├── system_design_part3_data_api.md    # Part 3: 数据结构与接口
├── system_design_part4_sequences.md   # Part 4: 程序调用流程
├── system_design_part5_tasks.md       # Part 5: 任务分解
├── system_design_part6_appendix.md    # Part 6: 附录
├── prd.md                             # 产品需求文档
├── api_documentation.md               # API文档
├── deployment_guide.md                # 部署指南
├── user_manual.md                     # 用户手册
├── admin_manual.md                    # 管理员手册
├── troubleshooting.md                 # 故障排查文档
└── changelog.md                       # 变更日志
```

---

**继续阅读**: [Part 3: 数据结构与接口](./system_design_part3_data_api.md)
