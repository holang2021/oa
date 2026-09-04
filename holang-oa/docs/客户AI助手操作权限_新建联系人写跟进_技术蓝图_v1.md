# 客户 AI 助手 · 操作权限（新建联系人 / 写跟进）技术蓝图 V1

> 状态：**已落地·待验收（2026-08-06）** — 刘总确认开工，后端 extract 端点 + 前端操作工具栏/预览弹窗已全链路开发并增量部署（后端 TAT 覆盖 customerAi.controller/service/routes 三文件 + pm2 restart；前端 vite build 产物 index-CvQccqHh.js 已上线）。服务器校验：三文件落位、PM2 online、未授权访问 extract 返回 401。待刘总浏览器实验收尾。

## 1. 诉求与决策
- 诉求：在客户详情页 AI 助手对话中，根据沟通内容，**新增两项操作权限**——从对话新建联系人、从对话写跟进记录。
- 已拍板决策：
  - **写入方式**：AI 仅抽取结构化草稿 → 弹窗预览/微调 → 人工确认后才落库（防幻觉污染 CRM）。
  - **触发方式**：AI 助手页底部常驻两个**显式按钮**（「＋新建联系人」「📝写跟进」），主动点击触发，不自动识别。

## 2. 复用闸门判定
| 能力 | 判定 | 说明 |
|---|---|---|
| 联系人新建 | **A 直接复用** | 已有 `POST /customers/:id/contacts`（前端 `createContact(customerId, data)`，后端 `customer.controller.ts` 内含 contact 创建） |
| 跟进写库 | **A 直接复用** | 已有 `POST /follow-ups`（前端 `createFollowUp({customerId, method, content, contactId, nextPlan...})`，后端 `followUp.controller.ts` createFollowUp） |
| 客户上下文聚合 | **A 直接复用** | `customerAi.service.ts` `buildCustomerContext` 已聚合档案/跟进/联系人/商机 |
| DeepSeek 凭证与调用 | **A 直接复用** | `api-config.service.getConfig('deepseek')` + `callDeepSeek` |
| AI 结构化抽取 | **C 新建** | 新增抽取端点（见 §3），复用上述上下文与 DeepSeek |

**结论**：无新业务表、无新落库逻辑；仅新增一个 AI 抽取端点 + 前端操作 UI，落库全部走既有接口。

## 3. 技术方案
### 3.1 后端（新增 1 个端点，挂在 `/api/v1/customer-ai`）
- `POST /:customerId/extract`
  - body：`{ type: 'contact' | 'followup', message?: string }`
  - 鉴权：复用 `authenticate` + 客户查看 RBAC（与 chat 一致，纯销售仅本人客户）。
  - 逻辑：
    1. 复用 `buildCustomerContext` 取客户资料 + 近 20 跟进 + 联系人。
    2. 取最近若干轮 AI 对话（如有 `message` 则优先用该消息）。
    3. 调 DeepSeek，要求**仅返回 JSON**（function-calling / 强约束 system 指令）：
       - contact：`{ name, position, dept, phone, email, wechat, whatsapp, isKeyPerson, remark }`（name 必填，缺失则返回 `{ needMore: true }`）。
       - followup：`{ method, content, nextPlan, contactId? }`（content 必填）。
    4. 后端做**字段白名单校验 + 类型清洗**，丢弃未知字段；contact.name 为空直接报错提示「对话中未识别到明确联系人姓名」。
  - 返回：`{ code:0, data: {...抽取结果} }`，前端拿到后预填表单。
- 不新增任何落库动作在此端点；落库仍由前端调既有 create 接口完成。

### 3.2 前端（`packages/oa/src/components/CustomerAiChat.tsx` + `customerAiService.ts`）
- 新增 `extractCustomerAi(customerId, type, message?)` 服务函数。
- 对话区底部新增**操作工具栏**：两个按钮「＋新建联系人」「📝写跟进」（在输入框上方一行）。
- 点击按钮 → 调 extract → 弹出**预览表单**（联系人字段 / 跟进字段），用户可编辑。
  - 联系人表单字段对齐 `Contact` 接口（name 必填、position/dept/phone/email/wechat/whatsapp/isKeyPerson/remark）。
  - 跟进表单字段对齐 `createFollowUp` 入参（method 下拉、content 必填、nextPlan、contactId 下拉取自该客户现有联系人）。
- 确认 → 调既有 `createContact` / `createFollowUp` → 成功 toast + 关闭弹窗。
- 权限提示：工具栏右侧标注「继承客户查看权限；写入前需确认」。

### 3.3 数据契约
- 抽取响应（contact）：
  ```json
  { "name": "Ahmed Hassan", "position": "技术总监", "dept": "技术部",
    "phone": "+20 100 123 4567", "email": "ahmed@cairooxygen.com",
    "wechat": null, "whatsapp": null, "isKeyPerson": true,
    "remark": "线上技术交流会确认，负责整线方案技术评估。" }
  ```
- 抽取响应（followup）：
  ```json
  { "method": "邮件", "content": "与 Cairo 技术总监 Ahmed 线上沟通…",
    "nextPlan": "本周内发送整线配置清单与报价", "contactId": null }
  ```

## 4. 边界与风险
- **绝不自动落库**：所有写入必须经人工确认弹窗。
- **字段清洗**：后端只接受白名单字段，AI 多给的字段一律丢弃，防越权/注入。
- **权限继承**：抽取与落库均受客户 RBAC 约束；纯销售只能对自己名下客户操作。
- **抽取失败友好提示**：未识别到姓名/内容时返回明确错误，不让用户点空表单。

## 5. 验收标准（可复核）
1. 客户详情 → AI 助手 Tab → 底部出现两个按钮，点击分别弹出联系人/跟进预览表单，且表单已被 AI 从对话抽取的草稿预填。
2. 联系人表单 name 为空时，抽取端点返回明确错误，前端提示「对话中未识别到明确联系人姓名」。
3. 确认写入后，联系人出现在该客户「联系人」Tab；跟进出现在「时间线/跟进」且能被既有列表查到。
4. 纯销售角色对他人客户点按钮 → 提示无权限（RBAC 拦截）。
5. 全程无 AI 自动写库行为。

## 6. 部署
- 后端：单文件/单端点增量部署（复用 `oa_deploy_backend_hotfix.py` 模式，tar `customerAi.controller.ts` + `customerAi.service.ts` + `customerAi.routes.ts` + `app.ts` 改动部分），`pm2 restart`。
- 前端：走 `oa_deploy_dist.py` 增量前端部署。
