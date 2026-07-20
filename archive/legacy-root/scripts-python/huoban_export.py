#!/usr/bin/env python3
# HOLANG CRM 数据导出 — 从伙伴云导出全量数据
import os
import json
import time
import urllib.request
import urllib.error
from datetime import datetime

API_KEY = os.environ.get("HUOBAN_API_KEY", "fMOD3hXtX1RF24sbZwvfFSzAYUjgpRv8mELWjxOd")
BASE_URL = "https://api.huoban.com"
SPACE_ID = "4000000008001969"
OUTPUT_BASE = r"C:\Users\liush\.workbuddy\workspace\files\36084\dca69a52-04e2-4785-9ae1-716c99f21cf9\huoban_data"

HEADERS = {
    "Content-Type": "application/json",
    "Open-Authorization": f"Bearer {API_KEY}",
}

def api_call(method, path, data=None):
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print(f"  HTTP {e.code}: {err_body[:300]}")
        return None
    except Exception as e:
        print(f"  Error: {e}")
        return None

def get_tables():
    result = api_call("POST", "/openapi/v1/table/list", {"space_id": SPACE_ID})
    if result and result.get("code") == 0:
        return result["data"]["tables"]
    return []

def get_table_config(table_id):
    """POST /openapi/v1/table/{table_id}"""
    result = api_call("POST", f"/openapi/v1/table/{table_id}")
    if result and result.get("code") == 0:
        return result["data"]["table"]
    return None

def get_table_items(table_id, offset=0, limit=100):
    """POST /openapi/v1/item/list"""
    result = api_call("POST", "/openapi/v1/item/list", {
        "table_id": table_id,
        "limit": limit,
        "offset": offset,
    })
    if result and result.get("code") == 0:
        return result["data"]
    return None

def export_all():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = os.path.join(OUTPUT_BASE, f"export_{timestamp}")
    
    print("=== HOLANG 伙伴云数据导出 ===")
    print(f"工作区: {SPACE_ID}")
    print(f"输出: {output_dir}\n")
    
    # Step 1: 获取表格列表
    print("[1/3] 获取表格列表...")
    tables = get_tables()
    valid_tables = [t for t in tables if not t["name"].startswith("---")]
    print(f"  {len(tables)} 个表格（{len(valid_tables)} 个有效）\n")
    
    all_data = {}
    schema_data = {}
    total_records = 0
    
    # Step 2: 获取字段结构
    print("[2/3] 获取字段结构...")
    for i, t in enumerate(tables):
        name = t["name"]
        tid = t["table_id"]
        
        if name.startswith("---"):
            continue
        
        config = get_table_config(tid)
        if config:
            fields = config.get("fields", [])
            schema_data[name] = {
                "table_id": tid,
                "name": name,
                "fields": fields
            }
            print(f"  [{i+1}/{len(tables)}] {name}: {len(fields)} 个字段")
        else:
            print(f"  [{i+1}/{len(tables)}] {name}: 获取失败")
        time.sleep(0.2)
    print()
    
    # Step 3: 获取数据
    print("[3/3] 获取记录数据...")
    for i, t in enumerate(tables):
        name = t["name"]
        tid = t["table_id"]
        
        if name.startswith("---"):
            continue
        
        print(f"  [{i+1}/{len(tables)}] {name}...", end=" ", flush=True)
        
        all_items = []
        offset = 0
        while True:
            data = get_table_items(tid, offset=offset, limit=100)
            if not data:
                break
            
            items = data.get("items", [])
            if not items:
                break
            
            all_items.extend(items)
            total = data.get("total", 0)
            
            if len(all_items) >= total:
                break
            
            offset += 100
            time.sleep(0.15)
        
        all_data[name] = all_items
        total_records += len(all_items)
        print(f"{len(all_items)} 条 (total={data.get('total', '?') if data else '?'})")
        time.sleep(0.2)
    
    # Step 4: 保存
    print(f"\n[保存] 写入 {output_dir} ...")
    os.makedirs(output_dir, exist_ok=True)
    
    # Schema
    schema_file = os.path.join(output_dir, "00_schema.json")
    with open(schema_file, 'w', encoding='utf-8') as f:
        json.dump(schema_data, f, ensure_ascii=False, indent=2)
    print(f"  schema: 00_schema.json")
    
    # 原始数据
    json_file = os.path.join(output_dir, "01_data.json")
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    print(f"  数据: 01_data.json")
    
    # 报告
    lines = [
        f"# 伙伴云数据导出报告",
        f"导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"工作区: {SPACE_ID}",
        f"表格总数: {len(tables)}（有效 {len(valid_tables)}）",
        f"记录总数: {total_records}",
        "",
        "| 表名 | 字段数 | 记录数 |",
        "|------|--------|--------|",
    ]
    for t in tables:
        name = t["name"]
        if name.startswith("---"):
            continue
        fc = len(schema_data.get(name, {}).get("fields", []))
        rc = len(all_data.get(name, []))
        lines.append(f"| {name} | {fc} | {rc} |")
    
    with open(os.path.join(output_dir, "README.md"), 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))
    print(f"  报告: README.md")
    
    print(f"\n=== 完成 ===")
    print(f"有效表格: {len(valid_tables)} 张")
    print(f"总记录数: {total_records} 条")
    print(f"输出: {output_dir}")
    return output_dir, all_data, schema_data

if __name__ == "__main__":
    export_all()
