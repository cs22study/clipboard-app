# 雲端記事牆 APP (Padlet 模式)

[![GitHub Pages](https://img.shields.io/badge/Deployment-GitHub%20Pages-brightgreen)](https://cs22study.github.io/clipboard-app/)
[![Backend](https://img.shields.io/badge/Backend-Google%20Apps%20Script-blue)](https://script.google.com/)
[![Database](https://img.shields.io/badge/Database-Google%20Sheets-success)](https://docs.google.com/spreadsheets/)
[![Version](https://img.shields.io/badge/Version-v2.4.0-orange)](https://github.com/cs22study/clipboard-app)

> **生產環境線上站台**：[https://cs22study.github.io/clipboard-app/](https://cs22study.github.io/clipboard-app/)  
> **後端 Web App 端點**：`https://script.google.com/macros/s/AKfycbznuGd3oq8QhzY4av8deOdNUS-f9b-r_fDqMPZl0DnXIIOEd4Ca5KlfqPZGlJmsVqM10g/exec`  
> **專案資料庫試算表**：Google 試算表 `雲端記事牆APP_Padlet資料庫` (`1n33bBAwBLvEuikyr0wRgWww8wsK5yYW33hcLYj7-STM`)  
> **截圖照片資料夾**：Google 雲端硬碟 `雲端記事牆資料截圖照片` (`15Bo8djCeOuhexWLi-6sjr5uqmfk7IFfN`)

---

## 🌟 核心特色 (Key Features)

- 📌 **Padlet 貨架瀑布流 (Shelf Columns)**：主題橫向自由擴充滾動、卡片直向自動堆疊排列。
- 📸 **剪貼簿截圖即貼上傳**：支援電腦截圖 `Ctrl + V` 秒貼，直傳 Google 雲端硬碟並自動生成全球 CDN 預覽。
- 👥 **多租戶個人獨立空間**：自訂帳號登入與一鍵註冊，自動在試算表開闢 `Cards_{帳號}` 專屬分頁，資料 100% 物理隔離。
- 🌐 **雙首頁無縫切換**：頂部導覽列提供 `🌐 公用首頁` 與 `👤 個人首頁`，隨時切換檢視並保留登入憑證。
- 🎨 **6 色便條紙與圖釘置頂**：白、黃、綠、藍、粉、紫 6 種主題底色，支援 `📌` 一鍵置頂與自訂序號調整。
- 🛡️ **安全軟刪除與後台回收筒**：個人刪除保護 PIN + 管理者萬用 PIN；已刪除筆記存於軟刪除池，後台支援一鍵復原。
- 📥 **純前端一鍵 Markdown 備份**：隨時一鍵打包當前記事牆內容為標準 Markdown 檔案下載。
- 📱 **PWA 漸進式網頁應用**：支援手機與桌面「新增至主畫面」離線安裝。

---

## 🛡️ 系統開發 5 大原則 (System Principles)

1. **自主撰寫與測試**：所有程式碼與測試腳本自主撰寫並通過本機與線上端對端測試驗證。
2. **零資安風險**：動態輸出強制 `escapeHtml` 杜絕 XSS，白名單嚴格鎖定指定試算表與硬碟目錄。
3. **隨時可復原**：刪除操作採軟刪除機制，Git 與 clasp 部署版本雙軌版控。
4. **零花費運作**：100% 依託 GitHub Pages、Google Apps Script、Google Sheets 與 Google Drive 免費服務。
5. **節省 Token**：落實 Hub-and-Spoke 模組化文檔體系，支援新 Session 零摸索接棒。

---

## 📚 專案文檔體系 (Hub-and-Spoke Documentation)

詳細開發與維運文檔位於 [`docs/`](file:///d:/志松資料/GAS程式AI運用小松資料區cs22study/線上筆記資料速記APP/docs) 目錄：

- [`00_MASTER_INDEX.md`](docs/00_MASTER_INDEX.md)：中央樞紐文件與新 Session 接棒指令模板。
- [`01_ARCHITECTURE_BLUEPRINT.md`](docs/01_ARCHITECTURE_BLUEPRINT.md)：系統架構藍圖、資料流圖與分頁隔離模型。
- [`02_HANDOVER_CONTEXT.md`](docs/02_HANDOVER_CONTEXT.md)：**跨 Session 交接文件（最新系統狀態、驗證帳號清單與避坑指南）**。
- [`03_ROADMAP.md`](docs/03_ROADMAP.md)：產品發展路線圖 (Phase 1 ~ Phase 5)。
- [`04_MODULE_SPECS.md`](docs/04_MODULE_SPECS.md)：各模組詳細架構設計規格書。
- [`05_TODO_LIST.md`](docs/05_TODO_LIST.md)：待開發與待辦事項清單。
- [`06_API_DICTIONARY.md`](docs/06_API_DICTIONARY.md)：後端 POST API 與試算表資料庫字典。
- [`07_RECOVERY_RUNBOOK.md`](docs/07_RECOVERY_RUNBOOK.md)：災難復原、緊急回滾 SOP 與 Hotfix 維運履歷。

---

## 🚀 本地開發與發布 SOP

### 1. 後端 GAS 部署 (clasp)
```powershell
# 推送後端程式碼至 Google Apps Script
clasp push -f

# 覆蓋部署至生產環境版本 (保持 Web App 網址不變)
clasp deploy -i "AKfycbznuGd3oq8QhzY4av8deOdNUS-f9b-r_fDqMPZl0DnXIIOEd4Ca5KlfqPZGlJmsVqM10g" -d "Production update"
```

### 2. 前端部署 (GitHub Pages)
```powershell
& "C:\Program Files\Git\cmd\git.exe" add .
& "C:\Program Files\Git\cmd\git.exe" commit -m "feat: 更新前端功能"
& "C:\Program Files\Git\cmd\git.exe" push origin main
```
