/**
 * 勾選或取消勾選購物車商品（是否選入結帳）
 *
 * @param {string} productionId - 商品 ID，例如「DCACM3-A900IR2US-000」
 * @param {boolean} selected - true = 勾選（結帳用），false = 取消勾選（稍後購買）
 * @param {string} cartKey - 購物車項目 KEY，從 getCartInfo() 回傳的 itemlist 中取得
 * @param {number} [quantity=1] - 數量
 * @returns {Promise<Object>} 操作結果
 *
 * @example
 * const cart = await api.getCartInfo({})
 * const item = Object.values(cart.itemlist.houses['24H'].packages[0].items)[0]
 * await api.setCartItemSelect(item.IT_SNO, true, item.Key, item.QTY)
 */
const setCartItemSelect = async function (productionId, selected, cartKey, quantity = 1) {
  const items = [{
    T: 'UPD',
    TI: productionId,
    LB: selected ? 'N' : 'Y', // LB = "Later Buy": N = 立刻結帳, Y = 稍後購買
    YTQ: quantity,
    KEY: cartKey
  }]

  const res = await this._request({
    url: 'https://ecssl.pchome.com.tw/sys/cflow/fsapi/BigCar/BIGCAR/modifyItems',
    method: 'post',
    json: true,
    qs: { _: Date.now() },
    form: { data: JSON.stringify(items) }
  })

  return res
}

module.exports = setCartItemSelect
