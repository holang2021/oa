// ============================================================
// 企微消息加解密模块
// 参考: https://developer.work.weixin.qq.com/document/path/90968
// ============================================================

import crypto from 'crypto'

/**
 * 企微消息加解密
 * 
 * 流程:
 * - 接收: 取 msg_signature→验签→Base64解码→AES解密→去随机字符串→取XML
 * - 回复: XML→加随机字符串→AES加密→Base64→签名→打包XML
 */
export class WXBizMsgCrypt {
  constructor(token, encodingAESKey, corpId) {
    this.token = token
    // encodingAESKey 是 43 位，补 '=' 到 44 位再 Base64 解码，得到 32 字节 AES Key
    this.aesKey = Buffer.from(encodingAESKey + '=', 'base64')
    this.corpId = corpId
  }

  // SHA1 签名
  signature(...args) {
    return crypto.createHash('sha1').update(args.sort().join('')).digest('hex')
  }

  // URL 验证: 解密 echostr
  verifyURL(msgSignature, timestamp, nonce, echostr) {
    const sig = this.signature(this.token, timestamp, nonce, echostr)
    if (sig !== msgSignature) throw new Error('签名验证失败')
    return this._decrypt(echostr).message
  }

  // 解密消息: 返回 { message, receiveId }
  decryptMsg(msgSignature, timestamp, nonce, encryptedXml) {
    // 从 XML 提取 Encrypt 字段
    const match = encryptedXml.match(/<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/)
    if (!match) throw new Error('无法解析加密消息体')
    const encrypt = match[1]

    const sig = this.signature(this.token, timestamp, nonce, encrypt)
    if (sig !== msgSignature) throw new Error('消息签名验证失败')

    const { message, receiveId } = this._decrypt(encrypt)
    return { xml: message, receiveId }
  }

  // 加密回复: 返回加密后的 XML
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
    decipher.setAutoPadding(false)

    let decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

    // 去除 PKCS7 padding
    const padLen = decrypted[decrypted.length - 1]
    decrypted = decrypted.slice(0, decrypted.length - padLen)

    // 前 16 字节 = 随机字符串，接着 4 字节 = 消息长度
    const msgLen = decrypted.readUInt32BE(16)
    const message = decrypted.slice(20, 20 + msgLen).toString('utf8')
    const receiveId = decrypted.slice(20 + msgLen).toString('utf8')

    return { message, receiveId }
  }

  // AES 加密
  _encrypt(plainText) {
    // 16 字节随机字符串 + 4 字节长度 + 明文 + CorpId
    const randomBytes = crypto.randomBytes(16)
    const textBuffer = Buffer.from(plainText, 'utf8')
    const corpIdBuffer = Buffer.from(this.corpId, 'utf8')
    const msgLen = Buffer.alloc(4)
    msgLen.writeUInt32BE(textBuffer.length, 0)

    const raw = Buffer.concat([randomBytes, msgLen, textBuffer, corpIdBuffer])

    // PKCS7 padding
    const blockSize = 32
    const padLen = blockSize - (raw.length % blockSize)
    const padded = Buffer.concat([raw, Buffer.alloc(padLen, padLen)])

    const cipher = crypto.createCipheriv('aes-256-cbc', this.aesKey, this.aesKey.slice(0, 16))
    cipher.setAutoPadding(false)
    const encrypted = Buffer.concat([cipher.update(padded), cipher.final()])

    return encrypted.toString('base64')
  }
}
