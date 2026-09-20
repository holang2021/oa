#!/bin/bash
set -e
echo "=== install tencentcloud sdk (dnspod) ==="
pip3 install --no-cache-dir tencentcloud-sdk-python 2>&1 | tail -3
mkdir -p /opt/holang/_common
cat > /opt/holang/_common/dnspod_cred.json <<'EOF'
{"secretId":"YOUR_TENCENT_SECRET_ID_HERE","secretKey":"YOUR_TENCENT_SECRET_KEY_HERE"}
EOF
chmod 600 /opt/holang/_common/dnspod_cred.json
echo "=== write auth hook ==="
cat > /opt/holang/_common/dnspod_auth.py <<'PYEOF'
#!/usr/bin/env python3
import os, json, time
from tencentcloud.common import credential
from tencentcloud.dnspod.v20210323 import dnspod_client, models
domain = os.environ['CERTBOT_DOMAIN']
validation = os.environ['CERTBOT_VALIDATION']
cred = json.load(open('/opt/holang/_common/dnspod_cred.json'))
cred_obj = credential.Credential(cred['secretId'], cred['secretKey'])
client = dnspod_client.DnspodClient(cred_obj, 'ap-guangzhou')
sub = '_acme-challenge.oa'
req = models.CreateRecordRequest()
req.Domain = 'holangchina.com'
req.SubDomain = sub
req.RecordType = 'TXT'
req.RecordLine = '默认'
req.Value = validation
resp = client.CreateRecord(req)
rid = resp.RecordId
open('/tmp/acme_oa_record_id', 'w').write(str(rid))
print('CREATED_RECORD', rid)
print('waiting 75s for DNS propagation ...')
time.sleep(75)
PYEOF
echo "=== write cleanup hook ==="
cat > /opt/holang/_common/dnspod_cleanup.py <<'PYEOF'
#!/usr/bin/env python3
import os, json
from tencentcloud.common import credential
from tencentcloud.dnspod.v20210323 import dnspod_client, models
rid = open('/tmp/acme_oa_record_id').read().strip()
cred = json.load(open('/opt/holang/_common/dnspod_cred.json'))
cred_obj = credential.Credential(cred['secretId'], cred['secretKey'])
client = dnspod_client.DnspodClient(cred_obj, 'ap-guangzhou')
req = models.DeleteRecordRequest()
req.Domain = 'holangchina.com'
req.RecordId = int(rid)
client.DeleteRecord(req)
print('DELETED_RECORD', rid)
PYEOF
chmod 700 /opt/holang/_common/dnspod_auth.py /opt/holang/_common/dnspod_cleanup.py
echo "=== verify sdk import ==="
python3 -c "from tencentcloud.dnspod.v20210323 import dnspod_client; print('SDK_OK')"
echo "DNS01_SETUP_DONE"
