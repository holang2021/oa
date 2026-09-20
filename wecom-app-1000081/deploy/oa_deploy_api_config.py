#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
部署 backend 的 API 配置管理模块 + 在服务器生成 api-configs.json 种子。
只上传新增/修改的 ts 文件，不触碰 .env / prisma / node_modules。
"""
import base64
import json
import os
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

# 项目根目录
ROOT = Path(r"F:\HOLANGbuddy\03_项目资产\系统建设\holang-oa")
DEPLOY_DIR = Path(r"F:\HOLANGbuddy\03_项目资产\系统建设\wecom-app-1000081\deploy")
TAT_RUNNER = DEPLOY_DIR / "tat_run.py"

# 需要上传的文件（相对 backend/src 根）
FILES = [
    "app.ts",
    "services/api-config.service.ts",
    "services/api-test.service.ts",
    "controllers/api-config.controller.ts",
    "routes/api-config.routes.ts",
    "routes/index.ts",
]

# 服务器路径
REMOTE_BACKEND = "/opt/holang/oa/backend"
REMOTE_CONFIG_DIR = f"{REMOTE_BACKEND}/config"
REMOTE_CONFIG_FILE = f"{REMOTE_CONFIG_DIR}/api-configs.json"

# 种子凭证（从 credentials.json 提取），写入服务器 api-configs.json（数组格式）
SEED = [
    {
        "id": "feishu",
        "provider": "feishu",
        "displayName": "飞书开放平台",
        "displayNameEn": "Feishu / Lark",
        "description": "飞书文档、Bitable、Wiki、审批等 API",
        "baseUrl": "https://open.feishu.cn/open-apis",
        "baseUrlPlaceholder": "https://open.feishu.cn/open-apis",
        "authType": "bearer",
        "credentials": {"appId": "cli_aa95c23a6c389bfb", "appSecret": "l7p4Lz09OhuxLEbHdBQG7eiUKQs2lTWs"},
        "testEndpoint": "/auth/v3/tenant_access_token/internal",
        "timeout": 15000,
        "retryCount": 2,
        "status": "unconfigured",
        "testedAt": None,
    },
    {
        "id": "wecom",
        "provider": "wecom",
        "displayName": "企业微信",
        "displayNameEn": "WeCom",
        "description": "企微通讯录、消息、客户联系等 API",
        "baseUrl": "https://qyapi.weixin.qq.com/cgi-bin",
        "baseUrlPlaceholder": "https://qyapi.weixin.qq.com/cgi-bin",
        "authType": "corp_secret",
        "credentials": {"corpId": "wwe74343b7a90d201f", "agentId": "1000081", "secret": "wLHXr64De3gZO4lj9Ca-GjGMT1zRbBkl7AHode4Capo"},
        "testEndpoint": "/gettoken",
        "timeout": 10000,
        "retryCount": 2,
        "status": "unconfigured",
        "testedAt": None,
    },
    {
        "id": "deepseek",
        "provider": "deepseek",
        "displayName": "DeepSeek",
        "displayNameEn": "DeepSeek",
        "description": "AI 大模型，用于工商数据查重、邮件生成、报价辅助等",
        "baseUrl": "https://api.deepseek.com",
        "baseUrlPlaceholder": "https://api.deepseek.com",
        "authType": "api_key",
        "credentials": {"apiKey": "sk-8ce0d3c094e94b84904371a24ba1d4c2"},
        "testEndpoint": "/v1/models",
        "timeout": 30000,
        "retryCount": 2,
        "status": "unconfigured",
        "testedAt": None,
    },
    {
        "id": "ima",
        "provider": "ima",
        "displayName": "IMA 知识库",
        "displayNameEn": "IMA Knowledge Base",
        "description": "腾讯 IMA 知识库，AI 搜索问答",
        "baseUrl": "https://ima.qq.com",
        "baseUrlPlaceholder": "https://ima.qq.com",
        "authType": "api_key",
        "credentials": {"apiKey": ""},
        "testEndpoint": "",
        "timeout": 10000,
        "retryCount": 1,
        "status": "unconfigured",
        "testedAt": None,
    },
    {
        "id": "tencent_docs",
        "provider": "tencent_docs",
        "displayName": "腾讯文档",
        "displayNameEn": "Tencent Docs",
        "description": "腾讯文档 OpenAPI，文档创建/编辑/分享",
        "baseUrl": "https://docs.qq.com/openapi",
        "baseUrlPlaceholder": "https://docs.qq.com/openapi",
        "authType": "oauth",
        "credentials": {"clientId": "", "clientSecret": ""},
        "testEndpoint": "",
        "timeout": 10000,
        "retryCount": 1,
        "status": "unconfigured",
        "testedAt": None,
    },
    {
        "id": "whatsapp_360dialog",
        "provider": "whatsapp_360dialog",
        "displayName": "WhatsApp (360dialog)",
        "displayNameEn": "WhatsApp (360dialog)",
        "description": "WhatsApp Business API，消息同步、聊天记录归档",
        "baseUrl": "https://waba.360dialog.io",
        "baseUrlPlaceholder": "https://waba.360dialog.io",
        "authType": "api_key",
        "credentials": {"apiKey": ""},
        "testEndpoint": "/v1/configs/webhook",
        "timeout": 20000,
        "retryCount": 2,
        "status": "unconfigured",
        "testedAt": None,
    },
]


def build_tar() -> str:
    tmp = tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False)
    tmp.close()
    with tarfile.open(tmp.name, "w:gz") as tar:
        for rel in FILES:
            local_path = ROOT / "backend" / "src" / rel
            if not local_path.exists():
                raise FileNotFoundError(f"Missing file: {local_path}")
            tar.add(local_path, arcname=rel)
    return tmp.name


def b64_chunks(path: str, chunk_size: int = 8000) -> list:
    with open(path, "rb") as f:
        data = f.read()
    b64 = base64.b64encode(data).decode("ascii")
    return [b64[i:i + chunk_size] for i in range(0, len(b64), chunk_size)]


def write_remote_script(tar_b64_chunks: list) -> str:
    script_lines = [
        "#!/bin/bash",
        "set -e",
        f"mkdir -p {REMOTE_BACKEND}/src",
        f"cd {REMOTE_BACKEND}/src",
        "# 写 tar 包",
        f"echo '{tar_b64_chunks[0]}' > /tmp/api_config_fix.b64",
    ]
    for chk in tar_b64_chunks[1:]:
        script_lines.append(f"echo '{chk}' >> /tmp/api_config_fix.b64")
    script_lines.extend([
        "base64 -d /tmp/api_config_fix.b64 > /tmp/api_config_fix.tar.gz",
        "tar -xzf /tmp/api_config_fix.tar.gz -C .",
        "rm -f /tmp/api_config_fix.b64 /tmp/api_config_fix.tar.gz",
        f"mkdir -p {REMOTE_CONFIG_DIR}",
    ])

    # 生成 api-configs.json 种子（如果不存在则不覆盖）
    seed_json = json.dumps(SEED, ensure_ascii=False, indent=2)
    # 把种子 JSON 作为 heredoc 写入；注意单引号转义
    script_lines.append(f"if [ ! -f {REMOTE_CONFIG_FILE} ]; then")
    script_lines.append("cat > " + REMOTE_CONFIG_FILE + " <<'SEED_EOF'")
    script_lines.append(seed_json)
    script_lines.append("SEED_EOF")
    script_lines.append("fi")

    script_lines.extend([
        f"chown -R root:root {REMOTE_BACKEND}/src",
        f"chmod -R 755 {REMOTE_BACKEND}/src",
        "export PATH=/usr/local/node22/bin:/usr/local/bin:$PATH",
        "cd " + REMOTE_BACKEND,
        "pm2 restart holang-oa-backend",
        "sleep 3",
        "pm2 status holang-oa-backend",
    ])
    return "\n".join(script_lines) + "\n"


def main():
    print("[1/4] 打包 backend 文件...")
    tar_path = build_tar()
    print(f"   tar: {tar_path}, size={os.path.getsize(tar_path)}")

    print("[2/4] 切分 base64...")
    chunks = b64_chunks(tar_path)
    print(f"   chunks={len(chunks)}")

    print("[3/4] 生成远程脚本...")
    script = write_remote_script(chunks)
    script_path = DEPLOY_DIR / "tmp_deploy_api_config.sh"
    with open(script_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(script)

    print("[4/4] 通过 TAT 执行部署...")
    subprocess.run(
        [sys.executable, str(TAT_RUNNER), str(script_path)],
        cwd=str(DEPLOY_DIR),
        check=True,
    )
    print("Done.")


if __name__ == "__main__":
    main()
