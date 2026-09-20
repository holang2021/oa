import json
from tencentcloud.common.credential import Credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.cvm.v20170312 import cvm_client, models

d = json.load(open('C:/Users/liush/.tccli/default.credential', encoding='utf-8'))
cred = Credential(d['secretId'], d['secretKey'])
client = cvm_client.CvmClient(cred, 'ap-shanghai',
                              ClientProfile(httpProfile=HttpProfile(endpoint='cvm.tencentcloudapi.com')))

req = models.InquiryPriceRenewInstancesRequest()
req.InstanceIds = ['ins-4xm95czz']
req.InstanceChargePrepaid = models.InstanceChargePrepaid()
req.InstanceChargePrepaid.Period = 1
req.InstanceChargePrepaid.RenewFlag = 'NOTIFY_AND_MANUAL_RENEW'
try:
    resp = client.InquiryPriceRenewInstances(req)
    p = resp.Price
    print('PriceInstancePrice:', p.InstancePrice.UnitPrice, '| Discount:', p.InstancePrice.OriginalPrice, '| ChargeUnit:', p.InstancePrice.ChargeUnit)
    if getattr(p, 'BandwidthPrice', None):
        print('BandwidthPrice:', p.BandwidthPrice.UnitPrice)
    print('RAW:', json.dumps(p.__dict__, default=str, ensure_ascii=False)[:800])
except Exception as e:
    print('ERR:', type(e).__name__, str(e)[:400])
