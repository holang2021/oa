#!/usr/bin/env python3
"""伙伴云 API — 测试不同参数格式"""
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

# Try different parameter formats
tests = [
    ('POST page_size+page_index', {'space_id': SPACE_ID, 'table_id': '2100000074090397', 'page_size': 2, 'page_index': 1}),
    ('POST limit+offset', {'space_id': SPACE_ID, 'table_id': '2100000074090397', 'limit': 2, 'offset': 0}),
    ('POST size', {'space_id': SPACE_ID, 'table_id': '2100000074090397', 'size': 2}),
    ('POST no pagination', {'space_id': SPACE_ID, 'table_id': '2100000074090397'}),
    ('POST filter empty', {'space_id': SPACE_ID, 'table_id': '2100000074090397', 'filter': {}}),
]

for label, payload in tests:
    r = api_call('/item/find', payload)
    print(f'{label}: code={r.get("code")}, msg={r.get("message")}')
    if r.get('code') == 0 and r.get('data'):
        items = r['data'] if isinstance(r['data'], list) else r['data'].get('items', [])
        print(f'  items: {len(items)}')
        if items:
            print(f'  first: {json.dumps(items[0], ensure_ascii=False)[:200]}')
