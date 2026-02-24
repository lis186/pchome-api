const API = require('./api')
const config = require('./config')

async function main () {
  const api = new API(config.cookie)

  console.log('1. 測試 snapup...')
  const snapupResult = await api.snapup(config.prodId)
  console.log('snapup OK:', snapupResult)

  console.log('\n2. 測試 add2Cart...')
  const cartResult = await api.add2Cart(config.prodId, snapupResult, 1)
  console.log('add2Cart OK:', cartResult)

  console.log('\n3. 測試 prodCouponInfo + getCartInfo...')
  const couponInfo = await api.prodCouponInfo()
  console.log('couponInfo OK:', couponInfo)
}

main().catch(err => console.error('錯誤:', err.message))
