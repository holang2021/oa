// ============================================================
// 企微消息加解密模块（WXBizMsgCrypt）
// 复用自 wecom-callback/src/crypto.js（已验证正确，与企微官方算法一致）
// 参考: https://developer.work.weixin.qq.com/document/path/90968
// ============================================================

import crypto from 'crypto'

/**
 * 企微消息加解密
 * 流程:
 * - 接收: 取 msg_signature → 验签 → Base64 解码 → AES 解密 → 去随机串+长度头 → 取 XML
 * - 回复: XML → 加随机串+长度头+CorpId → AES 加密 → Base64 → 签名 → 打包 XML
 */
export class WXBizMsgCrypt {
  constructor(token, encodingAESKey, corpId) {
    this.token = token
    // encodingAESKey 是 43 位，补 '=' 到 44 位再 Base64 解码 → 32 字节 AES Key
    this.aesKey = Buffer.from(encodingAESKey + '=', 'base64')
    if (this.aesKey.length !== 32) {
      throw new Error(`EncodingAESKey 解码后长度异常: ${this.aesKey.length} (应为 32)`)
    }
    this.corpId = corpId
  }

  // SHA1 签名：对参数按字典序排序后拼接再 SHA1
  signature(...args) {
    return crypto.createHash('sha1').update(args.sort().join('')).digest('hex')
  }

  // URL 验证（GET）：解密 echostr 并返回明文
  verifyURL(msgSignature, timestamp, nonce, echostr) {
    const sig = this.signature(this.token, timestamp, nonce, echostr)
    if (sig !== msgSignature) throw new Error('签名验证失败(URL验证)')
    return this._decrypt(echostr).message
  }

  // 解密消息（POST）：返回 { message, receiveId }
  decryptMsg(msgSignature, timestamp, nonce, encryptedXml) {
    const match = encryptedXml.match(/<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/)
    if (!match) throw new Error('无法解析加密消息体(Encrypt 字段缺失)')
    const encrypt = match[1]

    const sig = this.signature(this.token, timestamp, nonce, encrypt)
    if (sig !== msgSignature) throw new Error('消息签名验证失败')

    const { message, receiveId } = this._decrypt(encrypt)
    return { xml: message, receiveId }
  }

  // 加密回复：返回加密后的 XML
  encryptMsg(replyXml, timestamp, nonce) {
    const encrypt = this._encrypt(replyXml)
    const sig = this.signature(this.token, timestamp, nonce, encrypt)
    return `<xml>
<Encrypt><![CDATA[${encrypt}]]></Encrypt>
<MsgSignature><![CDATA[${sig}]]></MsgSignature>
<TimeStamp>${timestamp}</TimeStamp>
<Nonce><![CDATA[${nonce}]]></Nonce>
</xml>`
  }

  // AES 解密
  _decrypt(encryptedText) {
    const encrypted = Buffer.from(encryptedText, 'base64')
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.aesKey, this.aesKey.slice(0, 16))
    decipher.setAutoPadding(false) // 手动处理 PKCS7（企微块大小 32）

    let decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

    // 去除 PKCS7 padding（末字节 = 填充长度）
    const padLen = decrypted[decrypted.length - 1]
    decrypted = decrypted.slice(0, decrypted.length - padLen)

    // 前 16 字节 = 随机串，接着 4 字节(大端) = 消息长度
    const msgLen = decrypted.readUInt32BE(16)
    const message = decrypted.slice(20, 20 + msgLen).toString('utf8')
    const receiveId = decrypted.slice(20 + msgLen).toString('utf8')

    return { message, receiveId }
  }

  // AES 加密
  _encrypt(plainText) {
    const randomBytes = crypto.randomBytes(16)
    const textBuffer = Buffer.from(plainText, 'utf8')
    const corpIdBuffer = Buffer.from(this.corpId, 'utf8')
    const msgLen = Buffer.alloc(4)
    msgLen.writeUInt32BE(textBuffer.length, 0)

    const raw = Buffer.concat([randomBytes, msgLen, textBuffer, corpIdBuffer])

    // PKCS7 padding（块大小 32）
    const blockSize = 32
    const padLen = blockSize - (raw.length % blockSize)
    const padded = Buffer.concat([raw, Buffer.alloc(padLen, padLen)])

    const cipher = crypto.createCipheriv('aes-256-cbc', this.aesKey, this.aesKey.slice(0, 16))
    cipher.setAutoPadding(false)
    const encrypted = Buffer.concat([cipher.update(padded), cipher.final()])

    return encrypted.toString('base64')
  }
}
