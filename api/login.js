const memberHost = 'https://ecvip.pchome.com.tw/ecapi/member/v3.1'

/**
 * Step 1：查詢驗證方式並寄送 OTP
 * 呼叫後查收信箱，再用 verify() 完成登入
 * @param {string} account - PChome 帳號（email）
 * @returns {Promise<string>} sendType - 'email' 或 'mobile'
 */
const sendCode = async function (account) {
  // 取得驗證方式（email 或手機）
  const wayResult = await this._request({
    url: `${memberHost}/member/verifyWay`,
    method: 'post',
    json: true,
    jar: this._jar,
    body: JSON.stringify({ Account: account })
  })
  const sendType = (wayResult && wayResult.SendType) ? wayResult.SendType : 'email'

  // 寄出驗證碼
  await this._request({
    url: `${memberHost}/member/loginVerify`,
    method: 'post',
    json: true,
    jar: this._jar,
    body: JSON.stringify({ op: 'sendotp', data: { Account: account, SendType: sendType } })
  })

  console.log(`驗證碼已寄至 ${sendType === 'email' ? '信箱' : '手機'}，請查收`)
  return sendType
}

/**
 * Step 2：輸入 OTP 完成登入
 * 登入成功後 this._jar 會自動存入 session cookie，可直接使用其他 API
 * @param {string} account - PChome 帳號（email）
 * @param {string} otpCode - 收到的驗證碼
 * @param {string} sendType - 驗證方式，通常為 'email'
 * @param {boolean} isSave - 是否保持登入
 */
const verify = async function (account, otpCode, sendType = 'email', isSave = false) {
  return this._request({
    url: `${memberHost}/member/loginVerify`,
    method: 'post',
    json: true,
    jar: this._jar,
    body: JSON.stringify({
      op: 'examineotp',
      data: { Account: account, SendType: sendType, OTPCode: otpCode, IsSave: isSave }
    })
  })
}

module.exports = { sendCode, verify }
