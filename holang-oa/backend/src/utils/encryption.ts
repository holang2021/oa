// ============================================================
// 凭据加密工具 —— 邮件归集专用
// 企业邮箱「客户端授权码」属敏感凭据，绝不落明文。
// 采用 Node crypto AES-256-GCM（认证加密，自带完整性校验）。
// 密钥取自环境变量 EMAIL_CRED_ENCRYPTION_KEY（32 字节 / 64 十六进制位）。
// 未配置时回退到开发常量并打印告警（仅限本地/预览环境，生产必须配置）。
// —— 吸取此前伙伴云 API key 明文写死在源码的事故，本项目一律加密存储。
// ============================================================

import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // GCM 推荐 12 字节 IV
const TAG_LEN = 16;
const PREFIX = 'v1:'; // 版本前缀，便于后续算法轮换

// 开发回退密钥（32 字节）。仅当 EMAIL_CRED_ENCRYPTION_KEY 未配置时使用，并告警。
// 切勿在生产的真实环境依赖此常量。
const DEV_FALLBACK_KEY = crypto.scryptSync('holang-dev-email-cred-fallback', 'salt', 32);

let warned = false;

function getKey(): Buffer {
  const raw = process.env.EMAIL_CRED_ENCRYPTION_KEY;
  if (raw && raw.length >= 32) {
    // 优先当作 32 字节原始字符串；若恰好是 64 位十六进制则按 hex 解码
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      return Buffer.from(raw, 'hex');
    }
    return Buffer.from(raw, 'utf8').subarray(0, 32).length === 32
      ? Buffer.from(raw, 'utf8').subarray(0, 32)
      : Buffer.from(raw.padEnd(32, '0'), 'utf8').subarray(0, 32);
  }
  if (!warned) {
    console.warn(
      '[email-cred] 未配置 EMAIL_CRED_ENCRYPTION_KEY，使用开发回退密钥加密凭据。生产环境务必配置 32 字节强密钥，否则凭据可被还原！'
    );
    warned = true;
  }
  return DEV_FALLBACK_KEY;
}

/**
 * 加密明文（如授权码）。返回带版本前缀的 base64 字符串。
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // 组合：iv || tag || ciphertext
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
}

/**
 * 解密 encryptSecret 产出的密文，还原明文。
 */
export function decryptSecret(payload: string): string {
  if (!payload.startsWith(PREFIX)) {
    // 兼容历史/异常：非本格式直接返回原值（理论上不应出现）
    return payload;
  }
  const key = getKey();
  const buf = Buffer.from(payload.slice(PREFIX.length), 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}
