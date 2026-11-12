# 跨 Session 交接文件 (Handover Context)

> **建立時間**：2026-11-12  
> **最新交接更新**：2026-11-12 16:16 (Hotfix #01 ~ #06 線上維運完成全數驗證通過)  
> **當前系統版本**：v2.4.0 (PWA 快取：`padlet-wall-app-v2.4`，Git Commit：`8d82c60`)  
> **適用場景**：新開對話視窗 (Fresh Session) 啟動、換機交接、切換 Google 帳號或維運交棒時閱讀。  
> **核心目標**：3 分鐘內完整對齊技術環境狀態，免除摸索與上下文重新理解成本。

---

## 1. 現行專案端點清冊 (Active Endpoints & IDs)

| 資源項目 | 名稱 / 識別碼 | 連結 / 實體路徑 |
| :--- | :--- | :--- |
| **本地專案目錄** | 線上筆記資料速記APP | `D:\志松資料\GAS程式AI運用小松資料區cs22study\線上筆記資料速記APP` |
| **GitHub 儲存庫** | `cs22study/clipboard-app` | https://github.com/cs22study/clipboard-app |
| **正式生產站 (Pages)**| 雲端記事牆 APP (Padlet) | https://cs22study.github.io/clipboard-app/ |
| **後端 GAS Web App** | 線上筆記資料速記APP (API) | `https://script.google.com/macros/s/AKfycbznuGd3oq8QhzY4av8deOdNUS-f9b-r_fDqMPZl0DnXIIOEd4Ca5KlfqPZGlJmsVqM10g/exec` |
| **GAS 專案 ID** | Script ID | `1zmlLmbBDvjjds0KKQXogsL0VxL52Jjprj6dTBQzuZ1SCXMl5vikyDbZf` |
| **目前生產部署版本** | Deployment ID (Version @6) | `AKfycbznuGd3oq8QhzY4av8deOdNUS-f9b-r_fDqMPZl0DnXIIOEd4Ca5KlfqPZGlJmsVqM10g` |
| **主專案雲端資料夾** | 線上筆記資料速記APP | ID: `14LNISHVvM8h5oaVx4bKbTgnNcRqeQcmW` |
| **截圖照片專用資料夾** | 雲端記事牆資料截圖照片 | ID: `15Bo8djCeOuhexWLi-6sjr5uqmfk7IFfN` |
| **資料庫 Google 試算表**| 雲端記事牆APP_Padlet資料庫 | ID: `1n33bBAwBLvEuikyr0wRgWww8wsK5yYW33hcLYj7-STM` |

---

## 2. 本機開發環境配置狀態 (Local Dev Environment)

- **作業系統**：Windows 11 (PowerShell 7 / Windows PowerShell 5.1)
- **Node.js 版本**：Node.js LTS `v26.13.1` (位於 `C:\Program Files\nodejs\node.exe`)
- **Clasp 版本**：`@google/clasp` `v3.4.1` (位於 `C:\Users\user\AppData\Roaming\npm\clasp.cmd`)
- **Git 工具**：Git for Windows (`C:\Program Files\Git\cmd\git.exe`)
- **已綁定 Google 帳號**：`cs22study@gmail.com` (Clasp 認證權限位於 `C:\Users\user\.clasprc.json`)
> **💡 Windows PowerShell 執行 Clasp 提示**：  
> 若因 ExecutionPolicy 限制或 PATH 未載入，請於命令前設置：  
> `$env:PATH = "C:\Program Files\nodejs;C:\Users\user\AppData\Roaming\npm;$env:PATH"` 並執行 `& "C:\Users\user\AppData\Roaming\npm\clasp.cmd"`。

---

## 3. 切換環境與更換帳號指引 (Account / Environment Switching)

### 3.1 切換 Google 帳號
若未來需要將後端部署轉移至另一個 Google 帳號：
1. 清除舊有 clasp 授權憑證：
   ```powershell
   clasp logout
   ```
2. 重新授權新帳號（支援瀏覽器登入）：
   ```powershell
   clasp login
   ```
3. 確認 `.clasp.json` 中的 `scriptId` 是否正確對應新帳號下的 Apps Script 專案。

### 3.2 建立全新試算表或更換試算表 ID
1. 至 Google Drive 新建試算表，命名為 `雲端記事牆APP_Padlet資料庫`。
2. 開啟 `Code.gs`，修改頂部設定常數：
   ```javascript
   const SPREADSHEET_ID = "您的新試算表ID";
   ```
3. 執行後端發布流程（見第 4 節），後端首次執行時會自動初始化 `Users_Registry`、`Admin_Settings` 與 `Padlet_Cards` 分頁並填入表頭。

---

## 4. 標準開發與發布 SOP (Deployment Runbook)

當在本地修改完成程式碼後，遵循以下固定 SOP 發布更新：

### 4.1 後端更新 (Code.gs / appsscript.json)
```powershell
# 1. 進入專案目錄
cd "D:\志松資料\GAS程式AI運用小松資料區cs22study\線上筆記資料速記APP"

# 2. 推送程式碼至 Google 雲端 Apps Script
clasp push -f

# 3. 更新現有生產部署 (覆蓋 Deployment @6，保持網址不變！)
clasp deploy -i "AKfycbznuGd3oq8QhzY4av8deOdNUS-f9b-r_fDqMPZl0DnXIIOEd4Ca5KlfqPZGlJmsVqM10g" -d "Update via clasp"
```

### 4.2 前端更新 (index.html / manifest.json / sw.js)
```powershell
# 1. 加入變更並提交 Git
& "C:\Program Files\Git\cmd\git.exe" add .
& "C:\Program Files\Git\cmd\git.exe" commit -m "feat: 更新前端介面與功能模組"

# 2. 推送至 GitHub main 分支 (觸發 GitHub Pages 自動構建發布)
& "C:\Program Files\Git\cmd\git.exe" push origin main
```

---

## 5. 目前已驗證帳號與預設憑據

- **系統總管理者 (Master Admin)**：
  - 帳號：`admin`
  - 預設管理密碼 (Master PIN)：`8888`
  - 存放位置：`Admin_Settings` 試算表 `master_pin` 鍵值，可於後台直接更改。
- **測試使用者 (Demo User)**：
  - 帳號：`user_xiesong`，密碼：`1234`，專屬工作表：`Cards_user_xiesong`
  - 帳號：`song001`，專屬工作表：`Cards_song001`
  - 帳號：`song002`，專屬工作表：`Cards_song002`
- **訪客模式 (Guest)**：
  - 未登入或檢視公用牆時操作的工作表：`Padlet_Cards` (公開牆)

---

## 6. 重要避坑指南與資安維護記錄

1. **DriveApp 權限限制 (Access Denied)**：
   - ⚠️ **切勿** 在 GAS 程式中對個別檔案呼叫 `file.setSharing(...)`，因為在以 Web App 身分執行且資料夾權限複雜時會引發 `Exception: 存取遭拒：DriveApp`。
   - **正確做法**：讓上傳之圖片自然繼承「雲端記事牆資料截圖照片」資料夾之共享權限，並透過全球 CDN 網址格式 `https://lh3.googleusercontent.com/d/{fileId}` 進行跨域讀取。
2. **多租戶表格自動修復**：
   - `resolveSheetForUser(username)` 內部內建自我修復邏輯。若使用者分頁意外被刪除，後端在下一次請求時會自動以預設 13 欄規格重建該分頁，不會造成系統崩潰。
3. **瀏覽器密碼管理器自動誤填 (Autofill Heuristic 防禦)**：
   - Chromium / Safari 等密碼管理器會自動搜尋首個文字輸入欄位並注入帳號密碼。本專案採「頂端隱形誘餌欄位」+「搜尋框 readonly 聚焦解除」+「定時/渲染前防禦檢查」三重防護，杜絕搜尋列污染。
4. **雙首頁切換與 Session 保留**：
   - 使用者登入後，頂部提供 `🌐 公用首頁` 與 `👤 個人首頁` 雙切換按鈕。切換至公用首頁時不得清空 `localStorage['padlet_user_session']`，僅有明確點選「🚪 登出帳號」時才進行憑證註銷。

---

## 7. 線上維運與 Hotfix 處置總結 (Hotfix #01 ~ #06)

| 序號 | 類別 | 現象與問題描述 | 根因與處置方針 | 狀態 |
| :---: | :---: | :--- | :--- | :---: |
| **01** | 後端權限 | 新增附圖筆記時後端拋出 `存取遭拒：DriveApp` | `file.setSharing` 於特定目錄被阻擋；改用 CDN 網址繼承資料夾權限 | ✅ 已結案 (`2ec4829`) |
| **02** | 工具鏈 | 本機執行 clasp 命令被 ExecutionPolicy 阻擋 | PowerShell 限制執行 `.ps1` 腳本；改採 `clasp.cmd` 直接執行 | ✅ 已結案 (`c66b9ef`) |
| **03** | 前端過濾 | 新使用者新增主題後畫面未即時顯示、看板空白 | 帳號被自動填入搜尋框過濾所有內容；隔離欄位並建置使用者隔離快取 | ✅ 已結案 (`4355276`) |
| **04** | 快取同步 | 試算表刪除資料後主題仍殘留、訪客無法返回首頁 | 舊版 localStorage 快取殘留；移除殭屍快取並新增一鍵回首頁機制 | ✅ 已結案 (`d6213de`) |
| **05** | 註冊介面 | 多使用者彈窗切換至註冊新空間時表單空白無法填寫 | form ID 變更後與 tab 切換 ID 不一致拋出 TypeError；補齊容錯對齊 | ✅ 已結案 (`42f05d1`) |
| **06** | 導覽防禦 | 畫面偶發跳至新增主題且卡住；登入後按首頁跳回公用牆強制登出 | 密碼管理器填入帳號致看板過濾為 0 僅留新增主題框；改採雙首頁無縫切換機制與搜尋空結果引導 | ✅ 已結案 (`8d82c60`) |

---

## 8. 下一階段功能開發交接指引 (Next Session Kickoff)

接棒的 AI 助手或開發人員可直接自 `docs/05_TODO_LIST.md` 中的 **Phase 4** 優先項目開展：
1. **HTML5 拖曳排序模組 (Drag & Drop Engine)**：同欄位上下排序與跨欄位主題轉移。
2. **前端 Canvas WebP 圖片智慧壓縮**：於客戶端直接將貼上或選取之大圖壓縮為 WebP，節省 Drive 儲存空間。
3. **即時模糊搜尋與標籤點擊快篩**：高亮文字匹配與 `#tag` 標籤點擊直達。
