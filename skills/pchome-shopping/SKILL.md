# PChome 購物助手

幫助使用者在 PChome 24h 購物網站自動化購物流程，包含登入、查看購物車、加入商品等操作。

## 工具

使用 `pchome-cli` 指令（需已安裝於系統 PATH）：

```
node /path/to/pchome-api/cli.js <command> [args]
```

或若已設為全域指令：

```
pchome-cli <command> [args]
```

所有指令輸出均為 JSON 格式。

## 登入流程

PChome 使用 Email OTP 驗證碼登入，**無法**使用帳號密碼直接登入。

### Step 1：寄送驗證碼

```bash
pchome-cli login:send <email>
```

→ 系統會寄驗證碼到信箱，**必須詢問使用者收到的驗證碼**後再進行 Step 2。

### Step 2：輸入驗證碼

```bash
pchome-cli login:verify <email> <otp>
```

→ 成功後 session 會自動儲存到 `~/.pchome-api/session.json`（chmod 600）。

**重要：OTP 處理規則**
- 執行 `login:send` 後，**必須停下來**詢問使用者：「請查收信箱，收到驗證碼後告訴我」
- 收到使用者回覆的驗證碼後，再執行 `login:verify`
- 不要猜測或假設驗證碼

## 購物操作

### 查看購物車

```bash
pchome-cli cart
```

### 加入購物車

```bash
pchome-cli add2cart <prodId> [quantity]
```

- `prodId` 格式：`類別碼-商品碼-規格碼`，例如 `DCACM3-A900IR2US-000`
- 規格碼可從商品頁的規格選單 option value 找到；若無規格選項則為 `000`
- 此指令會自動先執行 snapup 確認商品可購買，再加入購物車

### 確認商品狀態（不加入購物車）

```bash
pchome-cli snapup <prodId>
```

### 從購物車移除

```bash
pchome-cli remove <prodId>
```

### 勾選/取消勾選購物車商品

先取得購物車資訊，從中找到商品的 `Key`：

```bash
# 取得購物車（含 Key）
pchome-cli cart

# 勾選（納入結帳）
pchome-cli select <prodId> <cartKey>

# 取消勾選（稍後購買）
pchome-cli select <prodId> <cartKey> --deselect

# 指定數量
pchome-cli select <prodId> <cartKey> --qty=2
```

### 查看優惠券

```bash
pchome-cli coupon
```

## 結帳

**結帳（order）操作不在此 Skill 範圍內。**

購物車確認完成後，請指示使用者自行前往 PChome 網站完成付款：

> 「購物車已準備好，請至 PChome 24h 購物網站完成結帳：https://24h.pchome.com.tw/cart/」

## Session 管理

- Session 儲存於 `~/.pchome-api/session.json`（chmod 600）
- 可透過環境變數 `PCHOME_SESSION_FILE` 指定其他路徑
- Session 失效時（API 回傳錯誤或空資料）需重新執行登入流程
- Cookie 有效期限不固定，失效時需重新登入

## 錯誤處理

| 錯誤訊息 | 原因 | 處理方式 |
|---------|------|---------|
| `Cannot pass snapup API` | 商品無法購買（缺貨/下架） | 告知使用者商品目前無法購買 |
| `Cart is empty` | 加入購物車後購物車為空 | 可能是登入失效，重新登入 |
| `{"error":"..."}` | 一般錯誤 | 依錯誤訊息判斷 |

## 範例對話流程

```
使用者：幫我把 DCACM3-A900IR2US-000 加入購物車

助手：我需要先確認登入狀態。讓我查看購物車...
[pchome-cli cart]

（若登入失效）
助手：Session 已失效，需要重新登入。請提供您的 PChome 帳號 Email。

使用者：myemail@example.com

助手：好的，我來寄送驗證碼...
[pchome-cli login:send myemail@example.com]

助手：驗證碼已寄出，請查收信箱後告訴我驗證碼。

使用者：123456

助手：[pchome-cli login:verify myemail@example.com 123456]
登入成功！現在幫您加入購物車...
[pchome-cli add2cart DCACM3-A900IR2US-000 1]

助手：已成功將商品加入購物車。如需結帳，請前往 PChome 24h 購物網站。
```
