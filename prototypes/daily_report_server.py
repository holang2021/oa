#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HOLANG 跨项目日报聚合服务器
功能：自动发现本地 HOLANGbuddy 下各项目的 .workbuddy/memory 日报，
      通过 HTTP 提供聚合 JSON 与可视化仪表盘，支持自动刷新。
使用：python daily_report_server.py [PORT]
"""
import os, sys, re, json, datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# 配置 —— 默认扫描 HOLANGbuddy 根（会自动解析符号链接到真实路径）
DEFAULT_ROOT = r"F:\HOLANGbuddy"
EXCLUDE_PARTS = {
    '_archive', '归档', '备份', 'backups', '_QUARANTINE', '_removed', 'removed',
    'workbuddy-cleanup', 'workbuddy-root-cleanup', 'ops-legacy', '历史归档',
    '_OBSOLETE_', 'timestamped', 'automation-20', 'ops-building',
    '.git', 'node_modules', '__pycache__'
}
DATE_FILE_RE = re.compile(r'^(\d{4}-\d{2}-\d{2})(?:_(.+))?\.md$')
SECTION_RE = re.compile(r'^##\s+(.+?)\s*$')
SUBSECTION_RE = re.compile(r'^###\s+(.+?)\s*$')
ITEM_RE = re.compile(r'^(\s*)[-*]\s+(.*)$')
NUM_RE = re.compile(r'^(\s*)(\d+)\.\s+(.*)$')


def should_exclude(path):
    p = path.replace('\\', '/')
    return any(ex in p for ex in EXCLUDE_PARTS)


def discover_projects(root):
    root = os.path.realpath(root)
    projects = []
    for dirpath, dirnames, filenames in os.walk(root):
        # 提前跳过排除目录
        dirnames[:] = [d for d in dirnames if not should_exclude(os.path.join(dirpath, d))]
        if os.path.basename(dirpath) == 'memory' and os.path.dirname(dirpath).endswith('.workbuddy'):
            rel = os.path.relpath(os.path.dirname(os.path.dirname(dirpath)), root)
            name = rel if rel != '.' else '(全局)'
            projects.append({
                'name': name,
                'memory_dir': dirpath,
                'path': os.path.dirname(os.path.dirname(dirpath))
            })
    # 按项目名排序，短的/根在前
    projects.sort(key=lambda x: (len(x['name'].split(os.sep)), x['name']))
    return projects


def parse_markdown(path):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    title = lines[0].strip('# \n') if lines else ''
    sections = []
    current_section = None
    current_item_idx = None
    for raw in lines[1:]:
        line = raw.rstrip('\n')
        if not line.strip():
            current_item_idx = None
            continue
        m = SECTION_RE.match(line)
        if m:
            current_section = {'title': m.group(1), 'items': []}
            sections.append(current_section)
            current_item_idx = None
            continue
        m = SUBSECTION_RE.match(line)
        if m and current_section:
            current_section['items'].append(f"▸ {m.group(1)}")
            current_item_idx = len(current_section['items']) - 1
            continue
        m = ITEM_RE.match(line)
        if not m:
            m = NUM_RE.match(line)
        if m and current_section:
            indent = len(m.group(1))
            text = m.group(2) if len(m.groups()) == 2 else m.group(3)
            text = text.strip()
            if indent > 2 and current_item_idx is not None:
                current_section['items'][current_item_idx] += ' ' + text
            else:
                current_section['items'].append(text)
                current_item_idx = len(current_section['items']) - 1
            continue
        # 行内续接
        if current_section and current_item_idx is not None and line.strip():
            current_section['items'][current_item_idx] += ' ' + line.strip()
    return {'title': title, 'sections': sections}


def list_reports(projects, days=14):
    since = datetime.datetime.now() - datetime.timedelta(days=days)
    results = []
    for prj in projects:
        if not os.path.isdir(prj['memory_dir']):
            continue
        for fn in sorted(os.listdir(prj['memory_dir'])):
            m = DATE_FILE_RE.match(fn)
            if not m:
                continue
            date = m.group(1)
            try:
                dt = datetime.datetime.strptime(date, '%Y-%m-%d')
            except ValueError:
                continue
            if dt < since:
                continue
            path = os.path.join(prj['memory_dir'], fn)
            suffix = m.group(2) or ''
            try:
                parsed = parse_markdown(path)
            except Exception as e:
                parsed = {'title': fn, 'sections': [{'title': '解析失败', 'items': [str(e)]}]}
            results.append({
                'project': prj['name'],
                'project_path': prj['path'],
                'date': date,
                'suffix': suffix,
                'file': fn,
                'file_path': path,
                'title': parsed['title'],
                'sections': parsed['sections'],
                'mtime': datetime.datetime.fromtimestamp(os.path.getmtime(path)).isoformat()
            })
    # 按日期降序，同日期按项目名排序
    results.sort(key=lambda x: (x['date'], x['project']), reverse=True)
    return results


HTML_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'daily_report_dashboard.html')


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # 减少日志噪音
        pass

    def do_GET(self):
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        if parsed.path == '/api/reports':
            try:
                days = int(qs.get('days', ['14'])[0])
            except ValueError:
                days = 14
            data = {
                'generated_at': datetime.datetime.now().isoformat(),
                'projects': [{'name': p['name'], 'path': p['path']} for p in PROJECTS],
                'reports': list_reports(PROJECTS, days=days)
            }
            self.send_json(data)
            return
        if parsed.path == '/':
            try:
                with open(HTML_FILE, 'r', encoding='utf-8') as f:
                    html = f.read()
            except FileNotFoundError:
                html = '<h1>daily_report_dashboard.html 未找到</h1>'
            self.send_html(html)
            return
        self.send_error(404)

    def send_json(self, obj):
        body = json.dumps(obj, ensure_ascii=False, indent=2).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, html):
        body = html.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    root = os.environ.get('HOLANG_DAILY_ROOT', DEFAULT_ROOT)
    global PROJECTS
    PROJECTS = discover_projects(root)
    print(f"[日报聚合] 根目录: {os.path.realpath(root)}")
    print(f"[日报聚合] 发现 {len(PROJECTS)} 个项目工作区:")
    for p in PROJECTS:
        print(f"  - {p['name']}")
    server = HTTPServer(('127.0.0.1', port), Handler)
    print(f"[日报聚合] 服务已启动: http://127.0.0.1:{port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[日报聚合] 已停止")


if __name__ == '__main__':
    main()
