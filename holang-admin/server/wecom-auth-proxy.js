/**
 * HOLANG 企微 OAuth 认证代理（参考实现）
 *
 * ⚠️ 此文件仅作技术参考，不是生产代码。
 *    部署前需完成：安全加固、速率限制、日志脱敏、HTTPS 强制。
 *
 * 用途：
 *   接收前端传来的 OAuth code，调用企微 API 换取 UserID 和用户信息，
 *   返回给前端。CorpSecret 仅存在于此后端，不暴露到浏览器。
 *
 * 企微 API 文档：
 *   GET https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=ID&corpsecret=SECRET
 *   GET https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=TOKEN&code=CODE
 *   GET https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=TOKEN&userid=USERID
 *
 * 启动：
 *   node server/wecom-auth-proxy.js
 *
 * 前端配置（app.js WECOM_CONFIG.proxyApi）：
 *   proxyApi: 'http://localhost:3001/api/wecom/auth'
 */

const http = require('http');
const https = require('https');
const url = require('url');

// ==================== 配置 ====================
const CONFIG = {
  port: 3001,
  // ⚠️ 以下凭证请从环境变量读取，绝不可硬编码在源码中
  corpId: process.env.WECOM_CORP_ID || 'wwe74343b7a90d201f',
  corpSecret: process.env.WECOM_CORP_SECRET || '',
  // 允许的前端来源（CORS）
  allowedOrigins: [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://ai.holangchina.com',
  ],
};

// ==================== 企微 API 调用 ====================

/** 获取 access_token（生产环境需加 Redis 缓存，7200s 有效） */
function getAccessToken() {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${CONFIG.corpId}&corpsecret=${CONFIG.corpSecret}`;
    https.get(apiUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.errcode === 0) {
            resolve(json.access_token);
          } else {
            reject(new Error(`获取token失败: ${json.errmsg} (${json.errcode})`));
          }
        } catch (e) {
          reject(new Error(`解析token响应失败: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/** 通过 code 获取 UserID */
function getUserId(accessToken, code) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${accessToken}&code=${code}`;
    https.get(apiUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.errcode === 0) {
            resolve(json);
          } else {
            reject(new Error(`获取UserId失败: ${json.errmsg} (${json.errcode})`));
          }
        } catch (e) {
          reject(new Error(`解析UserId响应失败: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/** 通过 UserID 获取用户详细信息 */
function getUserDetail(accessToken, userId) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&userid=${userId}`;
    https.get(apiUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.errcode === 0) {
            resolve(json);
          } else {
            reject(new Error(`获取用户详情失败: ${json.errmsg} (${json.errcode})`));
          }
        } catch (e) {
          reject(new Error(`解析用户详情失败: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// ==================== HTTP Server ====================
const server = http.createServer(async (req, res) => {
  // CORS
  const origin = req.headers.origin || '';
  if (CONFIG.allowedOrigins.includes(origin) || CONFIG.allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = url.parse(req.url, true);

  // POST /api/wecom/auth
  if (req.method === 'POST' && parsed.pathname === '/api/wecom/auth') {
    try {
      // 读取请求体
      let body = '';
      for await (const chunk of req) { body += chunk; }

      const { code } = JSON.parse(body);
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '缺少 code 参数' }));
        return;
      }

      // Step 1: 获取 access_token
      const accessToken = await getAccessToken();

      // Step 2: code → UserID
      const userInfo = await getUserId(accessToken, code);

      // Step 3: UserID → 用户详情（可选，可获取姓名、部门、头像等）
      let userDetail = null;
      try {
        userDetail = await getUserDetail(accessToken, userInfo.UserId);
      } catch (e) {
        // 获取详情失败不影响登录，使用基本信息
        console.warn('获取用户详情失败:', e.message);
      }

      // 构造返回数据
      const result = {
        userId: userInfo.UserId,
        name: userDetail ? userDetail.name : userInfo.UserId,
        avatar: userDetail ? userDetail.avatar || '' : '',
        department: userDetail ? userDetail.department || [] : [],
        position: userDetail ? userDetail.position || '' : '',
        role: '员工',
      };

      console.log(`[AUTH] 用户登录: ${result.name} (${result.userId})`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));

    } catch (e) {
      console.error('[AUTH ERROR]', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ==================== 启动 ====================
if (!CONFIG.corpSecret) {
  console.error('❌ 未配置 WECOM_CORP_SECRET 环境变量，服务无法启动');
  console.error('   请设置: export WECOM_CORP_SECRET=your_secret_here');
  process.exit(1);
}

server.listen(CONFIG.port, () => {
  console.log(`✅ 企微认证代理已启动: http://localhost:${CONFIG.port}/api/wecom/auth`);
  console.log(`   CorpID: ${CONFIG.corpId}`);
});
