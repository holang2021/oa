-- ============================================================
-- PI 商品明细（Commercial Items）—— 走法B：加 1 列 JSON，不新增 Model / Relation / BOM
-- 依据：LOCKED 总纲第7条「Commercial Item 第一性」+ 刘总 2026-11-08 一线反馈
--       「产品销售单价、明细没有地方能填写」；真实 Allum PI 单据有 3 行明细。
--
-- 为什么要落库：销售填完保存后重开必须还在，否则等于逼销售回 Excel 重做
--               （LOCKED 总纲第10条销售体验硬约束）。
-- 为什么用 1 列 JSON：一张 PI 的行项可能是设备 / 外购 / 配件 / 运杂 / 安装 / 服务，
--               不为每一种建 Model；行项统一表达 品名描述 / HS Code / 数量 / 单位 / 单价 / 金额。
--
-- ⚠️ SQLite 的 ADD COLUMN 不支持 IF NOT EXISTS，必须由幂等执行器先查列再执行：
--    python deploy/_deploy_pi_items.py      （列已存在则跳过，可重复运行）
-- 线上执行时机：生产服务器恢复后，走既有 hotfix 增量部署纪律（禁 rm -rf backend，
--               只覆盖改动文件 + 本 SQL，不动 .env / prisma/*.db 之外的资产）。
-- ============================================================

ALTER TABLE pis ADD COLUMN items_json TEXT;
