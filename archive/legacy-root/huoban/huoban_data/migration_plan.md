# 伙伴云 → HOLANG CRM 迁移方案

**目标**：将伙伴云（4000000008001969）全部数据迁移到新建的 HOLANG CRM 系统，最终废弃伙伴云。

**迁移策略**：新建 HOLANG 后端 + MySQL 数据库，通过伙伴云 OpenAPI 读取数据并写入新系统，不修改伙伴云原有数据。

---

## 一、伙伴云表结构完整映射

### 1.1 核心业务表

#### 客户信息 → `customers`
| 伙伴云字段 | 类型 | 必填 | 新系统字段 | 说明 |
|------------|------|------|------------|------|
| 客户名称 | input | ✅ | `name` | |
| 编号 | input | | `code` | 自动生成规则待定 |
| 商机阶段 | category | ✅ | `followStage` | 线索/商机/报价/成交/丢单 |
| 线索来源 | relation | ✅ | `source` | 关联「客户来源」表 |
| 所属行业 | category | ✅ | `industry` | 电子加工/食品包装/生物制药等 |
| 其他行业 | input | ✅ | `industryOther` | |
| 公司规模 | category | | `scale` | 0-100人/101-300人/301-1000人/1000人以上 |
| 销售类别 | category | ✅ | `businessLine` | 国内/海外 |
| 地址 | location | | `address` | 省市区 |
| 详细地址 | input | | `addressDetail` | |
| 公司电话 | input | | `companyPhone` | |
| 统一信用代码 | input | | `creditCode` | |
| 发票类型 | category | | `invoiceType` | 普通发票/增值税专用发票 |
| 发票抬头 | input | | `taxTitle` | |
| 开户银行 | input | | `bankName` | |
| 银行账号 | input | | `bankAccount` | |
| 银行行号 | input | | `bankCode` | |
| 销售负责人 | relation | | `salesPerson` | 关联「员工档案」 |
| 所属部门 | relation | | `salesDept` | 关联「部门」 |
| 分配时间 | date | | `assignedAt` | |
| 上次跟进日期 | date | | `lastFollowAt` | |
| 下次跟进日期 | date | | `nextFollowAt` | |
| 跟进超时 | category | | `overdueFollow` | 已及时跟进/超时未跟进 |
| 成交金额 | calculation | | `dealAmount` | 统计字段 |
| 成交次数 | calculation | | `dealCount` | 统计字段 |
| 回款金额 | calculation | | `paidAmount` | 统计字段 |
| 待回款金额 | calculation | | `unpaidAmount` | 统计字段 |
| 备注 | rich | | `remark` | |
| 相关附件 | file | | `attachments` | 文件 URL 数组 |
| UserID | input | | `userId` | 企微 UserID |
| 公司官网 | input | | `website` | |
| 数据ID | input | | `huobanId` | 伙伴云原始 ID，迁移后保留 |

#### 销售线索 → `leads`
| 伙伴云字段 | 类型 | 必填 | 新系统字段 | 说明 |
|------------|------|------|------------|------|
| 客户名称 | input | ✅ | `name` | |
| 联系人姓名 | input | ✅ | `contactName` | |
| 手机号 | input | | `phone` | |
| 邮箱 | input | | `email` | |
| 所属行业 | relation | | `industry` | 关联「所属行业」 |
| 地区 | category | ✅ | `region` | |
| 线索渠道 | relation | | `channel` | 关联「渠道来源」 |
| 线索状态 | category | | `status` | 待分配/已分配/无效/已转化 |
| 销售负责人 | relation | | `ownerId` | 关联「员工档案」 |
| 录入日期 | date | | `createdAt` | |
| 分配/领取日期 | date | | `assignedAt` | |
| 最新跟进日期 | date | | `lastFollowAt` | |
| 下次跟进日期 | date | | `nextFollowAt` | |
| 跟进是否超时 | category | | `overdueFollow` | |
| 是否转化 | calculation | | `isConverted` | |
| 转化客户数 | calculation | | `convertedCount` | |
| 分数 | numeric | | `score` | 线索打分 |
| 数据ID | input | | `huobanId` | |

