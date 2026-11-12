# 災難復原與維運手冊 (Recovery & Operations Runbook)

> **版本**：v2.1.0  
> **核心準則**：隨時可復原 (High Recoverability) & 零花費 (Zero Cost)  
> **適用情境**：部署失誤、雲端權限異常、資料庫誤刪、非預期錯誤或系統維護時之標準作業程序 (SOP)。

---

## 1. Google Apps Script 程式版本秒級回滾 SOP

若在某次 `clasp push` 或程式碼修改後，線上 Web App 出現嚴重錯誤，可依循以下兩種方式進行回滾：

### 1.1 方式 A：透過 Clasp 部署快照回滾
1. 列出所有雲端歷史版本部署：
   ```powershell
   clasp deployments
   ```
2. 將線上主要 Deployment ID 指向先前穩定的 Version 快照（例如 Version 5）：
   ```powershell
   clasp deploy -i "AKfycbznuGd3oq8QhzY4av8deOdNUS-f9b-r_fDqMPZl0DnXIIOEd4Ca5KlfqPZGlJmsVqM10g" -V 5 -d "Emergency Rollback to Version 5"
   ```

### 1.2 方式 B：透過 Git 歷史版本回滾並覆蓋部署
1. 本機切換回前一個正常運作的 Git Commit：
   ```powershell
   & "C:\Program Files\Git\cmd\git.exe" checkout <commit_hash> -- Code.gs
   ```
2. 強制推送並重新部署：
   ```powershell
   clasp push -f
   clasp deploy -i "AKfycbznuGd3oq8QhzY4av8deOdNUS-f9b-r_fDqMPZl0DnXIIOEd4Ca5KlfqPZGlJmsVqM10g" -d "Hotfix Rollback"
   ```

---

## 2. GitHub Pages 前端版本回滾 SOP

若前端介面（`index.html`）發生語法錯誤或白屏：
1. 查詢最新 Commit 紀錄：
   ```powershell
   & "C:\Program Files\Git\cmd\git.exe" log --oneline -n 5
   ```
2. 重設本機程式碼至穩定 Commit：
   ```powershell
   & "C:\Program Files\Git\cmd\git.exe" revert HEAD --no-edit
   & "C:\Program Files\Git\cmd\git.exe" push origin main
   ```
3. GitHub Pages 將在 60 秒內自動重新編譯並上線。

---

## 3. 資料庫試算表災難復原 SOP

### 3.1 誤刪單一筆記資料（日常軟刪除救援）
- **操作者**：總管理者
- **處置程序**：
  1. 於網頁首頁右上角點擊「⚙️ 系統管理」按鈕。
  2. 輸入目前管理密碼（預設 `8888`）。
  3. 點選「🗑️ 回收筒管理」，系統將透過 `getTrashCards` 列出所有被標記為 `is_deleted = TRUE` 之項目。
  4. 找到該筆記事，點擊「還原」，系統自動將該列 `is_deleted` 還原為 `FALSE`，記事即刻重新展示於看板。

### 3.2 使用者分頁整頁遭意外刪除（自動自我修復）
- **處置程序**：
  - 系統後端之 `resolveSheetForUser(username)` 具備**容錯防呆與自我癒合 (Self-Healing)** 機制。
  - 當使用者再次造訪或發送請求時，後端若發現該使用者工作表不存在，會自動重建該分頁並補上標準 13 欄表頭，系統不會拋出崩潰錯誤。

### 3.3 整份試算表資料被大量破壞或篡改
- **處置程序**：
  1. 開啟 Google 試算表 `雲端記事牆APP_Padlet資料庫`。
  2. 點選頂部功能表：**「檔案」 > 「版本歷程記錄」 > 「查看版本歷程記錄」**。
  3. 選擇事發前一刻的時間點快照，點選「還原這個版本」。
  4. 由於所有卡片 ID 皆為唯一時間戳，還原後無需任何程式更動即可正常運轉。

---

## 4. Google Drive 存取權限與圖片異常排查 (Troubleshooting)

### 4.1 出現「存取遭拒：DriveApp」錯誤訊息
- **根本原因**：
  - Google Apps Script 執行環境中呼叫了 `file.setSharing(...)`，而該檔案處於受限或繼承設定特殊的資料夾中。
- **標準解法**：
  - 請檢查 `Code.gs`，確保已採用 `try { file.setSharing(...) } catch(e) {}` 進行防禦性包裹。
  - 直接至 Google 雲端硬碟，對「雲端記事牆資料截圖照片」資料夾點選右鍵 > **「共用」 > 設定為「知道連結的使用者都可以檢視」**，讓所有新寫入的截圖照片自然繼承共用權限。

### 4.2 圖片無法在網頁中載入 (Broken Image)
- **排查指標**：
  - 檢視試算表 `img_url` 欄位是否為全球 CDN 直連格式：`https://lh3.googleusercontent.com/d/{fileId}`。
  - 避免使用 `drive.google.com/file/d/.../view` 或 `drive.google.com/uc?id=...`，後者受限於 Google 頻寬防盜鏈阻擋。

---

## 5. 零花費維運監控與配額保護 (Zero-Cost SLA Guard)

本專案運行於 Google Workspace 與 GitHub 免費額度內，無任何衍生費用。為避免觸發免費服務配額限制，日常維運需注意：

| 服務項目 | 免費配額上限 | 本專案安全設計與當前水位 |
| :--- | :--- | :--- |
| **GAS 單次執行時間** | 6 分鐘 / 次 | 系統單次寫入僅耗時約 0.8 ~ 1.5 秒，遠低於上限 |
| **GAS 每日觸發次數** | 20,000 次 / 日 | 充足支援日常與中小型團隊筆記速記 |
| **Google Drive 儲存容量** | 15 GB (個人免費版) | 每張壓縮截圖約 300KB ~ 600KB，可儲存超過 25,000 張圖 |
| **Google 試算表儲存上限** | 10,000,000 個儲存格 | 目前使用量約數百格，耗用率 < 0.01% |
| **GitHub Pages 流量** | 100 GB / 月 | 僅承載靜態 HTML/CSS，單月耗用通常 < 500 MB |
