# 雲端記事牆 APP (Padlet 模式) - 專案文件總覽與 Hub 樞紐中心

> **架構模式**：Hub-and-Spoke 模組化開發架構  
> **核心目標**：節省 Token、零花費、極致資安、隨時可復原、自主開發與測試  
> **線上版網址**：https://cs22study.github.io/clipboard-app/  
> **GitHub 倉庫**：https://github.com/cs22study/clipboard-app  

---

## 🧭 五大系統開發原則 (Golden Principles)

所有參與本專案開發之 AI Agent 與開發者必須嚴格遵守以下五大原則：

1. **自主撰寫與測試 (Autonomous Implementation & Verification)**：
   - 所有程式碼（前端 HTML/JS/CSS 與後端 GAS/Node.js）皆由 AI 自主撰寫、自建測試腳本並於本機與雲端完成端對端測試驗證後才可交付。
2. **零資安風險與防資料外洩 (Zero-Vulnerability & Anti-Leakage)**：
   - 徹底杜絕 XSS（跨站腳本攻擊）：前端所有動態文字渲染強制經過 `escapeHtml` 處理。
   - 權限白名單鎖定（Hard Scoping）：後端程式嚴格限定於指定試算表 ID 與指定資料夾 ID，禁止任何跨目錄漫遊。
   - 敏感密碼不落地：管理密碼與個人刪除 PIN 全程於 Google Apps Script 雲端伺服器端比對，前端不保留明文密碼。
3. **隨時可復原 (High Recoverability & Zero Data Loss)**：
   - 刪除操作預設採用軟刪除（`is_deleted = TRUE`），配合總後台回收筒一鍵復原。
   - 程式碼版控以 Git Commit 與 clasp 部署版本（Deployment Versioning）雙軌綁定，隨時可瞬時回滾。
4. **零花費 (100% Free Tier Architecture)**：
   - 核心設施採用 GitHub Pages（靜態前端）+ Google Apps Script（無伺服器後端）+ Google 試算表（資料庫）+ Google Drive（多媒體儲存），所有串接服務嚴格以永久免費為原則。
5. **節省 Token (Hub-and-Spoke Modular Efficiency)**：
   - 之後新模組開發均**另開對話視窗 (Fresh Session)**，僅需載入交接摘要與單一模組規格，避免長上下文消耗大量 Token。
   - 每個模組開發完成後，負責將變更回寫入 `docs/` 相對應文件，維持 Hub 樞紐資訊同步。

---

## 📚 專案完整文件索引 (Hub-and-Spoke Documents)

