// =============================================================================
// 雲端記事牆 APP (Padlet 模式) - Google Apps Script (GAS) 後端核心程式
// =============================================================================

// ======================== 【重要設定區】 ========================
// 1. 指定存放上傳圖片的 Google Drive 資料夾 ID
const FOLDER_ID = '15Bo8djCeOuhexWLi-6sjr5uqmfk7IFfN';

// 2. 指定 Google 試算表 ID
// 提示：若已執行下方 setupNewDatabase() 自動建立新檔案，請將日誌中產生的全新 SHEET_ID 填入此處
let SHEET_ID = 'YOUR_NEW_SPREADSHEET_ID';

// 3. 工作表名稱
const SHEET_NAME = 'Padlet_Cards';

// 4. 全域管理者刪除密碼 (Master PIN)
// 任何卡片若忘記自訂密碼，輸入此密碼皆可授權強制刪除
const MASTER_PIN = '8888';
// ================================================================


// =============================================================================
// 🛠️ 輔助函式：自動建立全新試算表資料庫 (一鍵初始化)
// =============================================================================
/**
 * 請在 GAS 編輯器選取 setupNewDatabase 函式並點擊「執行」：
 * 1. 自動在指定資料夾內建立乾淨獨立的試算表
 * 2. 自動建立 Padlet_Cards 工作表及 10 個標準欄位
 * 3. 在下方執行記錄中印出全新的 SHEET_ID，直接複製填入上方設定區即可
 */
function setupNewDatabase() {
  Logger.log("=== 開始在指定資料夾中建立全新試算表資料庫 ===");
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log("✅ 成功存取 Google Drive 資料夾：" + folder.getName());

    // 建立新試算表
    const ss = SpreadsheetApp.create("雲端記事牆APP_Padlet資料庫");
    const file = DriveApp.getFileById(ss.getId());
    
    // 將檔案移入指定資料夾
    file.moveTo(folder);

    // 設定工作表
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.getActiveSheet();
      sheet.setName(SHEET_NAME);
    }

    // 寫入 10 個標準欄位標題
    const headers = [
      "id",           // A: 卡片唯一識別碼 (UUID)
      "topic",        // B: 所屬主題欄位 (Topic/Column)
      "order_index",  // C: 排序權重 (序號，由小到大排列)
      "title",        // D: 卡片標題
      "content",      // E: 筆記主要文字內容
      "image_url",    // F: 雲端硬碟圖片檢視網址
      "delete_pin",   // G: 刪除保護密碼
      "created_at",   // H: 建立時間
      "updated_at",   // I: 最後修改時間
      "is_deleted"    // J: 軟刪除旗標 (TRUE / FALSE)
    ];

    sheet.clear();
    sheet.appendRow(headers);

    // 美化標題列
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4CAF50");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    Logger.log("=================================================");
    Logger.log("🎉 全新試算表資料庫建立成功！");
    Logger.log("👉 試算表名稱：" + ss.getName());
    Logger.log("👉 試算表 ID：" + ss.getId());
    Logger.log("👉 試算表網址：" + ss.getUrl());
    Logger.log("★ 請將上述「試算表 ID」複製並貼入上方 SHEET_ID 變數中，然後發布部署！");
    Logger.log("=================================================");

  } catch (err) {
    Logger.log("❌ 建立失敗：" + err.toString());
  }
}


// =============================================================================
// 🌐 跨網域 CORS 預檢處理
// =============================================================================
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}


// =============================================================================
// 📥 讀取資料 (GET)：回傳所有有效卡片與主題清單
// =============================================================================
function doGet(e) {
  try {
    const data = getActiveCards();
    return jsonResponse({
      status: "success",
      topics: data.topics,
      cards: data.cards
    });
  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}


// =============================================================================
// 📤 操作請求 (POST)：新增、編輯、刪除(需密碼)、自訂排序位移
// =============================================================================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("無效的請求資料");
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    switch (action) {
      case "getBoardData":
        return jsonResponse({
          status: "success",
          ...getActiveCards()
        });

      case "createPost":
        return handleCreatePost(payload);

      case "updatePost":
        return handleUpdatePost(payload);

      case "deletePost":
        return handleDeletePost(payload);

      case "swapOrder":
        return handleSwapOrder(payload);

      case "setOrderIndex":
        return handleSetOrderIndex(payload);

      default:
        throw new Error("未知的操作指令：" + action);
    }

  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}


// =============================================================================
// 📋 資料庫核心操作模組
// =============================================================================

