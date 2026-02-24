# (非官方) PChome API

![npm](https://img.shields.io/npm/v/pchome-api)
![NPM](https://img.shields.io/npm/l/pchome-api)

一套 Nodejs Package，可以透過 API 來完成自動訂購。

## 簡介

基本上能做到從加入購物車到結帳的流程，不支援線上付款但可以貨到付款。如果還需要其他文件需求，歡迎發 ISSUE 叫我更新。

## APIs

- **snapup** - 確認目前產品的狀態。
  加入購物車前的狀態確認，若為可訂購狀態，會返回 `MAC`、`MACExpire`（有效期 15 秒），用來給 `add2Cart` 使用。
- **add2Cart** - 將產品加入購物車。
  給入產品 ID 和數量，例如「DYAPC0-A90084I39-000」，注意最後一部分是規格編號，通常不會在網址上出現。
- **getCartInfo** - 取得購物車當前資訊（含運費、支援的付款方式）。
- **prodCouponInfo** - 取得購物車內商品的優惠券資訊。
- **order** - 訂購。
  目前只支援貨到付款，倘若目前訂單不支援貨到付款則無法使用。（例如訂單中的貨物從不同倉庫發貨的情況）

## 安裝

```shell
npm install pchome-api
```

## 取得 Cookie

PChome 採用 Google reCaptcha 保護登入程序，因此**無法自動登入**，需手動取得 Cookie。

Cookie 中有部分為 `HttpOnly`（包含關鍵的 `ECWEBSESS`），無法直接從瀏覽器 DevTools Console 複製，需透過以下方式取得：

### 方法一：使用腳本自動擷取（推薦）

先在瀏覽器登入 PChome 24h，接著執行：

```js
// get-cookies.js（需先 npm install chrome-remote-interface）
const CDP = require('chrome-remote-interface');

CDP(async (client) => {
  const { cookies } = await client.Network.getAllCookies();
  const map = {};
  cookies.filter(c => c.domain.includes('pchome'))
         .forEach(c => map[c.name] = c.value);
  console.log(JSON.stringify({
    ECC: map.ECC,
    ECWEBSESS: map.ECWEBSESS,
    sstSID: map.sstSID
  }, null, 2));
  await client.close();
}).on('error', e => console.error(e.message));
```

> 執行前需啟動 Chrome 並開啟遠端偵錯：`google-chrome --remote-debugging-port=9222`

### 方法二：從 DevTools 手動複製

1. 登入 [PChome 24h](https://24h.pchome.com.tw/)
2. 開啟 DevTools → Application → Cookies → `https://24h.pchome.com.tw`
3. 複製 `ECC`、`ECWEBSESS`、`sstSID` 的值

## 設定

將取得的 Cookie 填入 `config.json`（參考 `config.example.json`）：

```json
{
  "cookie": {
    "ECC": "xxxxxxxx.xxxxxxxxxx",
    "ECWEBSESS": "xxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxx",
    "sstSID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.xxxxxxxxxx"
  },
  "prodId": "DCACM3-A900IR2US-000"
}
```

**Product ID 格式**：`類別碼-商品碼-規格碼`
- 規格碼可從商品頁規格下拉選單的 option value 找到
- 若無規格選項，預設為 `000`

## 使用

完整範例請參考 [example.js](example.js)。

```js
const API = require('pchome-api')
const config = require('./config')

const api = new API(config.cookie)

// 1. 確認商品狀態（MAC 有效期僅 15 秒，需立即接著執行 add2Cart）
const snapupResult = await api.snapup(config.prodId)

// 2. 加入購物車
await api.add2Cart(config.prodId, snapupResult, 1)

// 3. 確認購物車（可選，確認運費與付款方式）
const cartInfo = await api.getCartInfo(...)

// 4. 送出訂單
await api.order({ payWay: 'COD', ... })
```

## 注意事項

- Cookie 有有效期限，登出後即失效，需重新取得
- `snapup` 回傳的 MAC token 只有 **15 秒**有效，請在取得後立即執行 `add2Cart`
- PChome 對高頻率請求有流量管制，避免過於頻繁發送請求（可能暫時收到 403）

## 聲明

此 API 不保證流程能完全符合 PChome 官方，僅測試過可以成功訂購，所以若無法使用或造成任何損失，我可不負責任的喔。

## Python 版本 API

另有開發 Python 版本，**支援貨到付款、超商取貨付款、ATM/ibon 付款、信用卡一次付清、PI 錢包支付、儲值點數付款等支付方式**，可以與企業內部採購系統整合，有需要可以來信洽詢。
