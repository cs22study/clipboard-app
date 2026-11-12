# 各模組開發細節規格書 (Module Specifications)

> **架構定位**：Spoke 詳細規格庫  
> **適用情境**：在各新開 Session 進行單一模組開發、優化或修復時提供完整指引。

---

## 📑 模組目錄

- [M01: 帳號認證與多租戶工作表分派模組 (Auth & Multi-tenant Isolation)](#m01-帳號認證與多租戶工作表分派模組)
- [M02: Padlet 瀑布流欄位渲染引擎 (Shelf & Waterfall Engine)](#m02-padlet-瀑布流欄位渲染引擎)
- [M03: 雲端媒體庫與 CDN 轉換模組 (Media Vault & CDN Sync)](#m03-雲端媒體庫與-cdn-轉換模組)
- [M04: 便條紙自訂外觀與高階互動模組 (Palette, Pin & Likes)](#m04-便條紙自訂外觀與高階互動模組)
- [M05: 刪除防護、管理員控制台與軟刪除回收筒 (Admin & Trash Recovery)](#m05-刪除防護管理員控制台與軟刪除回收筒)
- [M06: Markdown 結構化備份匯出模組 (Markdown Exporter)](#m06-markdown-結構化備份匯出模組)
- [M07: 主題欄位動態管理模組 (Topic Management)](#m07-主題欄位動態管理模組)

---

## M01: 帳號認證與多租戶工作表分派模組

### 1.1 功能目標
允許不同使用者透過簡單帳號與密碼註冊/登入。登入後，使用者所有操作完全重定向至屬於該帳號的專屬工作表（如 `Cards_username`），確保各使用者資料 100% 獨立隔離且互不干擾。

### 1.2 資料結構與工作表
- **工作表名稱**：`Users_Registry`
- **結構**：
  | 欄位 | 名稱 | 說明 |
  | :--- | :--- | :--- |
  | A | `user_id` | 唯一帳號識別碼 (如 `usr_1794451200000`) |
  | B | `username` | 登入帳號名稱 (英數小寫) |
  | C | `password_hash` | 密碼雜湊或加密字串 |
  | D | `display_name` | 使用者暱稱 |
  | E | `role` | 角色 (`user` 或 `admin`) |
  | F | `created_at` | 註冊 ISO 時間 |
  | G | `tab_name` | 對應專屬工作表名稱 (如 `Cards_xiesong`) |

### 1.3 後端核心邏輯 (`Code.gs`)
- `resolveSheetForUser(username)`：
  1. 若 `username` 為空或訪客，回傳 `Padlet_Cards`。
  2. 若 `username` 存在，檢查試算表是否已有 `Cards_{username}`。
  3. 若無該分頁，即刻建立新分頁並填寫 13 欄標準標題行：
     `["id", "topic", "title", "content", "img_url", "tags", "password", "order", "created_at", "is_deleted", "color", "is_pinned", "likes"]`
  4. 回傳該專屬工作表物件。

### 1.4 前端狀態管理
- 登入狀態暫存於 `localStorage`：
  - `currentUser`: 存放目前使用者物件 `{ username, displayName, role }`。
- 頂部導航列動態顯示「歡迎，`{displayName}`！」與「登出」按鈕。未登入時顯示「登入 / 註冊」按鈕。

---

## M02: Padlet 瀑布流欄位渲染引擎

### 1.1 功能目標
提供類似 Padlet 的 Shelf 直式分欄排版。不同主題（Topic）並列橫向排列，各主題下方卡片垂直縱向無限向下堆疊。

### 1.2 排序與渲染規範
1. **分組演算法**：
   - 從後端撈取目前使用者的全部卡片資料 (`is_deleted == FALSE`)。
   - 依照 `topic` 欄位進行分組。若有空主題，預設歸入「通用筆記」。
2. **多重優先級排序 (Multi-level Sort)**：
   - 第一優先級：`is_pinned == true` 置頂優先。
   - 第二優先級：`order` 數值由小到大排序。
   - 第三優先級：`created_at` 時間戳記倒序（新卡片在前）。
3. **安全渲染規範 (XSS 防禦)**：
   - 標題與內文一律以 `escapeHtml(card.title)`、`escapeHtml(card.content)` 轉換後再輸出。
   - 連結偵測採用正規表示式匹配 `(https?://[^\s]+)`，轉換為帶有 `target="_blank" rel="noopener noreferrer"` 的安全 `<a>` 標籤。

---

## M03: 雲端媒體庫與 CDN 轉換模組

### 1.1 功能目標
使用者在新增筆記時，可直接透過剪貼簿貼上截圖（Ctrl+V），系統自動轉化並上傳至指定 Google Drive 資料夾，並生成全球 CDN 高速載入網址。

### 1.2 檔案與資料夾路徑鎖定
- **專案主目錄**：`線上筆記資料速記APP` (ID: `14LNISHVvM8h5oaVx4bKbTgnNcRqeQcmW`)
- **截圖儲存目錄**：`雲端記事牆資料截圖照片` (ID: `15Bo8djCeOuhexWLi-6sjr5uqmfk7IFfN`)

### 1.3 轉換邏輯與安全防護
1. 前端取得 `data:image/png;base64,...`，提取純 Base64 字串傳送至後端 `createPost`。
2. 後端使用 `Utilities.base64Decode(cleanBase64)` 解碼為二進位 Blob。
3. 存入指定資料夾，檔名規範：`post_{timestamp}_{rand}.png`。
4. 網址轉換：
   ```javascript
   const imgUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
   ```
5. **避坑措施**：嚴禁執行 `file.setSharing(...)`，避免 Google Drive 權限拒絕例外；改由資料夾統一繼承公開權限。

---

## M04: 便條紙自訂外觀與高階互動模組

### 1.1 6 色便條紙色盤 (Palette)
支援在發布與編輯卡片時挑選底色，對應 CSS 變數：
- **預設白 (White)**：`#ffffff`（邊框 `#e2e8f0`）
- **檸檬黃 (Yellow)**：`#fef9c3`（邊框 `#fef08a`）
- **薄荷綠 (Green)**：`#dcfce7`（邊框 `#bbf7d0`）
- **天際藍 (Blue)**：`#e0f2fe`（邊框 `#bae6fd`）
- **櫻花粉 (Pink)**：`#fce7f3`（邊框 `#fbcfe8`）
- **薰衣草紫 (Purple)**：`#f3e8ff`（邊框 `#e9d5ff`）

### 1.2 釘選置頂功能 (Pin-to-Top)
- **API Action**：`togglePin`
- **邏輯**：點擊卡片右上角 `📌` 圖示，若目前未釘選則設為 `true`，已釘選則設為 `false`。
- **UI 呈現**：釘選卡片帶有金色圖釘徽章、外框呈現立體金色陰影，並立即提升至該欄最頂端。

### 1.3 愛心互動點讚 (Like Counter)
- **API Action**：`toggleLike`
- **邏輯**：
  - 前端樂觀更新：點擊瞬間愛心紅化，數字即刻 +1。
  - 後端原子累加：於專屬工作表鎖定該列，將第 13 欄 `likes` 數值加一並回傳最新計數。
  - 本地狀態防止重複連擊：使用者點擊狀態快取於 `localStorage`。

---

## M05: 刪除防護、管理員控制台與軟刪除回收筒

### 1.1 刪除安全流程
1. 卡片建立時，使用者可自訂專屬「刪除保護密碼」（存於第 7 欄）。
2. 使用者點擊「刪除」垃圾桶圖示時，彈跳確認對話框要求輸入密碼。
3. 後端比對：
   - 若符合建立時設定之密碼 $\rightarrow$ 核准。
   - 若輸入總管理者密碼 (`master_pin`，預設 `8888`) $\rightarrow$ 一律特權核准。
   - 否則回傳錯誤：「密碼不正確，存取遭拒」。

### 1.2 軟刪除與後台回收筒 (Trash Recovery)
- 刪除操作僅將第 10 欄 `is_deleted` 設為 `TRUE`，絕不實體銷毀行資料。
- 總管理員後台具備「檢視回收筒」功能，可調用 `getTrashCards` 讀取所有被刪除之記事。
- 支援 `restorePost` 一鍵將 `is_deleted` 還原為 `FALSE`，無痛復原資料。

---

## M06: Markdown 結構化備份匯出模組

### 1.1 功能目標
提供純前端免連網的一鍵資料匯出功能。點擊「匯出備份 (Markdown)」按鈕，將當前畫面中所有主題與筆記轉換為完整格式的 `.md` 檔案供使用者下載至本機存檔。

### 1.2 格式生成規範
```markdown
# 雲端記事牆備份 - [使用者名稱 / 看板]
> 匯出時間：2026-11-12 12:00:00
> 總主題數：2 | 總記事數：5

---

## 📌 [主題名稱 1] (共 3 則)

### 1. 筆記標題 (📌 已置頂 | ❤️ 5)
- **建立時間**：2026-11-12 10:00:00
- **標籤**：`#生活` `#筆記`
- **圖片**：![附圖](https://lh3.googleusercontent.com/d/xxx)

筆記詳細內容文字...

---
```

---

## M07: 主題欄位動態管理模組

### 1.1 功能目標
- 支援直接點擊主題欄位標題旁的「✏️ 重新命名」，在線更新主題名稱。
- 呼叫後端 `renameTopic` Action，批次將該工作表內所有屬於舊主題的卡片更新為新主題名稱。
- 支援「新增主題欄位」卡片，使用者可預先定義主題分類名稱。
