# 客户详情页内嵌 AI 对话组件 · 技术蓝图 V1（草稿／待会签）

> 作者：holang-tech-lead（信息化总监／建设落地负责人）
> 日期：2026-08-06
> 状态：**已落地 · 待验收**（2026-08-06 后端+前端已部署上线；功能验收由刘总浏览器实测）

---

## 0. 一句话目标
在客户详情页新增一个「AI 助手」Tab，给出**会话式**的客户梳理/总结/销售建议；对话**多轮、历史留存**；AI 每次都重新读取该客户最新资料（客户档案 + 跟进时间轴 + 联系人 + 商机）作为上下文，数据越多建议越准。

---

## 1. 复用闸门（六层优先级）
| 项 | 判定 | 理由 |
|----|------|------|
| 客户档案 / 跟进 / 联系人 / 商机数据 | **A 直接复用** | 已在 `Customer` / `FollowUp` / `Contact` / `Opportunity` 模型中，直接关联读取 |
| DeepSeek 凭证与调用范式 | **A 直接复用** | `api-config.service.getConfig('deepseek')` 已落地，凭证在服务器 `api-configs.json`（已预填真实 apiKey），`api-test.service.ts` 已验证连通 |
| AI 对话历史表 + 路由/服务/控制器 + 前端组件 | **C 新建** | 系统无对话基础设施，需新建 |

**结论**：属「增强型新建」——数据层与 LLM 凭证全部复用，仅新建对话存储与对话能力本身。

---

## 2. 选型对标（外部系统 → 可借鉴 / 可复用 / 自研）
| 外部系统 | 可借鉴 | 可复用 | 自研 |
|----------|--------|--------|------|
| Salesforce Einstein（CRM 内置 AI） | 客户画像自动生成、下一步最佳行动建议 | 无（闭源） | 轻量对话层 |
| HubSpot AI / 询盘云（外销 CRM）AI 跟进助手 | 跟进纪要自动摘要、流失预警话术 | 无 | 上下文拼接策略 |
| 飞书智能伙伴 | 对话式数据分析交互范式 | 无 | 前端对话框组件 |

**对标结论**：主流 CRM 的 AI 助手均为「数据上下文 + 大模型推理 + 对话 UI」三层结构。我们**复用自有 CRM 数据 + 复用 DeepSeek 推理**，自研薄对话层与上下文聚合，不自建模型。

---

## 3. 架构与边界（重要：AI「学习」的真实机制）
> ⚠️ **诚实声明**：本组件的「持续学习、随数据积累优化建议质量」**不是模型微调/训练**，而是**上下文累积**——每次对话都把该客户最新的档案+跟进+联系人+商机+近期对话重新喂给 DeepSeek。数据越全，上下文越准，建议自然越好。这是可落地、可审计的机制，而非黑盒自训练。

### 3.1 数据流
```
前端 CustomerAiChat
  → POST /customers/:id/ai/chat { message }
后端 customerAi.service:
  1. 取 DeepSeek 凭证（getConfig）→ 未配置则明确报错
  2. 聚合上下文：客户档案 + 近20条跟进 + 联系人 + 商机 + 近10轮历史对话
  3. 组装 system prompt（HOLANG 资深销售顾问人设）+ messages
  4. 调 DeepSeek /v1/chat/completions（model=deepseek-chat）
  5. 落库 user 消息 + assistant 消息
  6. 返回 { reply, messages }
```

### 3.2 角色边界（与 de-architect 分工）
- **本组件归 IT 系统（tech-lead 负责）**：组件、对话历史表、API、DeepSeek 服务端封装。
- **不越界**：不新建「AI 数字员工」实体；若刘总后续要把它纳入 de-arch 的 AI 员工平台统一调度，另行与 de-architect 协同，本蓝图不受影响。

---

## 4. 数据模型（新建）
```prisma
model CustomerAiMessage {
  id        String   @id @default(cuid())
  customerId String
  customer  Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  userId    String?  // 发起对话的销售（归因用，可空=系统）
  role      String   // 'user' | 'assistant'
  content   String   // 消息文本
  model     String?  // 如 'deepseek-chat'
  tokensIn  Int?
  tokensOut Int?
  createdAt DateTime @default(now())

  @@index([customerId, createdAt])
  @@index([userId])
  @@map("customer_ai_messages")
}
```
- **线程模型**：v1 每个客户**一条共享会话线程**（全员可见累积洞察，契合「团队协同推进客户」）。如需按销售隔离，v2 加 `sessionId`/`userId` 隔离（本期不做）。
- **级联**：删客户 → 对话历史一并删除（onDelete: Cascade）。

---

