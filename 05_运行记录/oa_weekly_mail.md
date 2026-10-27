【OA 增量节拍 · 每周纪律 2026-10-12】

一、看板状态快照（4 列）
- ① 原型待确认：客户详情快捷操作 / 联系人治理(4) / 客户查重v2 / WP首页 / 落地页草稿
- ② 代码进行中：CRM框架 / 统一打印模板 / CI·PL·审批引擎·SystemSettings(仅代码未验证)
- ③ 已完工待部署：报价管理 / GOV-026四功能 / 离职继承(头号优先级)
- ④ 阻塞决策：生产服务器重建 / 网站主线确认

二、原型发散项（需收口）
多版本：
- 客户详情：quick_actions_v1 + detail_v1/v2/v3_proto（4个，看板只挂1个）
- 联系人治理：gov/onetomany/softfields/fix + contact_governance_v1_proto（5个，看板说4个）
- 客户查重：v2 + 已归档v1（已收敛✅）
游离未挂看板：
- holang-oa/prototypes/ 下 4 个：ai-chat-actions / customer-ai-chat / feishu-wiki-sync / opportunity-m2m
- prototypes/kanban.html（旧看板副本，与 docs/ 当前看板重复）
- daily_report_dashboard.html + daily_report_server.py（一次性日报工具）
- _embed_*.js / _fix_logo.js / _db_probe.js / _gen_full.py / _logo_b64.txt / __pycache__（scratch，非原型）

三、本期建议增量（推荐 1 个）
- 推荐：客户查重 v2（customer_dup_v2_proto.html）
- 理由：v1 已归档、单版本最干净，确认即可转码，风险最低
- 范围锁草案：
  只做——按 v2 把"客户查重"转成可验证的前端+后端校验（名称/税号/别名模糊比对、撞单提示）
  不做——不新建客户主数据模型、不碰报价/合同、不做模糊匹配外扩展、不接外部工商库
- 备选：客户详情 quick_actions_v1（需先收敛 detail_v1/v2/v3）；联系人治理（需先 5→1 收敛，本周不建议直接转码）

四、减法收口清单（建议）
1. customer_detail_v1/v2/v3_proto → 收敛为 1 主线，其余归档
2. contact_governance_v1_proto → 并入联系人治理主线或归档
3. prototypes/kanban.html → 删除（以 docs/ 看板为唯一真源）
4. holang-oa/prototypes/ 下 4 个未挂看板原型 → 评估，不需要则归档
5. daily_report_dashboard.html + server.py → 并入"日报"独立任务，不混 OA 原型
6. _embed_*.js 等 scratch → 移 prototypes/_scratch/ 或删除

五、回执
请回"像/不像"（针对客户查重 v2）或"做 X"（X=查重/详情/联系人/其他）即可推进。

—— 朗工（HOLANG）为你整理推送