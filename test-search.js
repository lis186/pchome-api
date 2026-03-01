const assert = require('assert')
const API = require('./api')

const api = new API({})

async function runTests () {
  const results = { pass: 0, fail: 0 }

  async function test (name, fn) {
    try {
      await fn()
      console.log(`  ✓ ${name}`)
      results.pass++
    } catch (err) {
      console.log(`  ✗ ${name}`)
      console.log(`    ${err.message}`)
      results.fail++
    }
  }

  console.log('search API tests\n')

  // --- 分類篩選 ---
  console.log('category filter:')

  await test('filters by cateid to return only matching category', async () => {
    const res = await api.search('游舒帆', { cateid: 'DJBQ' })
    assert(res.totalRows > 0, 'should have results')
    assert(res.prods.every(p => p.Id.startsWith('DJBQ')), 'all products should be in DJBQ category')
  })

  await test('cateid=DJBQ returns fewer results than unfiltered', async () => {
    const all = await api.search('游舒帆')
    const kobo = await api.search('游舒帆', { cateid: 'DJBQ' })
    assert(kobo.totalRows < all.totalRows, `filtered (${kobo.totalRows}) should be less than all (${all.totalRows})`)
  })

  // --- 排序 ---
  console.log('\nsorting:')

  await test('sort by price ascending returns cheapest first', async () => {
    const res = await api.search('游舒帆', { sort: 'price' })
    assert(res.prods.length >= 2, 'need at least 2 results')
    assert(res.prods[0].Price <= res.prods[1].Price, `first ($${res.prods[0].Price}) should be <= second ($${res.prods[1].Price})`)
  })

  await test('sort by price descending returns most expensive first', async () => {
    const res = await api.search('游舒帆', { sort: 'price', order: 'desc' })
    assert(res.prods.length >= 2, 'need at least 2 results')
    assert(res.prods[0].Price >= res.prods[1].Price, `first ($${res.prods[0].Price}) should be >= second ($${res.prods[1].Price})`)
  })

  // --- 分頁 ---
  console.log('\npagination:')

  await test('returns at most 20 products per page (PChome fixed page size)', async () => {
    const res = await api.search('iPhone')
    assert(res.prods.length <= 20, `should return at most 20 products, got ${res.prods.length}`)
    assert(res.totalRows > 20, 'iPhone should have more than 20 total results')
  })

  await test('page parameter returns different results', async () => {
    const page1 = await api.search('iPhone', { pageSize: 5, page: 1 })
    const page2 = await api.search('iPhone', { pageSize: 5, page: 2 })
    assert(page1.prods.length > 0, 'page 1 should have results')
    assert(page2.prods.length > 0, 'page 2 should have results')
    assert(page1.prods[0].Id !== page2.prods[0].Id, 'page 1 and page 2 should have different first product')
  })

  await test('returns totalRows and totalPage in response', async () => {
    const res = await api.search('iPhone', { pageSize: 5 })
    assert(typeof res.totalRows === 'number', 'totalRows should be a number')
    assert(typeof res.totalPage === 'number', 'totalPage should be a number')
    assert(res.totalPage > 1, 'should have multiple pages')
  })

  // --- 組合使用 ---
  console.log('\ncombined:')

  await test('category + sort works together', async () => {
    const res = await api.search('游舒帆', { cateid: 'DJBQ', sort: 'price' })
    assert(res.prods.every(p => p.Id.startsWith('DJBQ')), 'all should be DJBQ')
    if (res.prods.length >= 2) {
      assert(res.prods[0].Price <= res.prods[1].Price, 'should be price ascending')
    }
  })

  // --- 結果 ---
  console.log(`\n${results.pass} passing, ${results.fail} failing`)
  if (results.fail > 0) process.exit(1)
}

runTests().catch(err => { console.error(err); process.exit(1) })
