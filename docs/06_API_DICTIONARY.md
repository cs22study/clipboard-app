# API 協定與資料庫欄位字典 (API & Database Dictionary)

> **後端端點**：`https://script.google.com/macros/s/AKfycbznuGd3oq8QhzY4av8deOdNUS-f9b-r_fDqMPZl0DnXIIOEd4Ca5KlfqPZGlJmsVqM10g/exec`  
> **傳輸通訊協定**：HTTP POST（Header: `Content-Type: text/plain;charset=utf-8`）  
> **資料封裝格式**：標準 JSON 字串

---

## 1. 資料庫結構字典 (Database Schema Dictionary)

資料庫試算表 ID：`1n33bBAwBLvEuikyr0wRgWww8wsK5yYW33hcLYj7-STM`

### 1.1 記事卡片表 (`Padlet_Cards` 與 `Cards_{username}`)

所有使用者專屬分頁皆嚴格遵守以下 13 欄結構標準：

| 欄位序號 | 欄位代號 | 標題名稱 | 型態 (Type) | 必填 | 範例值 | 業務說明 |
| :---: | :--- | :--- | :--- | :---: | :--- | :--- |
| **A** | `id` | 卡片識別碼 | String | 是 | `card_1794446052621` | 以 `card_` 開頭之時間戳識別碼 |
| **B** | `topic` | 主題名稱 | String | 是 | `工作記錄` | 所屬 Padlet 瀑布流欄位分類 |
| **C** | `title` | 記事標題 | String | 是 | `晨會重點摘要` | 卡片主標題 (XSS 安全過濾) |
| **D** | `content` | 記事內容 | String | 否 | `今天討論 Q4 目標...` | 筆記詳細內文，支援多行換行 |
| **E** | `img_url` | 截圖圖片網址 | String | 否 | `https://lh3.googleusercontent.com/d/1XyZ...` | Google 全球 CDN 圖片直連連結 |
| **F** | `tags` | 標籤分類 | String | 否 | `會議,專案,Q4` | 逗號分隔標籤清單 |
| **G** | `password` | 刪除保護密碼 | String | 否 | `1234` | 建立時設定之保護 PIN (伺服器端比對) |
| **H** | `order` | 排序序號 | Number | 是 | `1`, `2`, `10` | 欄位內排序權重 (越小越靠前) |
| **I** | `created_at` | 建立時間 | String | 是 | `2026-11-12 09:14:12` | 建立時之 ISO 或格式化時間戳 |
| **J** | `is_deleted`| 軟刪除旗標 | Boolean | 是 | `FALSE` / `TRUE` | `TRUE` 代表已移至回收筒 |
| **K** | `color` | 便條紙底色 | String | 是 | `white`, `yellow`, `pink`... | 6 種預設色票關鍵字 |
| **L** | `is_pinned` | 釘選置頂 | Boolean | 是 | `FALSE` / `TRUE` | `TRUE` 代表強制置頂 |
| **M** | `likes` | 愛心讚數 | Number | 是 | `0`, `12` | 點讚計數 (正整數) |

---

### 1.2 使用者註冊表 (`Users_Registry`)

| 欄位序號 | 欄位代號 | 型態 | 說明 |
| :---: | :--- | :--- | :--- |
| **A** | `user_id` | String | 使用者唯一編號 (如 `usr_1794451200000`) |
| **B** | `username` | String | 登入帳號名稱 (小寫英數字) |
| **C** | `password_hash` | String | 密碼雜湊或加密字串 |
| **D** | `display_name` | String | 使用者暱稱 |
| **E** | `role` | String | `admin` (管理者) 或 `user` (一般使用者) |
| **F** | `created_at` | String | 註冊時間戳記 |
| **G** | `tab_name` | String | 指向的專屬工作表分頁 (如 `Cards_xiesong`) |

---

### 1.3 系統設定表 (`Admin_Settings`)

| 欄位序號 | 鍵 (Key) | 值 (Value) | 說明 |
| :---: | :--- | :--- | :--- |
| **A** | `key` | `master_pin` | 總管理員全域保護 PIN (預設 `8888`) |
| **B** | `value` | `8888` | 密碼值 |
| **C** | `description`| 說明文字 | 總管理員授權與重設金鑰 |

---

## 2. API 動作清冊與規格 (API Actions Specification)

後端接收之 JSON 基礎格式：
```json
{
  "action": "ACTION_NAME",
  "username": "當前操作帳號 (可選，未填則為公開看板)",
  "...其他特定參數"
}
```