// 取得試算表物件
function getTargetSheet() {
  if (!SHEET_ID || SHEET_ID === 'YOUR_NEW_SPREADSHEET_ID') {
    throw new Error("尚未設定有效的 SHEET_ID！請先執行 setupNewDatabase 函式產生並填入。");
  }
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error("找不到名為「" + SHEET_NAME + "」的工作表");
  }
  return sheet;
}

// 取得所有未被軟刪除的卡片
function getActiveCards() {
  const sheet = getTargetSheet();
  const rows = sheet.getDataRange().getValues();

  let cards = [];
  let topicSet = new Set();

  // 從第二列開始（第一列為欄位標題）
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const isDeleted = String(row[9]).toUpperCase() === 'TRUE';
    if (!isDeleted) {
      const topic = String(row[1] || "未分類").trim();
      topicSet.add(topic);

      cards.push({
        rowIndex: i + 1, // 試算表實體列號
        id: String(row[0]),
        topic: topic,
        orderIndex: Number(row[2]) || 0,
        title: String(row[3] || ""),
        content: String(row[4] || ""),
        imageUrl: String(row[5] || ""),
        hasPin: Boolean(row[6]), // 僅回傳是否有設定密碼，不洩漏密碼內容
        createdAt: row[7] ? formatDateTime(row[7]) : "",
        updatedAt: row[8] ? formatDateTime(row[8]) : ""
      });
    }
  }

  // 排序：先按主題排序，同一主題內按 orderIndex 升冪排列 (1, 2, 3...)
  cards.sort((a, b) => {
    if (a.topic !== b.topic) {
      return a.topic.localeCompare(b.topic, "zh-Hant");
    }
    return a.orderIndex - b.orderIndex;
  });

  return {
    topics: Array.from(topicSet),
    cards: cards
  };
}

// 1. 新增卡片
function handleCreatePost(data) {
  const sheet = getTargetSheet();
  const topic = String(data.topic || "未分類").trim();
  const title = String(data.title || "").trim();
  const content = String(data.content || "").trim();
  const pin = String(data.pin || "").trim();
  const base64Image = data.image;

  if (!content && !base64Image) {
    throw new Error("請至少輸入記事內容或附帶圖片！");
  }

  // 處理圖片上傳
  let fileUrl = "";
  if (base64Image && base64Image.indexOf("data:image") !== -1) {
    fileUrl = saveBase64ImageToDrive(base64Image);
  }

  // 計算該主題下的下一個序號 (最大序號 + 1)
  const existingCards = getActiveCards().cards.filter(c => c.topic === topic);
  const nextOrderIndex = existingCards.length > 0 
    ? Math.max(...existingCards.map(c => c.orderIndex)) + 1 
    : 1;

  const newId = Utilities.getUuid();
  const now = new Date();

  // 寫入新資料列
  sheet.appendRow([
    newId,
    topic,
    nextOrderIndex,
    title,
    content,
    fileUrl,
    pin,
    now,
    now,
    false // is_deleted = false
  ]);

  return jsonResponse({
    status: "success",
    message: "新增成功",
    cardId: newId
  });
}

// 2. 編輯卡片內容
function handleUpdatePost(data) {
  const sheet = getTargetSheet();
  const id = String(data.id || "").trim();
  if (!id) throw new Error("缺少卡片 ID");

  const rows = sheet.getDataRange().getValues();
  let targetRowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      targetRowIndex = i + 1;
      break;
    }
  }

  if (targetRowIndex === -1) throw new Error("找不到指定的卡片");

  // 更新欄位
  if (data.topic !== undefined) sheet.getRange(targetRowIndex, 2).setValue(String(data.topic).trim());
  if (data.title !== undefined) sheet.getRange(targetRowIndex, 4).setValue(String(data.title).trim());
  if (data.content !== undefined) sheet.getRange(targetRowIndex, 5).setValue(String(data.content).trim());

  // 處理圖片更新
  if (data.image) {
    if (data.image === "REMOVE") {
      sheet.getRange(targetRowIndex, 6).setValue("");
    } else if (data.image.indexOf("data:image") !== -1) {
      const newFileUrl = saveBase64ImageToDrive(data.image);
      sheet.getRange(targetRowIndex, 6).setValue(newFileUrl);
    }
  }

  // 更新最後修改時間
  sheet.getRange(targetRowIndex, 9).setValue(new Date());

  return jsonResponse({
    status: "success",
    message: "修改已儲存"
  });
}

