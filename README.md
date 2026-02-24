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
- **removeFromCart** - 從購物車移除產品。
  給入產品 ID，例如「DCACM3-A900IR2US-000」，返回操作後的購物車狀態（`PRODCOUNT` 為剩餘商品數）。
- **setCartItemSelect** - 勾選或取消勾選購物車商品（決定是否納入結帳）。
  需先透過 `getCartInfo()` 取得商品的 `Key`，再呼叫此 API。`selected: true` = 勾選，`false` = 取消勾選（稍後購買）。
- **getCartInfo** - 取得購物車當前資訊（含運費、支援的付款方式）。
- **prodCouponInfo** - 取得購物車內商品的優惠券資訊。
- **order** - 訂購。
  目前只支援貨到付款，倘若目前訂單不支援貨到付款則無法使用。（例如訂單中的貨物從不同倉庫發貨的情況）

## 安裝

```shell
npm install pchome-api
```

## 登入

PChome 目前採用 **Email OTP 驗證碼**登入，不再使用 reCaptcha，因此可以完全自動化：

```js
const API = require('pchome-api')

const api = new API({})  // 初始時不需要 cookie

// Step 1：輸入帳號，系統寄驗證碼到信箱
await api.login.sendCode('your@email.com')

// Step 2：查收信箱後，輸入驗證碼完成登入
await api.login.verify('your@email.com', '123456')

// 登入成功！之後可直接使用其他 API
const snapupResult = await api.snapup('DCACM3-A900IR2US-000')
```

### 取得 Cookie（手動方式）

若不想每次都走 OTP 流程，可取出登入後的 Cookie 儲存備用。
Cookie 中有部分為 `HttpOnly`（包含關鍵的 `ECWEBSESS`），需透過以下方式取得：

**使用腳本自動擷取**（需先以 OTP 登入，再執行）：

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

> 需啟動 Chrome 並開啟遠端偵錯：`google-chrome --remote-debugging-port=9222`

## 設定（使用既有 Cookie）

取得 Cookie 後填入 `config.json`（參考 `config.example.json`）可跳過 OTP 流程：

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

## CLI 工具

安裝後可直接使用 `pchome-cli` 指令（輸出均為 JSON）：

```shell
# 登入（Email OTP 驗證碼）
pchome-cli login:send your@email.com
pchome-cli login:verify your@email.com 123456

# 購物車操作
pchome-cli cart                                   # 查看購物車
pchome-cli add2cart DCACM3-A900IR2US-000 1        # 加入購物車（自動 snapup）
pchome-cli remove DCACM3-A900IR2US-000            # 從購物車移除
pchome-cli select <prodId> <cartKey>              # 勾選商品（納入結帳）
pchome-cli select <prodId> <cartKey> --deselect   # 取消勾選
pchome-cli coupon                                 # 查看優惠券
```

Session 預設儲存於 `~/.pchome-api/session.json`（chmod 600），可透過 `PCHOME_SESSION_FILE` 環境變數指定其他路徑。

## OpenClaw Skill

`skills/pchome-shopping/SKILL.md` 提供 OpenClaw agent 使用的 Skill 定義，包含完整的指令說明與 OTP 互動流程。

## 注意事項

- Cookie 有有效期限，登出後即失效，需重新取得
- `snapup` 回傳的 MAC token 只有 **15 秒**有效，請在取得後立即執行 `add2Cart`
- PChome 對高頻率請求有流量管制，避免過於頻繁發送請求（可能暫時收到 403）

## 聲明

此 API 不保證流程能完全符合 PChome 官方，僅測試過可以成功訂購，所以若無法使用或造成任何損失，我可不負責任的喔。

## Python 版本 API

另有開發 Python 版本，**支援貨到付款、超商取貨付款、ATM/ibon 付款、信用卡一次付清、PI 錢包支付、儲值點數付款等支付方式**，可以與企業內部採購系統整合，有需要可以來信洽詢。
