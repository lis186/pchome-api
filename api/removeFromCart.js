const removeFromCart = async function (productionId) {
  const data = JSON.stringify({ TB: '24H', T: 'DEL', TI: productionId })
  const res = await this._request({
    url: 'https://ecssl-cart.pchome.com.tw/cart/index.php/prod/modify',
    qs: {
      data,
      callback: 'jsonp_modshopcart',
      _: Date.now()
    },
    headers: {
      Referer: 'https://24h.pchome.com.tw/'
    }
  })
  const jsonpMatch = res.match(/jsonp_modshopcart\((.*?)\)/)
  const result = JSON.parse(jsonpMatch ? jsonpMatch[1] : res)
  return result
}

module.exports = removeFromCart
