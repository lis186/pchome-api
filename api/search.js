const SORT_MAP = {
  price: 'prc',
  new: 'new',
  sale: 'sale'
}

const search = async function (keyword, options = {}) {
  const { cateid, sort, order = 'asc', page = 1 } = options

  const qs = {
    q: keyword,
    scope: 'all',
    page
  }

  if (cateid) qs.cateid = cateid

  if (sort && SORT_MAP[sort]) {
    qs.sort = SORT_MAP[sort] + '/' + (order === 'desc' ? 'dc' : 'ac')
  }

  const res = await this._request({
    url: 'https://ecshweb.pchome.com.tw/search/v4.3/all/results',
    method: 'get',
    qs,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      Referer: 'https://24h.pchome.com.tw/'
    },
    json: true
  })
  return {
    totalRows: res.TotalRows || 0,
    totalPage: res.TotalPage || 0,
    prods: (res.Prods || []).map(p => ({
      Id: p.Id,
      Name: p.Name,
      Price: p.Price,
      OriginPrice: p.OriginPrice,
      Author: p.Author,
      Brand: p.Brand
    }))
  }
}

module.exports = search
