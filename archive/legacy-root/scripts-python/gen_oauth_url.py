import urllib.parse
import random
import string
import os
import json
import time

APP_ID = 100038427476
AUTH_URL = 'https://cloud.tencent.com/open/authorize'
REDIRECT_URL = 'https://cli.cloud.tencent.com/oauth'
SITE = 'cn'
DEFAULT_LANG = 'zh-CN'

# Generate random state
state = ''.join(random.choices(string.ascii_letters + string.digits, k=10))

# Save state
state_dir = os.path.expanduser('~/.tccli')
os.makedirs(state_dir, exist_ok=True)
state_file = os.path.join(state_dir, '.oauth_state')
with open(state_file, 'w') as f:
    json.dump({'state': state, 'timestamp': int(time.time())}, f)

# Build redirect URL
redirect_query = 'browser=no&lang=' + urllib.parse.quote(DEFAULT_LANG) + '&site=' + urllib.parse.quote(SITE)
redirect_url_full = REDIRECT_URL + '?' + redirect_query

# Build auth URL (URL-encode redirect_url properly)
auth_url = AUTH_URL + '?scope=login&app_id=' + str(APP_ID) + '&redirect_url=' + urllib.parse.quote(redirect_url_full, safe='') + '&state=' + urllib.parse.quote(state)

print('')
print('=' * 60)
print('   腾讯云 OAuth 授权登录')
print('=' * 60)
print('')
print('请在浏览器中打开以下链接完成登录：')
print('')
print(auth_url)
print('')
print('=' * 60)
print('登录后，页面会显示一串 base64 编码的验证码。')
print('请复制验证码，发送给我。')
print('')
print('State: ' + state + ' (10分钟内有效)')
print('=' * 60)
