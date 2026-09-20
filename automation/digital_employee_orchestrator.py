#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HOLANG 数字员工落位与会前准备编排器
=================================================
用途：
  1. 完成数字员工的系统落位与初始化（环境 / 身份 / 资源 / 能力）
  2. 自动进入会前准备状态（日程 / 材料 / 待办 / 提醒）
  3. 每步带状态判断与兜底 fallback，避免流程中断

设计原则：
  - 状态机驱动：UNINIT -> ONBOARDING -> READY -> MEETING_PREP -> STANDBY
  - 能力即专家：HOLANG 专家团（holang-*）映射为可调用能力
  - 失败不卡死：缺连接器 → 降级；缺材料 → 标记缺失；缺身份 → 转人工
  - 只读优先：会前准备阶段尽量只查不写，写操作（提醒）显式授权

运行：
  python digital_employee_orchestrator.py --config holang_employee_config.json --dry-run
"""

import argparse
import json
import logging
import sys
import time
import traceback
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum, auto
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# 状态定义
# ---------------------------------------------------------------------------
class Phase(Enum):
    UNINIT = "未初始化"
    ONBOARDING = "系统落位中"
    READY = "已就绪"
    MEETING_PREP = "会前准备中"
    STANDBY = "待命"
    DEGRADED = "降级运行"
    ERROR = "异常终止"
    HUMAN_ESCALATION = "待人工介入"


class OnboardingStep(Enum):
    ENV_CHECK = "环境检查"
    IDENTITY_REG = "身份/账号注册"
    RESOURCE_ALLOC = "基础资源分配"
    CAPABILITY_REG = "能力注册与绑定"


class MeetingPrepStep(Enum):
    SCHEDULE_FETCH = "日程检索"
    MATERIAL_PREP = "会议材料整理"
    TODO_AGGREGATE = "待办事项汇总"
    REMINDER_SET = "参会提醒设置"


# ---------------------------------------------------------------------------
# 数据模型
# ---------------------------------------------------------------------------
@dataclass
class StepResult:
    ok: bool
    step: str
    detail: Dict[str, Any] = field(default_factory=dict)
    fallback_used: bool = False
    fallback_action: str = ""
    escalation: str = ""  # 非空表示需要人工介入


@dataclass
class DigitalEmployee:
    """数字员工运行时上下文。"""
    name: str
    employee_id: str
    department: str
    role: str
    email: Optional[str] = None

    phase: Phase = Phase.UNINIT
    capabilities: List[str] = field(default_factory=list)
    connector_status: Dict[str, bool] = field(default_factory=dict)

    # 会前准备产物
    meetings: List[Dict[str, Any]] = field(default_factory=list)
    materials: Dict[str, Any] = field(default_factory=dict)
    todos: List[Dict[str, Any]] = field(default_factory=list)
    reminders_sent: List[Dict[str, Any]] = field(default_factory=list)

    # 执行报告
    report: Dict[str, Any] = field(default_factory=dict)
    log: List[Dict[str, Any]] = field(default_factory=list)

    def record(self, event: str, level: str = "info", **kwargs):
        self.log.append({
            "ts": datetime.now().isoformat(),
            "event": event,
            "level": level,
            **kwargs
        })


# ---------------------------------------------------------------------------
# 能力层（抽象接口 + HOLANG 专家团映射）
# ---------------------------------------------------------------------------
class CapabilityProvider:
    """能力提供者抽象基类。可替换为真实 Lark/WeCom/GitHub 连接器调用。"""
    name: str = "base"

    def available(self) -> bool:
        return True

    def call(self, method: str, **kwargs) -> Tuple[bool, Any, str]:
        return True, {}, ""


class LarkCalendarProvider(CapabilityProvider):
    name = "lark_calendar"

    def available(self) -> bool:
        # TODO: 替换为真实 lark-cli 或 connector 状态探测
        return True

    def call(self, method: str, **kwargs):
        if method == "list_today":
            return True, [
                {"title": "系统建设周会", "start": "09:30", "end": "10:30",
                 "organizer": "刘总", "location": "线上腾讯会议"}
            ], ""
        return False, None, "unknown method"


class LarkWikiProvider(CapabilityProvider):
    name = "lark_wiki"

    def available(self) -> bool:
        return True

    def call(self, method: str, **kwargs):
        if method == "search":
            topic = kwargs.get("topic", "")
            # 模拟知识库命中：优先 01_公司概况 -> 03_产品知识
            hits = []
            if "服务器" in topic or "续费" in topic:
                hits.append({"title": "OA 部署与服务器清单", "node": "OPS-ARCH-001"})
            if "产品" in topic or "制氮" in topic:
                hits.append({"title": "PSA 制氮机产品参数", "node": "PROD-001"})
            if not hits:
                hits.append({"title": "公司概况", "node": "COMP-001"})
            return True, hits, ""
        return False, None, "unknown method"


class LarkTaskProvider(CapabilityProvider):
    name = "lark_task"

    def available(self) -> bool:
        return True

    def call(self, method: str, **kwargs):
        if method == "get_my_tasks":
            return True, [
                {"title": "OA 服务器续费确认", "due": "2026-08-20", "status": "pending"},
                {"title": "飞书 Phase2 同步方案", "due": "2026-08-18", "status": "pending"}
            ], ""
        return False, None, "unknown method"


class WeComMsgProvider(CapabilityProvider):
    name = "wecom_msg"

    def available(self) -> bool:
        return True

    def call(self, method: str, **kwargs):
        if method == "send_reminder":
            return True, {"msg_id": "fake_msg_001"}, ""
        return False, None, "unknown method"


class IdentityResolverProvider(CapabilityProvider):
    """统一身份识别器（holang-identity-resolver）"""
    name = "identity_resolver"

    def available(self) -> bool:
        return True

    def call(self, method: str, **kwargs):
        if method == "resolve":
            # TODO: 查 employee_map.json
            return True, {"user_id": kwargs.get("employee_id"), "name": kwargs.get("name"),
                          "department": kwargs.get("department")}, ""
        return False, None, "unknown method"


class ExpertRegistryProvider(CapabilityProvider):
    """专家注册中心（holang-expert-registry）"""
    name = "expert_registry"

    def available(self) -> bool:
        return True

    def call(self, method: str, **kwargs):
        if method == "register":
            return True, {"status": "registered", "experts": kwargs.get("experts", [])}, ""
        return False, None, "unknown method"


# ---------------------------------------------------------------------------
# 能力注册表
# ---------------------------------------------------------------------------
HOLANG_EXPERT_MAP: Dict[str, Dict[str, Any]] = {
    "holang-digital-product-owner": {
        "department": "中枢/调度",
        "capability": "任务分派、闭环验收",
        "provider": "expert_registry"
    },
    "holang-tech-lead": {
        "department": "IT/信息化部",
        "capability": "架构、部署、基础设施",
        "provider": "expert_registry"
    },
    "holang-governance-expert": {
        "department": "治理/审计",
        "capability": "流程治理、决策收口",
        "provider": "expert_registry"
    },
    "holang-audit-review": {
        "department": "审计复核",
        "capability": "独立复核、越界上报",
        "provider": "expert_registry"
    },
    "holang-knowledge-query": {
        "department": "知识库",
        "capability": "知识检索、命中处理",
        "provider": "lark_wiki"
    },
    "holang-brand-growth": {
        "department": "市场/品牌",
        "capability": "获客、GEO、内容",
        "provider": "expert_registry"
    },
    "holang-gas-sales": {
        "department": "销售部",
        "capability": "工业气体销售、客户对接",
        "provider": "expert_registry"
    },
    "holang-product-rd-expert": {
        "department": "产品研发",
        "capability": "技术可行性与产品架构",
        "provider": "expert_registry"
    }
}


# ---------------------------------------------------------------------------
# 编排器
# ---------------------------------------------------------------------------
class DigitalEmployeeOrchestrator:
    def __init__(self, config: Dict[str, Any], dry_run: bool = True):
        self.config = config
        self.dry_run = dry_run
        self.emp: Optional[DigitalEmployee] = None
        self.providers: Dict[str, CapabilityProvider] = {
            "lark_calendar": LarkCalendarProvider(),
            "lark_wiki": LarkWikiProvider(),
            "lark_task": LarkTaskProvider(),
            "wecom_msg": WeComMsgProvider(),
            "identity_resolver": IdentityResolverProvider(),
            "expert_registry": ExpertRegistryProvider()
        }
        self.results: List[StepResult] = []

    # ------------------------- 工具方法 -------------------------
    def _provider(self, name: str) -> CapabilityProvider:
        return self.providers.get(name, CapabilityProvider())

    def _run_step(self, step_name: str, fn: Callable[[], StepResult]) -> StepResult:
        """包装每步执行：捕获异常、兜底、记录日志。"""
        try:
            res = fn()
        except Exception as e:
            tb = traceback.format_exc()
            res = StepResult(
                ok=False, step=step_name,
                detail={"error": str(e), "traceback": tb},
                fallback_used=True,
                fallback_action="异常兜底：跳过本步并记录，避免流程终止"
            )
        self.results.append(res)
        if self.emp:
            self.emp.record(
                event=step_name,
                level="info" if res.ok else "warning",
                ok=res.ok,
                fallback_used=res.fallback_used,
                escalation=res.escalation
            )
        return res

    def _require_connector(self, name: str) -> Tuple[bool, str]:
        p = self._provider(name)
        ok = p.available()
        if self.emp:
            self.emp.connector_status[name] = ok
        if not ok:
            return False, f"连接器 {name} 不可用"
        return True, ""

    # ------------------------- 初始化 -------------------------
    def init_employee(self, payload: Dict[str, Any]) -> DigitalEmployee:
        self.emp = DigitalEmployee(
            name=payload["name"],
            employee_id=payload["employee_id"],
            department=payload.get("department", "未知部门"),
            role=payload.get("role", "数字员工"),
            email=payload.get("email")
        )
        self.emp.record(event="数字员工初始化", payload=payload)
        return self.emp

    # ------------------------- 阶段 1：系统落位 -------------------------
    def run_onboarding(self) -> Phase:
        self.emp.phase = Phase.ONBOARDING
        self.emp.record(event="阶段切换", phase=self.emp.phase.value)

        # 1.1 环境检查
        self._run_step(OnboardingStep.ENV_CHECK.value, self._step_env_check)
        # 1.2 身份注册
        self._run_step(OnboardingStep.IDENTITY_REG.value, self._step_identity_reg)
        # 1.3 资源分配
        self._run_step(OnboardingStep.RESOURCE_ALLOC.value, self._step_resource_alloc)
        # 1.4 能力注册
        self._run_step(OnboardingStep.CAPABILITY_REG.value, self._step_capability_reg)

        # 阶段收尾判断
        critical_ok = all(
            r.ok for r in self.results[-4:]
            if r.step in {s.value for s in OnboardingStep}
        )
        if not critical_ok:
            # 只要不是全部失败，允许降级运行
            failed = [r.step for r in self.results[-4:] if not r.ok]
            if self.emp.phase != Phase.HUMAN_ESCALATION:
                self.emp.phase = Phase.DEGRADED
            self.emp.record(event="落位阶段收尾", degraded=True, failed_steps=failed)
        else:
            self.emp.phase = Phase.READY
        return self.emp.phase

    def _step_env_check(self) -> StepResult:
        """环境检查：运行时再 / 连接器 / 必备目录。"""
        required_runtimes = self.config.get("required_runtimes", ["python", "node"])
        missing = []
        for rt in required_runtimes:
            # TODO: 真实检查：shutil.which(rt)
            if rt not in ("python", "node"):
                missing.append(rt)

        if missing:
            return StepResult(
                ok=False, step=OnboardingStep.ENV_CHECK.value,
                detail={"missing_runtimes": missing},
                fallback_used=True,
                fallback_action="环境兜底：标记缺失运行时，继续注册能力，后续仅使用可用运行时"
            )
        return StepResult(
            ok=True, step=OnboardingStep.ENV_CHECK.value,
            detail={"runtimes": required_runtimes, "status": "ok"}
        )

    def _step_identity_reg(self) -> StepResult:
        """身份注册：通过统一身份识别器解析，未知则转人工。"""
        ok, err = self._require_connector("identity_resolver")
        if not ok:
            return StepResult(
                ok=False, step=OnboardingStep.IDENTITY_REG.value,
                detail={"error": err},
                fallback_used=True,
                fallback_action="身份兜底：使用配置中的 employee_id 作为临时身份，待人工复核"
            )

        p = self._provider("identity_resolver")
        success, data, msg = p.call("resolve", **asdict(self.emp))
        if not success:
            self.emp.phase = Phase.HUMAN_ESCALATION
            return StepResult(
                ok=False, step=OnboardingStep.IDENTITY_REG.value,
                detail={"error": msg},
                escalation="身份无法解析，需人工确认员工是否在 employee_map.json 中"
            )
        self.emp.department = data.get("department", self.emp.department)
        return StepResult(
            ok=True, step=OnboardingStep.IDENTITY_REG.value,
            detail={"resolved_identity": data}
        )

    def _step_resource_alloc(self) -> StepResult:
        """资源分配：server slot / connector quota / memory budget。"""
        resources = self.config.get("resources", {})
        allocated = {
            "server_slot": resources.get("server", "shared"),
            "memory_mb": resources.get("memory_mb", 512),
            "connectors": list(self.providers.keys()),
            "dry_run": self.dry_run
        }
        # 模拟资源不足兜底
        if allocated["memory_mb"] < 256:
            return StepResult(
                ok=False, step=OnboardingStep.RESOURCE_ALLOC.value,
                detail={"allocated": allocated},
                fallback_used=True,
                fallback_action="资源兜底：按最低配额 256MB 运行，仅启用只读能力"
            )
        return StepResult(
            ok=True, step=OnboardingStep.RESOURCE_ALLOC.value,
            detail={"allocated": allocated}
        )

    def _step_capability_reg(self) -> StepResult:
        """能力注册：把 HOLANG 专家团绑定为可用能力。"""
        experts = self.config.get("experts", list(HOLANG_EXPERT_MAP.keys()))
        p = self._provider("expert_registry")
        ok, data, msg = p.call("register", experts=experts)
        if not ok:
            # 即使注册中心失败，也允许本地静态映射继续
            self.emp.capabilities = experts
            return StepResult(
                ok=False, step=OnboardingStep.CAPABILITY_REG.value,
                detail={"local_capabilities": experts},
                fallback_used=True,
                fallback_action="能力兜底：使用本地静态专家映射继续运行，不依赖注册中心在线"
            )
        self.emp.capabilities = experts
        return StepResult(
            ok=True, step=OnboardingStep.CAPABILITY_REG.value,
            detail={"registered": data}
        )

    # ------------------------- 阶段 2：会前准备 -------------------------
    def run_meeting_prep(self) -> Phase:
        if self.emp.phase == Phase.HUMAN_ESCALATION:
            self.emp.record(event="会前准备跳过", reason="身份未确认，等待人工介入")
            return self.emp.phase

        self.emp.phase = Phase.MEETING_PREP
        self.emp.record(event="阶段切换", phase=self.emp.phase.value)

        # 2.1 日程检索
        self._run_step(MeetingPrepStep.SCHEDULE_FETCH.value, self._step_schedule_fetch)
        # 2.2 材料整理
        self._run_step(MeetingPrepStep.MATERIAL_PREP.value, self._step_material_prep)
        # 2.3 待办汇总
        self._run_step(MeetingPrepStep.TODO_AGGREGATE.value, self._step_todo_aggregate)
        # 2.4 提醒设置
        self._run_step(MeetingPrepStep.REMINDER_SET.value, self._step_reminder_set)

        # 阶段收尾
        failed = [r.step for r in self.results if not r.ok and r.step in {s.value for s in MeetingPrepStep}]
        if failed:
            self.emp.phase = Phase.DEGRADED if self.emp.phase != Phase.HUMAN_ESCALATION else Phase.HUMAN_ESCALATION
            self.emp.record(event="会前准备收尾", degraded=True, failed_steps=failed)
        else:
            self.emp.phase = Phase.STANDBY
        return self.emp.phase

    def _step_schedule_fetch(self) -> StepResult:
        """日程检索：无会则生成日报备。"""
        ok, err = self._require_connector("lark_calendar")
        if not ok:
            return StepResult(
                ok=False, step=MeetingPrepStep.SCHEDULE_FETCH.value,
                detail={"error": err},
                fallback_used=True,
                fallback_action="日程兜底：假设今日无会，进入通用日报模式"
            )

        p = self._provider("lark_calendar")
        success, meetings, msg = p.call("list_today")
        if not success or not meetings:
            self.emp.meetings = []
            return StepResult(
                ok=True, step=MeetingPrepStep.SCHEDULE_FETCH.value,
                detail={"meetings": [], "note": "今日无会，进入日报模式"}
            )
        self.emp.meetings = meetings
        return StepResult(
            ok=True, step=MeetingPrepStep.SCHEDULE_FETCH.value,
            detail={"meetings": meetings}
        )

    def _step_material_prep(self) -> StepResult:
        """材料整理：按会议主题查知识库；无命中则标记缺失。"""
        if not self.emp.meetings:
            self.emp.materials = {"note": "今日无会，无需专项材料"}
            return StepResult(
                ok=True, step=MeetingPrepStep.MATERIAL_PREP.value,
                detail=self.emp.materials
            )

        ok, err = self._require_connector("lark_wiki")
        if not ok:
            return StepResult(
                ok=False, step=MeetingPrepStep.MATERIAL_PREP.value,
                detail={"error": err},
                fallback_used=True,
                fallback_action="材料兜底：生成空材料清单，提醒主持人会中补充"
            )

        p = self._provider("lark_wiki")
        all_materials = {}
        for mtg in self.emp.meetings:
            topic = mtg.get("title", "")
            success, hits, msg = p.call("search", topic=topic)
            all_materials[topic] = {
                "hits": hits if success else [],
                "missing": not success or not hits,
                "fallback": "材料缺失，需会中补充或会前人工上传" if (not success or not hits) else ""
            }
        self.emp.materials = all_materials
        return StepResult(
            ok=True, step=MeetingPrepStep.MATERIAL_PREP.value,
            detail={"materials": all_materials}
        )

    def _step_todo_aggregate(self) -> StepResult:
        """待办汇总：拉取本人未完成任务，按会议议题分组。"""
        ok, err = self._require_connector("lark_task")
        if not ok:
            return StepResult(
                ok=False, step=MeetingPrepStep.TODO_AGGREGATE.value,
                detail={"error": err},
                fallback_used=True,
                fallback_action="待办兜底：使用空待办列表，会中手工补录"
            )

        p = self._provider("lark_task")
        success, todos, msg = p.call("get_my_tasks")
        if not success:
            return StepResult(
                ok=False, step=MeetingPrepStep.TODO_AGGREGATE.value,
                detail={"error": msg},
                fallback_used=True,
                fallback_action="待办兜底：标记为查询失败，不阻塞提醒设置"
            )
        self.emp.todos = todos or []
        return StepResult(
            ok=True, step=MeetingPrepStep.TODO_AGGREGATE.value,
            detail={"count": len(self.emp.todos), "todos": self.emp.todos}
        )

    def _step_reminder_set(self) -> StepResult:
        """提醒设置：dry-run 只打印，真实运行才发送。"""
        reminders = []
        for mtg in self.emp.meetings:
            content = f"会议提醒：{mtg.get('title')} {mtg.get('start')} @ {mtg.get('location')}"
            if self.dry_run:
                reminders.append({"meeting": mtg.get("title"), "content": content, "sent": False, "mode": "dry_run"})
            else:
                ok, err = self._require_connector("wecom_msg")
                if not ok:
                    reminders.append({"meeting": mtg.get("title"), "sent": False, "error": err})
                    continue
                p = self._provider("wecom_msg")
                success, data, msg = p.call("send_reminder", content=content)
                reminders.append({
                    "meeting": mtg.get("title"),
                    "sent": success,
                    "mode": "wecom_msg",
                    "error": msg
                })
        self.emp.reminders_sent = reminders
        return StepResult(
            ok=True, step=MeetingPrepStep.REMINDER_SET.value,
            detail={"reminders": reminders, "dry_run": self.dry_run}
        )

    # ------------------------- 报告 -------------------------
    def build_report(self) -> Dict[str, Any]:
        return {
            "generated_at": datetime.now().isoformat(),
            "dry_run": self.dry_run,
            "employee": {
                "name": self.emp.name,
                "employee_id": self.emp.employee_id,
                "department": self.emp.department,
                "role": self.emp.role,
                "phase": self.emp.phase.value
            },
            "summary": {
                "total_steps": len(self.results),
                "success_steps": sum(1 for r in self.results if r.ok),
                "fallback_steps": sum(1 for r in self.results if r.fallback_used),
                "escalations": [r.escalation for r in self.results if r.escalation]
            },
            "steps": [asdict(r) for r in self.results],
            "meetings": self.emp.meetings,
            "materials": self.emp.materials,
            "todos": self.emp.todos,
            "reminders": self.emp.reminders_sent,
            "connector_status": self.emp.connector_status,
            "event_log": self.emp.log
        }

    def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        self.init_employee(payload)
        self.run_onboarding()
        self.run_meeting_prep()
        self.emp.report = self.build_report()
        return self.emp.report


# ---------------------------------------------------------------------------
# 入口
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="HOLANG 数字员工落位与会前准备编排器")
    parser.add_argument("--config", default="holang_employee_config.json", help="配置文件路径")
    parser.add_argument("--dry-run", action="store_true", default=True, help="只读演示，不发送真实消息")
    parser.add_argument("--no-dry-run", dest="dry_run", action="store_false", help="真实运行，会发送提醒")
    parser.add_argument("--output", default="digital_employee_report.json", help="报告输出路径")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    config_path = Path(args.config)
    if not config_path.exists():
        logging.warning("未找到配置文件 %s，使用默认配置", config_path)
        config = {
            "required_runtimes": ["python", "node"],
            "resources": {"server": "shared", "memory_mb": 512},
            "experts": list(HOLANG_EXPERT_MAP.keys())
        }
    else:
        config = json.loads(config_path.read_text(encoding="utf-8"))

    employee_payload = config.get("employee", {
        "name": "HOLANG-中枢-001",
        "employee_id": "DE_001",
        "department": "数字化执行中枢",
        "role": "数字员工"
    })

    orch = DigitalEmployeeOrchestrator(config, dry_run=args.dry_run)
    report = orch.run(employee_payload)

    out_path = Path(args.output)
    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    logging.info("报告已写入 %s", out_path)

    # 控制台摘要
    print("\n=== 数字员工执行摘要 ===")
    print(f"姓名：{report['employee']['name']}")
    print(f"阶段：{report['employee']['phase']}")
    print(f"步骤：{report['summary']['success_steps']}/{report['summary']['total_steps']} 成功，"
          f"{report['summary']['fallback_steps']} 次兜底")
    if report["summary"]["escalations"]:
        print("需人工介入：")
        for e in report["summary"]["escalations"]:
            print(f"  - {e}")
    print(f"会议数：{len(report['meetings'])}")
    print(f"待办数：{len(report['todos'])}")
    print(f"报告：{out_path}")


if __name__ == "__main__":
    main()