#### 商机 → `opportunities`
| 伙伴云字段 | 类型 | 必填 | 新系统字段 | 说明 |
|------------|------|------|------------|------|
| 所属客户 | relation | ✅ | `customerId` | 关联客户信息 |
| 商机名称 | input | ✅ | `name` | |
| 商机编号 | input | | `code` | |
| 商机获取日期 | date | ✅ | `createdAt` | |
| 商机里程碑 | category | ✅ | `stage` | 初步交流/需求沟通/方案报价/谈判审核/赢单/输单取消 |
| 输单原因 | category | | `lostReason` | 客户需求消失/价格不满足/产品不匹配 |
| 预计成交日期 | date | ✅ | `expectedCloseDate` | |
| 预计成交金额 | money | ✅ | `expectedAmount` | |
| 负责人 | relation | | `ownerId` | 关联员工档案 |
| 协作人 | relation | | `collaborators` | 多值 |
| 成交概率 | numeric | | `winRate` | % |
| 销售原价总额 | calculation | | `totalAmount` | |
| 优惠金额 | money | | `discountAmount` | |
| 销售订单金额 | calculation | | `finalAmount` | |
| 订单毛利率 | calculation | | `grossMargin` | % |
| 跟进是否超时 | category | | `overdueFollow` | |
| 数据ID | input | | `huobanId` | |

#### 报价单 → `quotations`
| 伙伴云字段 | 类型 | 必填 | 新系统字段 | 说明 |
|------------|------|------|------------|------|
| 报价单编号 | input | | `code` | |
| 报价日期 | date | ✅ | `createdAt` | |
| 所属客户 | relation | ✅ | `customerId` | |
| 所属商机 | relation | ✅ | `opportunityId` | |
| 负责人 | relation | ✅ | `ownerId` | |
| 销售原价总额 | calculation | | `totalAmount` | |
| 优惠金额 | money | | `discountAmount` | |
| 整单折扣率 | calculation | | `discountRate` | % |
| 销售订单金额（税后） | calculation | | `finalAmount` | |
| 审批状态 | category | | `approvalStatus` | 待审批/审批中/已驳回/已通过/已撤销 |
| 流程状态 | category | | `flowStatus` | 执行中/已完成同意/已完成不同意/已撤销/已关闭/异常中 |
| 商机阶段 | category | ✅ | `stage` | 线索/商机/报价/成交/丢单 |
| 数据ID | input | | `huobanId` | |

**报价单明细** → `quotation_items`（关联报价单，307 条记录）
| 字段 | 说明 |
|------|------|
| 产品名称 | input |
| 规格型号 | input |
| 计量单位 | input |
| 数量 | numeric |
| 单价 | money |
| 币种 | category |
| 汇率 | numeric |
| 小计(未税) | calculation |

#### 订单 → `orders`
| 伙伴云字段 | 类型 | 必填 | 新系统字段 | 说明 |
|------------|------|------|------------|------|
| 订单编号 | input | | `code` | |
| 订单日期 | date | ✅ | `orderDate` | |
| 期望发货日期 | date | | `expectedDeliveryDate` | |
| 客户信息 | relation | ✅ | `customerId` | |
| 销售负责人 | relation | ✅ | `ownerId` | |
| 签约主体 | relation | ✅ | `contractEntity` | 关联「签约主体」 |
| 所属商机 | relation | | `opportunityId` | |
| 所属报价单 | relation | | `quotationId` | |
| 销售类型 | category | ✅ | `salesType` | 直销/间销 |
| 销售类别 | category | ✅ | `businessLine` | 内销/外贸 |
| 终端用户 | relation | | `endUser` | |
| 产品类型 | category | | `productType` | 成品/备件 |
| 订单状态 | category | | `status` | 未完成/已完成 |
| 付款方式 | input | ✅ | `paymentMethod` | |
| 增值税税率 | numeric | | `taxRate` | % |
| 销售订单金额（含税） | calculation | | `amountWithTax` | |
| 优惠金额 | money | | `discountAmount` | |
| 整单折扣 | calculation | | `discountRate` | % |
| 销售订单金额（未税） | calculation | | `amountWithoutTax` | |
| 产品成本总额 | calculation | | `totalCost` | |
| 订单毛利率 | calculation | | `grossMargin` | % |
| 待回款金额 | calculation | | `unpaidAmount` | |
| 已回款金额 | calculation | | `paidAmount` | |
| 已开票金额 | calculation | | `invoicedAmount` | |
| 收货人 | input | | `receiver` | |
| 联系方式 | input | | `receiverPhone` | |
| 省份 | relation | | `province` | |
| 收货地址 | input | | `deliveryAddress` | |
| 发票抬头 | input | | `invoiceTitle` | |
| 统一信用代码 | input | | `creditCode` | |
| 发票类型 | category | | `invoiceType` | |
| 公司地址 | input | | `companyAddress` | |
| 开户银行 | input | | `bankName` | |
| 银行账号 | input | | `bankAccount` | |
| 电话号码 | input | | `phone` | |
| 审批状态 | category | | `approvalStatus` | 待审批/审批中/已驳回/已通过/已撤销 |
| 流程状态 | category | | `flowStatus` | 执行中/已完成同意/已完成不同意/已撤销/已关闭/异常中 |
| 奖金比例 | numeric | ✅ | `bonusRate` | % |
| 提成 | calculation | | `commission` | |
| 数据ID | input | | `huobanId` | |

