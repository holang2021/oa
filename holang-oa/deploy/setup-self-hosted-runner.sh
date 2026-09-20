#!/usr/bin/env bash
# HOLANG OA · 自托管 Runner 一次性安装脚本（生产服务器执行）
#
# 用途：把 GitHub Actions 自托管 Runner 装到生产服务器，从此部署走
#       "git push -> GitHub 推任务 -> 服务器自己拉代码构建部署"，
#       不再用手搓 TAT 分块脚本、不再手动 scp。
#
# 执行方式（符合腾讯官方 TAT 最佳实践：脚本托管 COS，wget 后执行，不把大脚本塞进 TAT 命令框）：
#   wget -O /tmp/setup-runner.sh https://<你的COS桶>/setup-self-hosted-runner.sh
#   bash /tmp/setup-runner.sh
#
# ⚠️ 下面 <...> 均为占位符，真实值从 GitHub Secrets / 凭据托管获取，禁止硬编码进仓库。

set -euo pipefail

REPO_DIR=/opt/holang/oa
RUNNER_DIR=/opt/holang/oa-runner
GITHUB_REPO="<holang2021/oa>"          # 替换为真实仓库
RUNNER_TOKEN="<RUNNER_TOKEN>"          # GitHub: Settings -> Actions -> Runners -> New runner 获取
COS_BUCKET="<BUCKET>"                  # 异地备份桶
COS_REGION="ap-shanghai"

echo "== 1. 基础依赖 =="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git rsync sqlite3 coscmd
npm i -g pm2

echo "== 2. 拉取代码 =="
if [ ! -d "$REPO_DIR/.git" ]; then
  git clone "https://github.com/${GITHUB_REPO}.git" "$REPO_DIR"
fi
cd "$REPO_DIR" && git pull --ff-only

echo "== 3. 安装 GitHub Actions 自托管 Runner =="
mkdir -p "$RUNNER_DIR" && cd "$RUNNER_DIR"
curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/latest/download/actions-runner-linux-x64-2.317.0.tar.gz
tar xzf actions-runner.tar.gz
./config.sh --url "https://github.com/${GITHUB_REPO}" --token "$RUNNER_TOKEN" \
  --name "oa-prod-runner" --labels "self-hosted,linux,oa" --work "$REPO_DIR/_work" --unattended
sudo ./svc.sh install
sudo ./svc.sh start

echo "== 4. SQLite 开 WAL（读写并发+崩溃安全，替代单文件锁） =="
sqlite3 "$REPO_DIR/data/holang-oa.db" "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;"

echo "== 5. WAL -> COS 自动备份（解决删库风险 + 异地备份） =="
# 每 30 分钟把 db + -wal + -shm 推到 COS（占位：真实 SecretId/Key 走凭据托管，不写此处）
cat > /etc/cron.d/holang-oa-backup <<EOF
*/30 * * * * root coscmd -s config -a <SECRET_ID> -k <SECRET_KEY> -b $COS_BUCKET -r $COS_REGION && coscmd upload $REPO_DIR/data/holang-oa.db /oa-backup/ && coscmd upload $REPO_DIR/data/holang-oa.db-wal /oa-backup/
EOF

echo "== 完成 =="
echo "Runner 已在 $RUNNER_DIR 以服务方式常驻。之后 push 到 main 即自动部署。"
echo "回滚：git revert <commit> 再 push，或 GitHub Actions 页面 Re-run。"