## 5. 后端接口契约
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/customers/:id/ai/history?limit=50` | 取该客户对话历史（按时间升序），用于前端初始化 |
| POST | `/api/v1/customers/:id/ai/chat` | body `{ message }` → `{ reply, messages }`，落库双消息 |
| POST | `/api/v1/customers/:id/ai/summary` | 按需生成结构化客户洞察（画像/需求变化/跟进状态/建议），可选缓存 |

**鉴权**：继承客户查看权限（RBAC）；admin/audit 可看全部。
**DeepSeek 调用**（服务端，apiKey 绝不前端暴露）：
```
POST https://api.deepseek.com/v1/chat/completions
Authorization: Bearer <apiKey>
{ model:"deepseek-chat", messages:[{role,content}...], temperature:0.7, max_tokens:1500 }
```
**上下文预算护栏**：跟进取近 20 条、对话取近 10 轮、单消息上限；超出按时间截断，防 token 溢出与成本失控。

---

## 6. 前端组件（新建）
- 文件：`packages/oa/src/components/CustomerAiChat.tsx`
- 挂载：在 `CustomerDetail.tsx` 的 `tabs` 数组追加 `{ key:'ai', label:'AI 助手' }`，新增 `{activeTab==='ai' && <CustomerAiChat customerId={id} />}` 分支（与现有 7 个 Tab 同构，自然嵌入）。
- UI：顶部「客户洞察」卡片（展示最近一次 AI 总结，或「生成洞察」按钮触发 `/ai/summary`）+ 下方对话区（助手左/用户右气泡、滚动到底、输入框+发送+加载态）。
- 响应式：flex 纵向布局、容器最大宽、复用现有 `.card/.input/.btn` 类名，桌面/窄屏自适应。

---

## 7. 代码规则（落地审查项）
- 分层：`customerAi.controller`（校验+路由）→ `customerAi.service`（上下文聚合+DeepSeek 调用+落库）→ `prisma` 直读。
- 统一错误响应：`{ code, message }`；DeepSeek 不可用返回 `code:503, message:'AI 服务暂不可用，请稍后重试'`。
- 日志：每次 AI 调用记 `audit_log`（entity=customer_ai_messages，含 token 用量）。

---

## 8. 刘总确认结论（2026-08-06 已拍板）
1. **数据出境**：✅ 同意将客户上下文发送至 DeepSeek 云端推理（凭证已预填，服务端调用，apiKey 不前端暴露）。
2. **对话线程**：✅ **全公司共享一条客户会话线程**；但**严格继承客户查看权限（RBAC）**——仅对该客户有查看权限的用户可见/可使用其 AI 线程（admin/audit 可见全部）。落库 `CustomerAiMessage` 仍记 `userId` 归因。
3. **洞察卡片**：✅ 顶部**常驻「客户洞察」结构化摘要卡片**（画像/需求变化/跟进状态/建议），支持「重新生成」（调用 `/ai/summary`）。

> 结论已固化，蓝图由「草稿／待会签」转入「设计定稿」，可进入阶段2 后端开发。

---

## 9. 落地节奏（先可见效果后后端）
- 阶段0 蓝图确认（本文件）→ 阶段1 高保真原型预览 → 阶段2 后端（prisma db push 保数据 + service/controller/route + DeepSeek 封装）→ 阶段3 前端接 API + 增量部署 → 阶段4 验收。

## 10. 验收标准（可复核）
- [ ] 客户详情页出现「AI 助手」Tab，对话框嵌入、响应式正常。
- [ ] 多轮对话连贯，历史刷新后留存（数据库 `customer_ai_messages` 可见）。
- [ ] AI 回复明显引用了该客户的真实跟进/联系人/商机信息（非泛泛而谈）。
- [ ] 删客户后对话历史级联清除（DB 校验）。
- [ ] DeepSeek 未配置时前端明确提示「未配置 AI 凭证」，不崩溃。
- [ ] apiKey 仅存服务端，前端网络请求无泄露。

---

## 11. 落地记录（2026-08-06）
- **后端**：`schema` 新增 `CustomerAiMessage`（onDelete:Cascade）；`customerAi.service.ts` / `.controller.ts` / `customer.ai.routes.ts`；`app.ts` 挂载 `/api/v1/customer-ai`。
- **前端**：`customerAiService.ts` + `CustomerAiChat.tsx` + `CustomerDetail.tsx` 新增「AI 助手」Tab。
- **部署**：后端增量 `oa_deploy_backend_ai.py`（src+prisma tar 覆盖 + prisma generate + db push 建表保数据 + pm2 restart，含备份/回滚）→ 全绿；前端 `oa_deploy_dist.py` → 校验通过。
- **验证**：路由挂载（无 token→401 / 未知前缀→404）；`customer_ai_messages` 表已在 holang-crm.db 创建；服务在线 3001。
- **遗留验收**：刘总登录 → 客户详情 → AI 助手 Tab → 实测多轮对话 / 历史留存 / 洞察卡片 / 删客户级联清对话。
