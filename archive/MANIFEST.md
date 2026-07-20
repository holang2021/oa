# 旧内容隔离 · 逐项清单（MANIFEST）

- 归档日期：2026-07-16
- 留存期：普通遗留 90 天（到期 2026-10-14，且不早于 OA 新前端上线日）；敏感项不设自动到期。
- 状态图例：**已隔离**（已搬入 archive）｜**留原位**（按规则不搬）｜**保留活跃**（非旧内容）

## 一、已隔离（archive/ 内）

| # | 原路径 | 现路径 | 分类 | 敏感度 | 处置建议 | 留存/到期 |
|---|--------|--------|------|:---:|----------|-----------|
| 1 | `holang-crm/` | `archive/holang-crm/` | 旧前端（含原始审批引擎，已迁 OA） | 低 | 候选删除（Step 6 验证后） | 90d / 2026-10-14 |
| 2 | `crm_1_1_CRM设计.json` | `archive/legacy-root/crm-data/` | CRM 设计文档 | 低 | 归档 | 90d |
| 3 | `crm_1_2_迭代计划.json` | 同上 | CRM 迭代计划 | 低 | 归档 | 90d |
| 4 | `crm_data.json` | 同上 | CRM 数据 | 低 | 归档 | 90d |
| 5 | `crm-viewer.html` | 同上 | CRM 查看器 | 低 | 归档 | 90d |
| 6 | `gen_oauth_url.py` | `archive/legacy-root/scripts-python/` | 工具脚本 | 低 | 归档 | 90d |
| 7 | `query_lighthouse.py` | 同上 | 工具脚本 | 低 | 归档 | 90d |
| 8 | `tccli_oauth_complete.py` | 同上 | 工具脚本 | 低 | 归档 | 90d |
| 9 | `serve_crm.py` | 同上 | 服务脚本 | 低 | 归档 | 90d |
| 10 | `serve_holang_oa.py` | 同上 | 服务脚本 | 低 | 归档 | 90d |
| 11 | `serve_oa_crm.py` | 同上 | 服务脚本 | 低 | 归档 | 90d |
| 12 | `huoban_export.py` | 同上 | 伙伴导出脚本 | 低 | 归档 | 90d |
| 13 | `huoban_to_crm.py` | 同上 | 伙伴→CRM 脚本 | 低 | 归档 | 90d |
| 14 | `test_huoban_api.py` | 同上 | 测试脚本 | 低 | 归档 | 90d |
| 15 | `test_huoban_v2.py` | 同上 | 测试脚本 | 低 | 归档 | 90d |
| 16 | `test_huoban_v3.py` | 同上 | 测试脚本 | 低 | 归档 | 90d |
| 17 | `test_huoban_v4.py` | 同上 | 测试脚本 | 低 | 归档 | 90d |
| 18 | `huoban_data/` | `archive/legacy-root/huoban/` | 伙伴数据 | 低 | 归档 | 90d |
| 19 | `backend-detached.log` | `archive/legacy-root/logs/` | 运行日志 | 低 | 可清 | 90d |
| 20 | `backend-err.log` | 同上 | 运行日志 | 低 | 可清 | 90d |
| 21 | `backend-restart.log` | 同上 | 运行日志 | 低 | 可清 | 90d |
| 22 | `nul` | `archive/legacy-root/misc/` | 异常保留名文件 | 低 | 归档/忽略 | 90d |

## 二、留原位（按规则不搬）

| # | 路径 | 分类 | 敏感度 | 处置 | 理由 |
|---|------|------|:---:|------|------|
| 23 | `oa_login.json` | 疑似凭据 | **高** | **人工确认前不读/不搬/不删** | 疑似含密钥；需你确认内容安全性后单独处理 |
| 24 | `quotation_260410.json` | 业务蓝本 | 低 | 保留（对齐 OA） | OA 表单引擎字段来源 |
| 25 | `quotation_260421.json` | 业务蓝本 | 低 | 保留（对齐 OA） | 报价单原型，表单引擎已引用 |
| 26 | `quotation_NPL02Bvs液氮.json` | 业务蓝本 | 低 | 保留（对齐 OA） | 报价单数据 |
| 27 | `quotation_NPL10Bvs液氮.json` | 业务蓝本 | 低 | 保留（对齐 OA） | 报价单数据 |

## 三、保留活跃（非旧内容，不在归档范围）

| # | 路径 | 性质 | 处置 |
|---|------|------|------|
| 28 | `holang-admin/`（= holang-oa-frontend） | OA 统一前端基线 | 保留发展 |
| 29 | `holang-oa/`（后端 + 394 客户 DB + 旧前端 packages/oa） | 生产系统 | **永不删**；旧前端待 OA 新前端上线后替换 |
| 30 | `holang-oa.db` + `.bak-*` | 生产数据库及备份 | **永不删** |
| 31 | `wecom-callback/` | 活跃企微回调基础设施 | 保留 |
| 32 | `docs/` | 规划/决策/分析文档 | 保留 |
| 33 | `HOLANG_OA_部署交接文档.md` | 生产部署文档 | 保留 |
| 34 | `.workbuddy/` | 项目运行时数据 | **禁删** |

## 四、删除候选（2026-10-14 起，需你确认）

- 普通遗留：#1~#22（其中 #19~#21 日志可优先清）
- 敏感项 #23：不进此列，单独人工流程
- 生产/活跃 #28~#34：永不删
