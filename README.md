# (非官方) PChome API

![npm](https://img.shields.io/npm/v/pchome-api)
![NPM](https://img.shields.io/npm/l/pchome-api)

一套 Nodejs Package，可以透過 API 來完成自動訂購。

## 簡介

基本上能做到從加入購物車到結帳的流程，不支援線上付款但可以貨到付款。如果還需要其他文件需求，歡迎發 ISSUE 叫我更新。

## APIs

- **search** - 搜尋商品。
  給入關鍵字，回傳商品列表（Id、Name、Price、Author 等），不需要登入。
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

除了 Node.js API，也提供 `pchome-cli` 指令列工具，所有指令輸出均為 **JSON 格式**，方便腳本或 AI agent 串接。

### 安裝

```shell
npm install -g pchome-api
```

或直接用 `node` 執行：

```shell
node /path/to/pchome-api/cli.js <command>
```

### 登入

PChome 採用 Email OTP 驗證碼登入，需分兩步執行：

```shell
# Step 1：寄驗證碼到信箱
pchome-cli login:send your@email.com

# Step 2：收到驗證碼後完成登入
pchome-cli login:verify your@email.com 123456
```

登入成功後 session 會自動存到 `~/.pchome-api/session.json`，之後的指令都會自動讀取，不需要重新登入（直到 session 失效）。

### 指令一覽

| 指令 | 說明 |
|------|------|
| `login:send <email>` | 寄送 OTP 驗證碼 |
| `login:verify <email> <otp>` | 驗證 OTP 並儲存 session |
| `search <keyword>` | 搜尋商品（不需登入） |
| `snapup <prodId>` | 確認商品可訂購狀態（回傳 MAC token） |
| `add2cart <prodId> [qty]` | 加入購物車（自動執行 snapup） |
| `remove <prodId>` | 從購物車移除商品 |
| `cart` | 查看購物車（含商品 Key、運費等） |
| `select <prodId> <cartKey>` | 勾選商品（納入結帳） |
| `select <prodId> <cartKey> --deselect` | 取消勾選（稍後購買） |
| `select <prodId> <cartKey> --qty=2` | 勾選並設定數量 |
| `coupon` | 查看購物車優惠券資訊 |

### 範例流程

```shell
# 1. 登入
pchome-cli login:send your@email.com
pchome-cli login:verify your@email.com 123456
# → { "success": true, "sessionFile": "/Users/you/.pchome-api/session.json" }

# 2. 加入購物車（prodId 格式：類別碼-商品碼-規格碼）
pchome-cli add2cart DCACM3-A900IR2US-000 1
# → { "PRODTOTAL": 1, ... }

# 3. 查看購物車，取得商品 Key（用於勾選）
pchome-cli cart | jq '.itemlist.houses["24H"].packages[0].items | to_entries[0].value | {Key, IT_SNO, QTY}'
# → { "Key": "c06ed5...", "IT_SNO": "DCACM3-A900IR2US-000", "QTY": 1 }

# 4. 確認勾選（納入結帳）
pchome-cli select DCACM3-A900IR2US-000 c06ed5...

# 5. 前往網站完成結帳（CLI 不支援 order，需手動操作）
```

### Session 管理

- 預設路徑：`~/.pchome-api/session.json`（chmod 600）
- 自訂路徑：`PCHOME_SESSION_FILE=/path/to/session.json pchome-cli cart`
- Session 失效時指令會回傳空資料或錯誤，重新執行 `login:send` / `login:verify` 即可

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
