#!/bin/bash
cat > /opt/holang/wecom-app-1000081/_e2e_verify.mjs <<"JSEOF"
import { WXBizMsgCrypt } from "/opt/holang/wecom-app-1000081/src/crypto.js"
import dotenv from "dotenv"
dotenv.config({ path: "/opt/holang/wecom-app-1000081/.env" })
import crypto from "crypto"
import http from "http"

const token = process.env.WECOM_TOKEN
const aes = process.env.WECOM_ENCODING_AES_KEY
const corp = process.env.WECOM_CORP_ID
const c = new WXBizMsgCrypt(token, aes, corp)

const echostr = "verify-" + crypto.randomBytes(6).toString("hex")
const timestamp = String(Math.floor(Date.now() / 1000))
const nonce = crypto.randomBytes(8).toString("hex")
const encrypted = c._encrypt(echostr)
const sig = c.signature(token, timestamp, nonce, encrypted)
const url = `http://127.0.0.1:3008/wecom/1000081/callback?msg_signature=${sig}&timestamp=${timestamp}&nonce=${nonce}&echostr=${encodeURIComponent(encrypted)}`
http.get(url, res => {
  let body = ""
  res.on("data", d => (body += d))
  res.on("end", () => {
    console.log("expected :", echostr)
    console.log("got      :", body)
    console.log("MATCH    :", body === echostr ? "YES" : "NO")
  })
}).on("error", e => console.log("REQ ERROR:", e.message))
JSEOF
node /opt/holang/wecom-app-1000081/_e2e_verify.mjs
rm -f /opt/holang/wecom-app-1000081/_e2e_verify.mjs