| 文件編號 | 文件名稱 | 檔案路徑 | 用途與說明 |
| :--- | :--- | :--- | :--- |
| **00** | **中央樞紐與新開 Session 開場白** | [`docs/00_MASTER_INDEX.md`](file:///d:/志松資料/GAS程式AI運用小松資料區cs22study/線上筆記資料速記APP/docs/00_MASTER_INDEX.md) | 本文件。定義整體規則、開場白模板、專案端點清冊 |
| **01** | **系統架構藍圖規格書** | [`docs/01_ARCHITECTURE_BLUEPRINT.md`](file:///d:/志松資料/GAS程式AI運用小松資料區cs22study/線上筆記資料速記APP/docs/01_ARCHITECTURE_BLUEPRINT.md) | 系統整體架構、多使用者分頁隔離模型、資料流圖 |
| **02** | **跨 Session 交接文件** | [`docs/02_HANDOVER_CONTEXT.md`](file:///d:/志松資料/GAS程式AI運用小松資料區cs22study/線上筆記資料速記APP/docs/02_HANDOVER_CONTEXT.md) | 即時環境狀態、clasp/Git 快速對齊、帳號切換指引 |
| **03** | **產品發展路線圖 (Roadmap)** | [`docs/03_ROADMAP.md`](file:///d:/志松資料/GAS程式AI運用小松資料區cs22study/線上筆記資料速記APP/docs/03_ROADMAP.md) | 開發里程碑 (Phase 1~5)、已完成與規劃中階段 |
| **04** | **各模組開發細節規格書** | [`docs/04_MODULE_SPECS.md`](file:///d:/志松資料/GAS程式AI運用小松資料區cs22study/線上筆記資料速記APP/docs/04_MODULE_SPECS.md) | 認證分頁隔離、瀑布引擎、底色置頂、點讚、備份規格 |
| **05** | **待辦事項清單 (Todo List)** | [`docs/05_TODO_LIST.md`](file:///d:/志松資料/GAS程式AI運用小松資料區cs22study/線上筆記資料速記APP/docs/05_TODO_LIST.md) | 依優先級排序之待開發功能、衝刺規劃 |
| **06** | **API 協定與資料庫欄位字典** | [`docs/06_API_DICTIONARY.md`](file:///d:/志松資料/GAS程式AI運用小松資料區cs22study/線上筆記資料速記APP/docs/06_API_DICTIONARY.md) | 試算表 13 大欄位定義、所有 POST Action 規格 |
| **07** | **災難復原與維運手冊** | [`docs/07_RECOVERY_RUNBOOK.md`](file:///d:/志松資料/GAS程式AI運用小松資料區cs22study/線上筆記資料速記APP/docs/07_RECOVERY_RUNBOOK.md) | 版本回滾 SOP、誤刪救回、權限修復、零成本維運 |

---

## 🚀 新開 Session 專用開場白 (Session Kickoff Prompts)

未來若需開啟新對話視窗進行**新模組開發**或**線上維運修復 BUG**，請根據任務性質複製以下對應的開場白貼給 AI 助手，AI 將立即載入精準上下文接續作業，節省超過 90% 的 Token！

---

### 模板 A：新功能模組開發 (Feature Development Session)

```markdown
【雲端記事牆 APP - 功能開發接續指令】

你好，我是專案負責人。本專案為「雲端記事牆 APP (Padlet 模式)」，採用 Hub-and-Spoke 架構開發。
本地專案路徑：d:\志松資料\GAS程式AI運用小松資料區cs22study\線上筆記資料速記APP
GitHub Repo: https://github.com/cs22study/clipboard-app

請嚴格遵守本專案的 5 大系統開發原則：
1. 所有程式碼皆由你自行撰寫並執行完整自動化測試驗證。
2. 避免任何資料外洩與資安風險 (防止 XSS、敏感密碼雲端比對、白名單鎖定 ID)。
3. 隨時可復原 (採用軟刪除機制、Git 與 clasp 雙向版控)。
4. 零花費 (僅使用 GitHub Pages + Google Apps Script + Google Sheets + Google Drive 免費服務)。
5. 節省 Token (本對話視窗專注於指定模組開發，完成後必須回寫 docs/ 相關文件)。

【接續上下文】
- 最新 Web App 端點：https://script.google.com/macros/s/AKfycbznuGd3oq8QhzY4av8deOdNUS-f9b-r_fDqMPZl0DnXIIOEd4Ca5KlfqPZGlJmsVqM10g/exec
- Google 試算表 ID：1n33bBAwBLvEuikyr0wRgWww8wsK5yYW33hcLYj7-STM
- 截圖資料夾 ID：15Bo8djCeOuhexWLi-6sjr5uqmfk7IFfN (雲端記事牆資料截圖照片)
- 主資料夾 ID：14LNISHVvM8h5oaVx4bKbTgnNcRqeQcmW (線上筆記資料速記APP)
- 已具備本機 clasp CLI 環境 (Node.js LTS v26.13.1 + clasp v3.4.1)

請先讀取 `docs/00_MASTER_INDEX.md` 與 `docs/05_TODO_LIST.md`，並告訴我目前待辦任務中最優先的模組是什麼，待我確認後即可開始實作！
```

---

### 模板 B：線上維運與修 BUG (Bug-Fix & Maintenance Session)

```markdown
【雲端記事牆 APP - 線上維運與修 BUG 指令】

你好，我是專案負責人。本專案為「雲端記事牆 APP (Padlet 模式)」，目前在線上運作中發現異常或 BUG，需要進行緊急維運修復。
本地專案路徑：d:\志松資料\GAS程式AI運用小松資料區cs22study\線上筆記資料速記APP
GitHub Repo: https://github.com/cs22study/clipboard-app

請嚴格遵守本專案的 5 大系統開發原則：
1. 所有修復程式碼皆由你自行分析、撰寫並執行完整回歸測試，嚴禁破壞既有功能。
2. 避免任何資料外洩與資安風險 (嚴格確保 XSS 防護與權限白名單鎖定)。
3. 隨時可復原 (修復前確認可秒級回滾，使用 clasp 與 Git 雙軌版控)。
4. 零花費 (維持 100% 免費配額運作)。
5. 節省 Token (專注於定位並解決通報之 BUG，完成後回寫 docs/07_RECOVERY_RUNBOOK.md 與相關文件)。

【系統當前環境】
- 最新 Web App 端點：https://script.google.com/macros/s/AKfycbznuGd3oq8QhzY4av8deOdNUS-f9b-r_fDqMPZl0DnXIIOEd4Ca5KlfqPZGlJmsVqM10g/exec
- Google 試算表 ID：1n33bBAwBLvEuikyr0wRgWww8wsK5yYW33hcLYj7-STM
- 截圖資料夾 ID：15Bo8djCeOuhexWLi-6sjr5uqmfk7IFfN (雲端記事牆資料截圖照片)
- 主資料夾 ID：14LNISHVvM8h5oaVx4bKbTgnNcRqeQcmW (線上筆記資料速記APP)
- 已配置本機 clasp CLI 環境 (Node.js LTS v26.13.1 + clasp v3.4.1)

【通報問題描述】
（請在此具體描述發生的錯誤現象、觸發情境、錯誤訊息截圖或文字、涉及的帳號或分頁）

請參考 `docs/07_RECOVERY_RUNBOOK.md` 之維運 SOP，分析根因並提出最小衝擊的修復方案，待我確認後進行熱修復 (Hotfix) 與驗證！
```

---

## 🔄 模組開發完成時的「回寫規則 (Write-back Protocol)」

在任何新對話視窗完成特定模組的開發與驗證後，AI 助手必須依序執行以下 4 項回寫動作：

1. **更新 `docs/04_MODULE_SPECS.md`**：記錄新模組的實作邏輯、新增之 API action 與參數。
2. **更新 `docs/05_TODO_LIST.md`**：將已完成任務勾選 `[x]`，並補上下一步衍生事項。
3. **更新 `docs/06_API_DICTIONARY.md`**：若有新增試算表欄位或 API 動作，同步補齊定義。
4. **雙向推送同步**：
   - 透過 `clasp push -f` 與 `clasp deploy -i ...` 更新雲端 Apps Script。
   - 透過 `git add .`、`git commit` 與 `git push origin main` 同步更新 GitHub 儲存庫。