後端標準回傳 JSON 格式：
```json
{
  "success": true,
  "data": { ... },
  "message": "提示文字 (成功時)",
  "error": "錯誤描述 (失敗時)"
}
```

---

### 2.1 帳號與認證類

#### `register` - 註冊新帳號
- **Payload**:
  ```json
  { "action": "register", "username": "xiesong", "password": "mypassword", "displayName": "小松" }
  ```
- **Response**:
  ```json
  { "success": true, "data": { "username": "xiesong", "displayName": "小松", "role": "user" } }
  ```

#### `login` - 帳號登入
- **Payload**:
  ```json
  { "action": "login", "username": "xiesong", "password": "mypassword" }
  ```
- **Response**:
  ```json
  { "success": true, "data": { "username": "xiesong", "displayName": "小松", "role": "user" } }
  ```

---

### 2.2 記事卡片 CRUD 與互動類

#### `getBoardData` - 取得指定使用者看板資料
- **Payload**:
  ```json
  { "action": "getBoardData", "username": "xiesong" }
  ```
- **Response**:
  ```json
  { "success": true, "data": [ { "id": "card_xxx", "topic": "工作", "title": "...", ... } ] }
  ```

#### `createPost` - 建立新筆記 (支援圖文與便條紙顏色)
- **Payload**:
  ```json
  {
    "action": "createPost",
    "username": "xiesong",
    "topic": "專案靈感",
    "title": "新架構評估",
    "content": "評估 Hub-and-Spoke 效益",
    "base64Image": "data:image/png;base64,iVBORw0KG...",
    "tags": "架構,AI",
    "password": "1234",
    "color": "yellow"
  }
  ```
- **Response**:
  ```json
  { "success": true, "data": { "id": "card_1794451999999", "img_url": "https://lh3..." } }
  ```

#### `updatePost` - 修改筆記內容
- **Payload**:
  ```json
  {
    "action": "updatePost",
    "username": "xiesong",
    "id": "card_1794451999999",
    "title": "新標題",
    "content": "新內文",
    "tags": "新標籤",
    "color": "blue",
    "password": "1234"
  }
  ```

#### `deletePost` - 軟刪除筆記 (需密碼防護)
- **Payload**:
  ```json
  { "action": "deletePost", "username": "xiesong", "id": "card_1794451999999", "password": "1234" }
  ```

#### `togglePin` - 切換釘選置頂狀態
- **Payload**:
  ```json
  { "action": "togglePin", "username": "xiesong", "id": "card_1794451999999" }
  ```
- **Response**:
  ```json
  { "success": true, "data": { "is_pinned": true } }
  ```

#### `toggleLike` - 愛心點讚 (原子遞增)
- **Payload**:
  ```json
  { "action": "toggleLike", "username": "xiesong", "id": "card_1794451999999" }
  ```
- **Response**:
  ```json
  { "success": true, "data": { "likes": 6 } }
  ```

#### `swapOrder` / `setOrderIndex` - 調整順序
- **Payload (`swapOrder`)**:
  ```json
  { "action": "swapOrder", "username": "xiesong", "id1": "card_1", "id2": "card_2" }
  ```
- **Payload (`setOrderIndex`)**:
  ```json
  { "action": "setOrderIndex", "username": "xiesong", "id": "card_1", "newOrder": 3 }
  ```

#### `renameTopic` - 批次更名主題欄位
- **Payload**:
  ```json
  { "action": "renameTopic", "username": "xiesong", "oldTopic": "舊主題", "newTopic": "新主題" }
  ```

---

### 2.3 管理員特權與災難還原類

#### `verifyAdmin` - 驗證總管理者 PIN
- **Payload**:
  ```json
  { "action": "verifyAdmin", "pin": "8888" }
  ```

#### `updateMasterPin` - 修改總管理者 PIN
- **Payload**:
  ```json
  { "action": "updateMasterPin", "oldPin": "8888", "newPin": "9999" }
  ```

#### `getTrashCards` - 讀取回收筒已刪除清單
- **Payload**:
  ```json
  { "action": "getTrashCards", "username": "xiesong", "pin": "8888" }
  ```

#### `restorePost` - 一鍵復原被軟刪除之卡片
- **Payload**:
  ```json
  { "action": "restorePost", "username": "xiesong", "id": "card_1794451999999", "pin": "8888" }
  ```