**订单明细** → `order_items`（关联订单，382 条记录）
| 字段 | 说明 |
|------|------|
| 产品名称 | input |
| 规格型号 | input |
| 计量单位 | input |
| 数量 | numeric |
| 单价 | money |
| 币种 | category |
| 汇率 | numeric |
| 实际售价（含税） | calculation |
| 成本单价 | money |
| 设备编号 | input |
| 产品 | relation | 关联「产品表」 |

#### 回款单 → `payments`
| 伙伴云字段 | 类型 | 必填 | 新系统字段 | 说明 |
|------------|------|------|------------|------|
| 回款单编号 | input | | `code` | |
| 申请时间 | date | ✅ | `createdAt` | |
| 回款日期 | date | | `paymentDate` | |
| 所属客户 | relation | ✅ | `customerId` | |
| 订单信息 | relation | ✅ | `orderId` | |
| 回款方式 | category | ✅ | `paymentMethod` | 银行转账TT/现金/承兑汇票/信用证LC |
| 客户付款账户 | input | | `payerAccount` | |
| 本次回款金额(元) | money | ✅ | `amount` | |
| 本次回款比例 | calculation | | `paymentRate` | % |
| 财务确认回款 | category | | `financeConfirm` | 回款确认/回款待确认/已撤消 |
| 财务确认开票 | category | | `invoiceConfirm` | 已开票 |
| 财务确认日期 | date | | `financeConfirmDate` | |
| 备注 | input | | `remark` | |
| 回款凭证 | image | | `voucher` | 图片 URL |
| 申请人 | relation | | `applicantId` | 关联员工档案 |
| 流程状态 | category | | `flowStatus` | 执行中/已完成同意/已完成不同意/已撤销/已关闭/异常中 |
| 数据ID | input | | `huobanId` | |

---

### 1.2 审批流结构

伙伴云审批流通过以下字段组合实现（每张需要审批的表都有）：

| 字段 | 类型 | 说明 |
|------|------|------|
| 审批状态 | category | 待审批/审批中/已驳回/已通过/已撤销 |
| 流程状态 | category | 执行中/已完成（同意）/已完成（不同意）/已撤销/已关闭/异常中 |
| 流程进展 | input | 当前节点说明 |
| 流程发起人 | user | 发起人企微 UserID |
| 流程启动时间 | date | |
| 流程结束时间 | date | |

**涉及审批流的表**：
- 订单（审批状态 + 流程状态）
- 报价单（审批状态 + 流程状态）
- 回款单（财务确认回款 + 财务确认开票 + 流程状态）
- 开票申请（审批状态 + 流程状态）
- 发货申请（当前流程状态 + 审批状态 + 流程状态）
- 退货（流程状态）
- 退款（状态 + 流程状态）
- 客户转交申请（状态 + 流程状态）

**新系统审批流设计**：
- 新建 `approvals` 表，统一存储所有审批请求
- 字段：`id, entityType, entityId, approvalStatus, flowStatus, currentNode, initiatorId, startTime, endTime, remarks`
- 每张业务表增加 `approvalId` 关联 `approvals` 表

---

### 1.3 辅助表

#### 客户联系人 → `contacts`
| 字段 | 说明 |
|------|------|
| 客户信息(relation) | 关联客户 |
| 联系人类型 | 决策人/使用人/影响人 |
| 联系人姓名 | |
| 联系电话 | |
| 是否为关键决策人(KP) | |
| 性别 | |
| 联系人职务 | |
| 部门 | |
| 微信号 | |
| 邮箱 | |
| 备注 | |

#### 客户跟进 → `followups`
| 字段 | 说明 |
|------|------|
| 所属客户(relation) | |
| 跟进类型 | 电话/拜访/微信/邮件 |
| 跟进日期 | |
| 跟进内容 | |
| 下次跟进日期 | |
| 跟进人 | |

#### 开票申请 → `invoices`
| 字段 | 说明 |
|------|------|
| 订单信息(relation) | |
| 开票金额 | |
| 发票类型 | |
| 审批状态 | |
| 流程状态 | |

#### 发货申请 → `deliveries`
| 字段 | 说明 |
|------|------|
| 订单信息(relation) | |
| 发货日期 | |
| 物流公司 | |
| 运单号 | |
| 发货清单 | 关联「发货清单」 |
| 当前流程状态 | |
| 审批状态 | |

#### 售后宝 → `aftersales`
| 字段 | 说明 |
|------|------|
| 所属客户(relation) | |
| 设备信息 | |
| 售后类型 | 维修/保养/更换 |
| 售后日期 | |
| 售后内容 | |
| 费用 | |
| 负责人 | |

