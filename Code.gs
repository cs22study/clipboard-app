// ==========================================
// 線上筆記資料速記APP - 後端 Google Apps Script
// ==========================================

// ================= 設定區 =================
const SHEET_ID = '16-nOx5xUZlN9Un3orTB-6_Z3V0DhHfMV2ym83Or6jAc'; 
const FOLDER_ID = '15Bo8djCeOuhexWLi-6sjr5uqmfk7IFfN'; 
const SHEET_NAME = '雲端記事牆資料';
// ==========================================

// 【一鍵帳號權限驗證函式】
// ★ 請在 GAS 編輯器上方選擇此函式並點擊「執行」，即可觸發 Google Drive 與 Sheets 授權
function authorizeServices() {
  Logger.log("=== 開始驗證帳號權限 ===");

  // 1. 驗證 Google 試算表存取權限
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("找不到工作表「" + SHEET_NAME + "」");
    Logger.log("✅ 1. Google 試算表連線成功！工作表名稱：" + sheet.getName());
  } catch (err) {
    Logger.log("❌ 1. 試算表連線失敗：" + err.toString());
  }

  // 2. 驗證 Google 雲端硬碟存取權限 (DriveApp)
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log("✅ 2. Google 雲端硬碟連線成功！資料夾名稱：" + folder.getName());
  } catch (err) {
    Logger.log("❌ 2. 雲端硬碟連線失敗：" + err.toString());
  }

  Logger.log("=== 權限驗證完成 ===");
}

// 【讀取資料 (GET)】當前端載入時抓取記事卡片清單
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("找不到名稱為「" + SHEET_NAME + "」的工作表");
    
    const data = sheet.getDataRange().getValues();
    
    // 扣除第一列標題，轉換為 JSON 陣列
    let posts = [];
    for (let i = 1; i < data.length; i++) {
      posts.push({
        id: data[i][0],
        timestamp: data[i][1],
        theme: data[i][2],
        note: data[i][3],
        imageUrl: data[i][4]
      });
    }
    
    // 最新文章排在前面
    posts.reverse();
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: posts }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 【寫入資料 (POST)】接收前端送出的記事與圖片 (Base64)
function doPost(e) {
  let logs = [];
  try {
    logs.push("步驟 1: 收到前端請求");
    const data = JSON.parse(e.postData.contents);
    const base64Data = data.image; 
    const note = data.note || "無文字記事";
    const theme = data.theme || "未分類"; 
    
    let fileUrl = "";
    
    // 1. 處理圖片儲存至 Google Drive
    if (base64Data) {
      logs.push("步驟 2: 開始處理圖片儲存");
      const base64String = base64Data.split(',')[1];
      const blob = Utilities.newBlob(
        Utilities.base64Decode(base64String), 
        'image/png', 
        'post_' + new Date().getTime() + '.png'
      );
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const file = folder.createFile(blob);
      
      // 設定圖片權限為知道連結者皆可檢視
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
      logs.push("步驟 2 完成: 圖片已儲存至雲端硬碟");
    }

    // 2. 寫入 Google 試算表
    logs.push("步驟 3: 準備開啟試算表並寫入");
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("寫入失敗：找不到名稱為「" + SHEET_NAME + "」的工作表");

    const newId = Utilities.getUuid(); 
    const timestamp = new Date().toLocaleString();
    
    sheet.appendRow([newId, timestamp, theme, note, fileUrl]);
    logs.push("步驟 4: 資料列寫入成功！");

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      id: newId,
      debug: logs
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logs.push("❌ 發生錯誤: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.toString(),
      history: logs
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 處理跨網域 CORS 的 OPTIONS 預檢請求
function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.JSON);
}
