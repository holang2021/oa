#!/usr/bin/env python3
"""伙伴云 API 测试 — 拉取真实数据"""
import urllib.request, json

API_KEY = 'fMOD3hXtX1RF24sbZwvfFSzAYUjgpRv8mELWjxOd'
SPACE_ID = '4000000008001969'
BASE_URL = 'https://api.huoban.com/openapi/v1'

def api_call(path, payload):
    url = BASE_URL + path
    headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Open-Authorization': 'Bearer ' + API_KEY
    }
    body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return json.loads(raw.decode('utf-8'))
        except:
            return {'code': e.code, 'message': raw.decode('utf-8', errors='replace')}
    except Exception as e:
        return {'code': -1, 'message': str(e)}

# Test: 客户信息 with correct table_id 2100000074090397
print('=== 客户信息 ===')
r = api_call('/item/find', {
    'space_id': SPACE_ID,
    'table_id': '2100000074090397',
    'page_size': 2,
    'page_index': 1
})
print(json.dumps(r, ensure_ascii=False, indent=2)[:3000])

# Test: 订单
print('\n\n=== 订单 ===')
r = api_call('/item/find', {
    'space_id': SPACE_ID,
    'table_id': '2100000074090391',
    'page_size': 2,
    'page_index': 1
})
print(json.dumps(r, ensure_ascii=False, indent=2)[:3000])

# Test: 员工档案
print('\n\n=== 员工档案 ===')
r = api_call('/item/find', {
    'space_id': SPACE_ID,
    'table_id': '2100000074090385',
    'page_size': 3,
    'page_index': 1
})
print(json.dumps(r, ensure_ascii=False, indent=2)[:3000])