// 3. 刪除卡片 (需驗證個人密碼或全域管理密碼)
function handleDeletePost(data) {
  const sheet = getTargetSheet();
  const id = String(data.id || "").trim();
  const inputPin = String(data.pin || "").trim();

  if (!id) throw new Error("缺少卡片 ID");
  if (!inputPin) throw new Error("請輸入刪除密碼！");

  const rows = sheet.getDataRange().getValues();
  let targetRowIndex = -1;
  let storedPin = "";

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      targetRowIndex = i + 1;
      storedPin = String(rows[i][6] || "").trim();
      break;
    }
  }

  if (targetRowIndex === -1) throw new Error("找不到指定的卡片");

  // 密碼比對邏輯：
  // 1. 若該卡片設有專屬密碼，輸入專屬密碼正確即可刪除
  // 2. 若輸入全域管理員密碼 (MASTER_PIN)，無論卡片密碼為何皆可授權強制刪除
  // 3. 若該卡片未自訂密碼，則需輸入 MASTER_PIN
  let isAuthorized = false;
  if (inputPin === MASTER_PIN) {
    isAuthorized = true;
  } else if (storedPin !== "" && inputPin === storedPin) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return jsonResponse({
      status: "error",
      message: "❌ 刪除密碼錯誤！無法刪除此筆記事。"
    });
  }

  // 執行軟刪除 (將第 10 欄 is_deleted 設為 true)
  sheet.getRange(targetRowIndex, 10).setValue(true);
  sheet.getRange(targetRowIndex, 9).setValue(new Date());

  return jsonResponse({
    status: "success",
    message: "記事已成功刪除"
  });
}

// 4. 交換兩張相鄰卡片順序 (上移 / 下移)
function handleSwapOrder(data) {
  const sheet = getTargetSheet();
  const id1 = String(data.id1);
  const id2 = String(data.id2);

  const rows = sheet.getDataRange().getValues();
  let rowIdx1 = -1, rowIdx2 = -1;
  let order1 = 0, order2 = 0;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id1) {
      rowIdx1 = i + 1;
      order1 = Number(rows[i][2]);
    }
    if (String(rows[i][0]) === id2) {
      rowIdx2 = i + 1;
      order2 = Number(rows[i][2]);
    }
  }

  if (rowIdx1 === -1 || rowIdx2 === -1) throw new Error("找不到欲交換順序的卡片");

  // 交換 order_index
  sheet.getRange(rowIdx1, 3).setValue(order2);
  sheet.getRange(rowIdx2, 3).setValue(order1);
  sheet.getRange(rowIdx1, 9).setValue(new Date());
  sheet.getRange(rowIdx2, 9).setValue(new Date());

  return jsonResponse({
    status: "success",
    message: "順序已交換"
  });
}

// 5. 將卡片移至指定的出現序列 (指定順位 1..N)
function handleSetOrderIndex(data) {
  const sheet = getTargetSheet();
  const id = String(data.id);
  const topic = String(data.topic);
  const targetIndex = parseInt(data.targetIndex, 10); // 1-based (例如第 1 位)

  if (isNaN(targetIndex) || targetIndex < 1) {
    throw new Error("請輸入大於 0 的有效序號");
  }

  const allActive = getActiveCards().cards.filter(c => c.topic === topic);
  const cardToMove = allActive.find(c => c.id === id);
  if (!cardToMove) throw new Error("找不到指定的卡片");

  // 移出原卡片，並插入到 targetIndex - 1 位置
  const filtered = allActive.filter(c => c.id !== id);
  const insertPos = Math.min(Math.max(targetIndex - 1, 0), filtered.length);
  filtered.splice(insertPos, 0, cardToMove);

  // 重新指派 1..N 順序並回寫試算表
  filtered.forEach((card, idx) => {
    const newOrder = idx + 1;
    sheet.getRange(card.rowIndex, 3).setValue(newOrder);
  });

  return jsonResponse({
    status: "success",
    message: "已重新排列至第 " + (insertPos + 1) + " 位"
  });
}

// =============================================================================
// 🖼️ 圖片儲存輔助函式 (嚴格限定於指定 FOLDER_ID)
// =============================================================================
function saveBase64ImageToDrive(base64Data) {
  const parts = base64Data.split(",");
  const base64String = parts.length > 1 ? parts[1] : parts[0];
  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64String),
    "image/png",
    "padlet_" + new Date().getTime() + ".png"
  );

  const folder = DriveApp.getFolderById(FOLDER_ID);
  const file = folder.createFile(blob);
  
  // 設定權限為知道連結者可檢視
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // 回傳直接檢視連結
  return "https://drive.google.com/uc?export=view&id=" + file.getId();
}

// 日期格式化輸出
function formatDateTime(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Taipei", "yyyy/MM/dd HH:mm");
  }
  return String(val);
}

// 統一回傳 JSON
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
