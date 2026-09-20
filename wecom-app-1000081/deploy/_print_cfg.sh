#!/bin/bash
ENV=/opt/holang/wecom-app-1000081/.env
echo "=== Values needed for WeChat backend (Gate 4) ==="
grep -E '^(WECOM_TOKEN|WECOM_ENCODING_AES_KEY)=' "$ENV"
echo "=== CORP_ID / AGENT_ID (from config defaults) ==="
grep -E '^(WECOM_CORP_ID|WECOM_AGENT_ID)=' "$ENV" || true
