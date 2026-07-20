#!/usr/bin/env python3
"""伙伴云 API 测试 — 使用正确的 Space ID"""
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
            raw = resp.read()
            return json.loads(raw.decode('utf-8'))
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return json.loads(raw.decode('utf-8'))
        except:
            return {'code': e.code, 'message': raw.decode('utf-8', errors='replace')}
    except Exception as e:
        return {'code': -1, 'message': str(e)}

# Test 1: table/list
print('=== Test 1: table/list ===')
r = api_call('/table/list', {'space_id': SPACE_ID})
print(json.dumps(r, ensure_ascii=False, indent=2)[:3000])

# Test 2: 客户信息 data
print('\n\n=== Test 2: 客户信息 (table_id: 2100000074090415) ===')
r2 = api_call('/item/find', {
    'space_id': SPACE_ID,
    'table_id': '2100000074090415',
    'page_size': 2,
    'page_index': 1
})
print(json.dumps(r2, ensure_ascii=False, indent=2)[:3000])
