import urllib.request, json

API_KEY = 'fMOD3hXtX1RF24sbZwvfFSzAYUjgpRv8mELWjxOd'
COMPANY_ID = '5100000000393675'
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
            result = json.loads(raw.decode('utf-8'))
            return result
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return json.loads(raw.decode('utf-8'))
        except:
            return {'code': e.code, 'message': raw.decode('utf-8', errors='replace')}
    except Exception as e:
        return {'code': -1, 'message': str(e)}

print('=== Try 1: table/list with company_id ===')
r = api_call('/table/list', {'company_id': COMPANY_ID})
print(json.dumps(r, ensure_ascii=False, indent=2))

print('\n=== Try 2: app/list ===')
r = api_call('/app/list', {'company_id': COMPANY_ID})
print(json.dumps(r, ensure_ascii=False, indent=2))

print('\n=== Try 3: space/list ===')
r = api_call('/space/list', {'company_id': COMPANY_ID})
print(json.dumps(r, ensure_ascii=False, indent=2))

print('\n=== Try 4: table/list with app_id (use company_id as app_id) ===')
r = api_call('/table/list', {'app_id': COMPANY_ID})
print(json.dumps(r, ensure_ascii=False, indent=2))

print('\n=== Try 5: GET method instead of POST ===')
url = BASE_URL + '/table/list?company_id=' + COMPANY_ID
headers = {
    'Open-Authorization': 'Bearer ' + API_KEY
}
req = urllib.request.Request(url, headers=headers, method='GET')
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        print(json.dumps(json.loads(resp.read()), ensure_ascii=False, indent=2))
except Exception as e:
    print('GET failed: ' + str(e))
