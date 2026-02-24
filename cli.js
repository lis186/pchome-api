#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const API = require('.')

const SESSION_FILE = process.env.PCHOME_SESSION_FILE ||
  path.join(process.env.HOME || process.env.USERPROFILE || '~', '.pchome-api', 'session.json')

function loadSession () {
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
  } catch {
    return { cookie: {} }
  }
}

function saveSession (data) {
  const dir = path.dirname(SESSION_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), { mode: 0o600 })
}

function output (data) {
  console.log(JSON.stringify(data, null, 2))
}

function extractCookiesFromJar (jar) {
  const jarData = jar._jar.toJSON()
  const cookieMap = {}
  ;(jarData.cookies || [])
    .filter(c => c.domain && c.domain.includes('pchome'))
    .forEach(c => { cookieMap[c.key] = c.value })
  return cookieMap
}

async function main () {
  const [,, cmd, ...args] = process.argv

  if (!cmd) {
    console.error('Usage: pchome-cli <command> [args...]')
    console.error('')
    console.error('Commands:')
    console.error('  login:send <email>                              寄送 OTP 驗證碼')
    console.error('  login:verify <email> <otp>                     驗證 OTP 並儲存 session')
    console.error('  snapup <prodId>                                 確認商品可訂購狀態')
    console.error('  add2cart <prodId> [quantity]                    加入購物車（含 snapup）')
    console.error('  remove <prodId>                                 從購物車移除')
    console.error('  cart                                            查看購物車')
    console.error('  coupon                                          查看購物車優惠券')
    console.error('  select <prodId> <cartKey> [--deselect] [--qty=N]  勾選/取消勾選商品')
    console.error('')
    console.error('Session file:', SESSION_FILE)
    process.exit(1)
  }

  const session = loadSession()
  const api = new API(session.cookie || {})

  try {
    switch (cmd) {
      case 'login:send': {
        const [email] = args
        if (!email) throw new Error('Usage: login:send <email>')
        const sendType = await api.login.sendCode(email)
        output({ success: true, sendType })
        break
      }

      case 'login:verify': {
        const [email, otp] = args
        if (!email || !otp) throw new Error('Usage: login:verify <email> <otp>')
        const result = await api.login.verify(email, otp)
        const cookies = extractCookiesFromJar(api._jar)
        const saved = {
          ECC: cookies.ECC,
          ECWEBSESS: cookies.ECWEBSESS,
          sstSID: cookies.sstSID
        }
        saveSession({ cookie: saved })
        output({ success: true, sessionFile: SESSION_FILE, raw: result })
        break
      }

      case 'snapup': {
        const [prodId] = args
        if (!prodId) throw new Error('Usage: snapup <prodId>')
        const result = await api.snapup(prodId)
        output(result)
        break
      }

      case 'add2cart': {
        const [prodId, qty] = args
        if (!prodId) throw new Error('Usage: add2cart <prodId> [quantity]')
        const snapupData = await api.snapup(prodId)
        const result = await api.add2Cart(prodId, snapupData, parseInt(qty || '1'))
        output(result)
        break
      }

      case 'remove': {
        const [prodId] = args
        if (!prodId) throw new Error('Usage: remove <prodId>')
        const result = await api.removeFromCart(prodId)
        output(result)
        break
      }

      case 'cart': {
        const result = await api.getCartInfo({})
        output(result)
        break
      }

      case 'coupon': {
        const result = await api.prodCouponInfo()
        output(result)
        break
      }

      case 'select': {
        const [prodId, cartKey, ...opts] = args
        if (!prodId || !cartKey) throw new Error('Usage: select <prodId> <cartKey> [--deselect] [--qty=N]')
        const deselect = opts.includes('--deselect')
        const qtyArg = opts.find(o => o.startsWith('--qty='))
        const qty = qtyArg ? parseInt(qtyArg.split('=')[1]) : 1
        const result = await api.setCartItemSelect(prodId, !deselect, cartKey, qty)
        output(result)
        break
      }

      default:
        console.error(JSON.stringify({ error: `Unknown command: ${cmd}` }))
        process.exit(1)
    }
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }))
    process.exit(1)
  }
}

main()