#### 员工档案 → `users`（新系统用户表）
| 伙伴云字段 | 新系统字段 | 说明 |
|------------|------------|------|
| 员工姓名 | `name` | |
| 员工账号(user) | `userId` | 企微 UserID |
| 岗位 | `role` | 关联「岗位」 |
| 所属部门(relation) | `department` | |
| 手机号 | `phone` | |
| 邮箱 | `email` | |

#### 签约主体 → `contract_entities`
| 字段 | 说明 |
|------|------|
| 主体名称 | |
| 统一信用代码 | |
| 地址 | |
| 开户银行 | |
| 银行账号 | |
| 电话 | |

#### 所属行业 → `industries`（枚举表）
#### 部门 → `departments`（枚举表）
#### 岗位 → `roles`（枚举表）
#### 渠道来源 → `channels`（枚举表）
#### 客户来源 → `sources`（枚举表）
#### 当前汇率 → `exchange_rates`（配置表）

---

## 二、数据迁移步骤

### Step 1：创建新系统数据库
基于以上表结构设计 MySQL 数据库，包含：
- 核心业务表：customers/leads/opportunities/quotations/orders/order_items/payments
- 审批流表：approvals
- 辅助表：contacts/followups/invoices/deliveries/aftersales
- 配置表：users/contract_entities/industries/departments/roles/channels/sources/exchange_rates

### Step 2：创建数据迁移脚本
**文件**：`huoban_migration.py`

流程：
1. 读取伙伴云 OpenAPI 配置（Space ID + API Key）
2. 按依赖顺序迁移：
   - 先迁移配置表（行业/部门/岗位/渠道/客户来源/签约主体/汇率/员工档案）
   - 再迁移核心业务表（客户 → 联系人 → 线索 → 商机 → 报价 → 订单 → 订单明细 → 回款 → 跟进记录）
   - 最后迁移审批流数据
3. 每个记录保留 `huobanId`（伙伴云原始 ID），用于关联字段映射
4. 关联字段处理：relation 类型存的是伙伴云的 item_id，需要映射为新系统的主键 ID

### Step 3：验证数据完整性
- 记录数对比（伙伴云 vs 新系统）
- 关键字段值对比（金额/日期/状态）
- 关联完整性检查（客户→订单→回款链路）

### Step 4：上线切换
1. 新系统开发完成并测试通过
2. 执行全量数据迁移（停机窗口）
3. 验证数据无误后，切换 DNS/访问入口到新系统
4. 伙伴云设为只读，保留 1 个月用于数据核对
5. 确认无误后废弃伙伴云

---

## 三、新系统开发计划

### Phase 1：后端 API 开发（Node.js + Express + MySQL）
1. 数据库表创建（基于上述结构设计）
2. RESTful API 开发（客户/线索/商机/报价/订单/回款 CRUD）
3. 审批流 API（统一 approvals 表）
4. 文件上传 API（回款凭证/合同附件等）
5. 认证中间件（JWT + 企微 UserID 验证）

### Phase 2：前端对接后端 API
1. 修改 holang-crm 前端，将 mockData 替换为真实 API 调用
2. 保留伙伴云字段映射层（`huobanMapper.ts`）用于迁移期双写

### Phase 3：数据迁移
1. 运行 `huoban_migration.py` 全量迁移
2. 增量同步（迁移后新增数据）

### Phase 4：测试与上线
1. 功能测试（基于伙伴云现有数据场景）
2. 性能测试
3. 上线切换

---

## 四、需要您确认的事项

1. **新系统后端技术栈**：建议 Node.js + Express + MySQL（与伙伴云类似，便于迁移）
2. **部署方式**：阿里云 ECS + RDS（MySQL）？还是其他？
3. **企微 UserID 映射**：伙伴云「员工档案」的「员工账号(user)」字段是否是企微 UserID？需要确认用于新系统登录认证
4. **审批流复杂度**：伙伴云的审批流是简单状态字段，还是有关联的审批人/节点配置？需要查看伙伴云后台确认
5. **文件/附件迁移**：伙伴云的 file/image 字段存的是文件 URL，需要下载后重新上传到新系统的存储（如阿里云 OSS）

---

## 五、立即开始的工作

如果您确认上述方案，我可以立即开始：

1. **创建新系统数据库设计文档**（`holang_crm_schema.sql`）
2. **创建数据迁移脚本**（`huoban_migration.py`）
3. **修改 holang-crm 前端**，先对接伙伴云 API（作为过渡），同时开发新后端

**建议优先顺序**：
- 先完成新系统数据库设计 ✅
- 再开发后端 API ✅
- 同时修改前端对接后端（替换 mock）✅
- 最后执行数据迁移 ✅

请告知您的选择。
