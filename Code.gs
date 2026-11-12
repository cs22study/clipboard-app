// =============================================================================
// 雲端記事牆 APP (Padlet 模式) - Google Apps Script (GAS) 後端核心程式
// 專屬架構：
// 1. 主資料夾：線上筆記資料速記APP (ID: 14LNISHVvM8h5oaVx4bKbTgnNcRqeQcmW)
// 2. 截圖照片專屬資料夾：雲端記事牆資料截圖照片 (ID: 15Bo8djCeOuhexWLi-6sjr5uqmfk7IFfN)
// 3. 試算表資料庫：雲端記事牆APP_Padlet資料庫 (ID: 1n33bBAwBLvEuikyr0wRgWww8wsK5yYW33hcLYj7-STM)
// =============================================================================

// ======================== 【正式設定區】 ========================
// 1. 專屬存放截圖照片的 Google Drive 資料夾 ID
const PHOTO_FOLDER_ID = '15Bo8djCeOuhexWLi-6sjr5uqmfk7IFfN';

// 2. 剛剛為您建立的全新 Google 試算表 ID
const SHEET_ID = '1n33bBAwBLvEuikyr0wRgWww8wsK5yYW33hcLYj7-STM';

// 3. 工作表名稱
const SHEET_NAME = 'Padlet_Cards';

// 4. 全域管理者刪除密碼 (Master PIN)
const MASTER_PIN = '8888';
// ================================================================


// =============================================================================
// 🛠️ 輔助函式：初始化工作表欄位結構 (只需執行一次)
// =============================================================================
function initDatabaseSheet() {
  Logger.log("=== 開始初始化試算表資料表欄位 ===");
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.getActiveSheet();
      sheet.setName(SHEET_NAME);
    }

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

    // 格式化標題列
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#2E7D32");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    // 測試存取照片資料夾權限
    const photoFolder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
    Logger.log("✅ 成功連線照片資料夾：" + photoFolder.getName());

    Logger.log("=================================================");
    Logger.log("🎉 資料庫欄位初始化完成！");
    Logger.log("👉 試算表網址：" + ss.getUrl());
    Logger.log("👉 照片存放資料夾：" + photoFolder.getName());
    Logger.log("=================================================");
  } catch (err) {
    Logger.log("❌ 初始化失敗：" + err.toString());
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

function getTargetSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // 若未初始化則自動建立
    initDatabaseSheet();
    sheet = ss.getSheetByName(SHEET_NAME);
  }
  return sheet;
}

// 取得所有未被軟刪除的有效卡片
function getActiveCards() {
  const sheet = getTargetSheet();
  const rows = sheet.getDataRange().getValues();

  let cards = [];
  let topicSet = new Set();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const isDeleted = String(row[9]).toUpperCase() === 'TRUE';
    if (!isDeleted) {
      const topic = String(row[1] || "未分類").trim();
      topicSet.add(topic);

      cards.push({
        rowIndex: i + 1,
        id: String(row[0]),
        topic: topic,
        orderIndex: Number(row[2]) || 0,
        title: String(row[3] || ""),
        content: String(row[4] || ""),
        imageUrl: String(row[5] || ""),
        hasPin: Boolean(row[6]),
        createdAt: row[7] ? formatDateTime(row[7]) : "",
        updatedAt: row[8] ? formatDateTime(row[8]) : ""
      });
    }
  }

  // 排序：同主題內按 orderIndex 升冪排列 (1, 2, 3...)
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

  // 處理圖片上傳（存至專屬的「雲端記事牆資料截圖照片」資料夾）
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
    false
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

  if (data.topic !== undefined) sheet.getRange(targetRowIndex, 2).setValue(String(data.topic).trim());
  if (data.title !== undefined) sheet.getRange(targetRowIndex, 4).setValue(String(data.title).trim());
  if (data.content !== undefined) sheet.getRange(targetRowIndex, 5).setValue(String(data.content).trim());

  if (data.image) {
    if (data.image === "REMOVE") {
      sheet.getRange(targetRowIndex, 6).setValue("");
    } else if (data.image.indexOf("data:image") !== -1) {
      const newFileUrl = saveBase64ImageToDrive(data.image);
      sheet.getRange(targetRowIndex, 6).setValue(newFileUrl);
    }
  }

  sheet.getRange(targetRowIndex, 9).setValue(new Date());

  return jsonResponse({
    status: "success",
    message: "修改已儲存"
  });
}

// 3. 刪除卡片 (雙軌密碼驗證)
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

  sheet.getRange(targetRowIndex, 10).setValue(true);
  sheet.getRange(targetRowIndex, 9).setValue(new Date());

  return jsonResponse({
    status: "success",
    message: "記事已成功刪除"
  });
}

// 4. 交換兩張卡片順序
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

  sheet.getRange(rowIdx1, 3).setValue(order2);
  sheet.getRange(rowIdx2, 3).setValue(order1);
  sheet.getRange(rowIdx1, 9).setValue(new Date());
  sheet.getRange(rowIdx2, 9).setValue(new Date());

  return jsonResponse({
    status: "success",
    message: "順序已交換"
  });
}

// 5. 將卡片移至指定序列
function handleSetOrderIndex(data) {
  const sheet = getTargetSheet();
  const id = String(data.id);
  const topic = String(data.topic);
  const targetIndex = parseInt(data.targetIndex, 10);

  if (isNaN(targetIndex) || targetIndex < 1) {
    throw new Error("請輸入大於 0 的有效序號");
  }

  const allActive = getActiveCards().cards.filter(c => c.topic === topic);
  const cardToMove = allActive.find(c => c.id === id);
  if (!cardToMove) throw new Error("找不到指定的卡片");

  const filtered = allActive.filter(c => c.id !== id);
  const insertPos = Math.min(Math.max(targetIndex - 1, 0), filtered.length);
  filtered.splice(insertPos, 0, cardToMove);

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
// 🖼️ 圖片儲存模組 (專屬存入「雲端記事牆資料截圖照片」資料夾)
// =============================================================================
function saveBase64ImageToDrive(base64Data) {
  const parts = base64Data.split(",");
  const base64String = parts.length > 1 ? parts[1] : parts[0];
  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64String),
    "image/png",
    "padlet_" + new Date().getTime() + ".png"
  );

  const targetFolder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  const file = targetFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return "https://drive.google.com/uc?export=view&id=" + file.getId();
}

function formatDateTime(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Taipei", "yyyy/MM/dd HH:mm");
  }
  return String(val);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
