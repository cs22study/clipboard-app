// =============================================================================
// 雲端記事牆 APP (Padlet 模式) - Google Apps Script (GAS) 後端核心程式
// 支援功能：
// 1. 多使用者獨立登入與專屬分頁資料庫隔離 (相互不干擾)
// 2. 截圖照片專屬資料夾 (ID: 15Bo8djCeOuhexWLi-6sjr5uqmfk7IFfN)
// 3. 試算表資料庫 (ID: 1n33bBAwBLvEuikyr0wRgWww8wsK5yYW33hcLYj7-STM)
// 4. 四大實用功能：便利貼色彩選取、卡片置頂 (Pin to top)、愛心點讚互動、資料匯出備份
// 5. 總管理控制台 (Admin_Settings 分頁設定、回收筒一鍵復原、主題更名)
// =============================================================================

// ======================== 【正式設定區】 ========================
// 1. 專屬存放截圖照片的 Google Drive 資料夾 ID
const PHOTO_FOLDER_ID = '15Bo8djCeOuhexWLi-6sjr5uqmfk7IFfN';

// 2. Google 試算表 ID
const SHEET_ID = '1n33bBAwBLvEuikyr0wRgWww8wsK5yYW33hcLYj7-STM';

// 3. 預設記事卡片工作表名稱
const DEFAULT_CARDS_SHEET = 'Padlet_Cards';

// 4. 使用者帳號名冊分頁
const USERS_SHEET_NAME = 'Users_Registry';

// 5. 系統管理設定分頁
const SETTINGS_SHEET_NAME = 'Admin_Settings';
// ================================================================

// 13 個完整欄位標題定義
const CARD_HEADERS = [
  "id",           // A: 卡片唯一識別碼 (UUID)
  "topic",        // B: 所屬主題欄位 (Topic/Column)
  "order_index",  // C: 排序權重 (序號，由小到大排列)
  "title",        // D: 卡片標題
  "content",      // E: 筆記主要文字內容
  "image_url",    // F: 雲端硬碟圖片檢視網址
  "delete_pin",   // G: 刪除保護密碼
  "created_at",   // H: 建立時間
  "updated_at",   // I: 最後修改時間
  "is_deleted",   // J: 軟刪除旗標 (TRUE / FALSE)
  "is_pinned",    // K: 是否置頂 (TRUE / FALSE)
  "bg_color",     // L: 卡片便利貼底色代碼 (如 #FFF9C4)
  "like_count"    // M: 愛心點讚累計數
];


// =============================================================================
// 👥 多使用者帳號管理與分頁隔離模組
// =============================================================================

// 取得或初始化使用者名冊分頁
function getUsersSheet(ss) {
  let sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET_NAME);
    const headers = ["username", "password", "displayName", "sheetName", "role", "createdAt"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1565C0").setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);

    // 預設建立總管理者帳號
    sheet.appendRow(["admin", "8888", "系統總管理員", DEFAULT_CARDS_SHEET, "admin", new Date()]);
  }
  return sheet;
}

// 使用者登入驗證
function handleUserLogin(data) {
  const username = String(data.username || "").trim().toLowerCase();
  const password = String(data.password || "").trim();

  if (!username || !password) {
    return jsonResponse({ status: "error", message: "請輸入帳號與密碼" });
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getUsersSheet(ss);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const u = String(rows[i][0]).trim().toLowerCase();
    const p = String(rows[i][1]).trim();
    if (u === username) {
      if (p === password) {
        return jsonResponse({
          status: "success",
          message: "登入成功！",
          user: {
            username: rows[i][0],
            displayName: rows[i][2],
            sheetName: rows[i][3],
            role: rows[i][4]
          }
        });
      } else {
        return jsonResponse({ status: "error", message: "密碼錯誤，請重新輸入！" });
      }
    }
  }

  return jsonResponse({ status: "error", message: "找不到該帳號，若為新使用者請先註冊！" });
}

// 註冊新使用者 (自動為其建立獨立的分頁試算表，達成資料隔離)
function handleUserRegister(data) {
  const username = String(data.username || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const password = String(data.password || "").trim();
  const displayName = String(data.displayName || username).trim();

  if (!username || username.length < 3) {
    return jsonResponse({ status: "error", message: "帳號至少需 3 個英數字！" });
  }
  if (!password || password.length < 4) {
    return jsonResponse({ status: "error", message: "密碼至少需 4 碼！" });
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const userSheet = getUsersSheet(ss);
  const rows = userSheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === username) {
      return jsonResponse({ status: "error", message: "此帳號已被註冊，請更換其他帳號！" });
    }
  }

  // 為新使用者建立獨立分頁
  const userSheetName = `Cards_${username}`;
  let newTab = ss.getSheetByName(userSheetName);
  if (!newTab) {
    newTab = ss.insertSheet(userSheetName);
    newTab.appendRow(CARD_HEADERS);
    const headerRange = newTab.getRange(1, 1, 1, CARD_HEADERS.length);
    headerRange.setFontWeight("bold").setBackground("#2E7D32").setFontColor("#FFFFFF").setHorizontalAlignment("center");
    newTab.setFrozenRows(1);
  }

  // 寫入使用者名冊
  userSheet.appendRow([username, password, displayName, userSheetName, "user", new Date()]);

  return jsonResponse({
    status: "success",
    message: "註冊成功！已為您開設獨立的記事牆分頁。",
    user: {
      username: username,
      displayName: displayName,
      sheetName: userSheetName,
      role: "user"
    }
  });
}

// 取得目標卡片工作表 (支援多使用者分頁隔離)
function getTargetSheet(requestedSheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let targetName = requestedSheetName || DEFAULT_CARDS_SHEET;

  let sheet = ss.getSheetByName(targetName);
  if (!sheet) {
    sheet = ss.insertSheet(targetName);
    sheet.appendRow(CARD_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, CARD_HEADERS.length);
    headerRange.setFontWeight("bold").setBackground("#2E7D32").setFontColor("#FFFFFF").setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  } else {
    // 檢查欄位數量是否足夠，若欄位只有 10 欄，自動補充置頂、顏色、點讚 3 欄
    const currentCols = sheet.getLastColumn();
    if (currentCols < CARD_HEADERS.length) {
      for (let c = currentCols + 1; c <= CARD_HEADERS.length; c++) {
        sheet.getRange(1, c).setValue(CARD_HEADERS[c - 1]).setFontWeight("bold").setBackground("#2E7D32").setFontColor("#FFFFFF");
      }
    }
  }
  return sheet;
}


// =============================================================================
// 🔐 管理密碼與系統設定管理模組 (儲存於 Admin_Settings 分頁)
// =============================================================================

function getMasterPin() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SETTINGS_SHEET_NAME);
      sheet.appendRow(["key", "value", "description", "updated_at"]);
      sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#37474F").setFontColor("#FFFFFF");
      sheet.appendRow(["master_pin", "8888", "全域總管理者密碼", new Date()]);
      sheet.setFrozenRows(1);
      return "8888";
    }

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === "master_pin") {
        return String(data[i][1]).trim() || "8888";
      }
    }
    sheet.appendRow(["master_pin", "8888", "全域總管理者密碼", new Date()]);
    return "8888";
  } catch (err) {
    return "8888";
  }
}

function handleVerifyAdmin(data) {
  const pin = String(data.pin || "").trim();
  if (pin === getMasterPin()) {
    return jsonResponse({ status: "success", message: "管理員身分驗證成功" });
  } else {
    return jsonResponse({ status: "error", message: "管理密碼錯誤！" });
  }
}

function handleUpdateMasterPin(data) {
  const currentPin = getMasterPin();
  const oldPin = String(data.oldPin || "").trim();
  const newPin = String(data.newPin || "").trim();

  if (oldPin !== currentPin) {
    return jsonResponse({ status: "error", message: "目前的舊管理密碼輸入錯誤！" });
  }
  if (!newPin || newPin.length < 4) {
    return jsonResponse({ status: "error", message: "新密碼長度至少需 4 碼！" });
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) getMasterPin();
  sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);

  const dataRows = sheet.getDataRange().getValues();
  for (let i = 1; i < dataRows.length; i++) {
    if (String(dataRows[i][0]).trim() === "master_pin") {
      sheet.getRange(i + 1, 2).setValue(newPin);
      sheet.getRange(i + 1, 4).setValue(new Date());
      return jsonResponse({ status: "success", message: "✅ 總管理密碼已成功更新！" });
    }
  }
  sheet.appendRow(["master_pin", newPin, "全域總管理者密碼", new Date()]);
  return jsonResponse({ status: "success", message: "✅ 總管理密碼已成功更新！" });
}

// 取得回收筒卡片
function handleGetTrashCards(data) {
  const pin = String(data.pin || "").trim();
  if (pin !== getMasterPin()) {
    return jsonResponse({ status: "error", message: "無權限檢視回收筒資料" });
  }

  const sheet = getTargetSheet(data.sheetName);
  const rows = sheet.getDataRange().getValues();
  let trash = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const isDeleted = String(row[9]).toUpperCase() === 'TRUE';
    if (isDeleted) {
      trash.push({
        rowIndex: i + 1,
        id: String(row[0]),
        topic: String(row[1] || "未分類"),
        title: String(row[3] || ""),
        content: String(row[4] || ""),
        imageUrl: String(row[5] || ""),
        deletedAt: row[8] ? formatDateTime(row[8]) : ""
      });
    }
  }
  trash.reverse();
  return jsonResponse({ status: "success", trash: trash });
}

// 復原卡片
function handleRestorePost(data) {
  const pin = String(data.pin || "").trim();
  const id = String(data.id || "").trim();
  if (pin !== getMasterPin()) {
    return jsonResponse({ status: "error", message: "管理密碼錯誤，無法復原記事" });
  }

  const sheet = getTargetSheet(data.sheetName);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      sheet.getRange(i + 1, 10).setValue(false);
      sheet.getRange(i + 1, 9).setValue(new Date());
      return jsonResponse({ status: "success", message: "記事已成功復原回到看板！" });
    }
  }
  return jsonResponse({ status: "error", message: "找不到該卡片紀錄" });
}

// 批次更名主題
function handleRenameTopic(data) {
  const pin = String(data.pin || "").trim();
  const oldTopic = String(data.oldTopic || "").trim();
  const newTopic = String(data.newTopic || "").trim();

  if (pin !== getMasterPin()) {
    return jsonResponse({ status: "error", message: "管理密碼錯誤" });
  }
  if (!newTopic) {
    return jsonResponse({ status: "error", message: "新主題名稱不得為空" });
  }

  const sheet = getTargetSheet(data.sheetName);
  const rows = sheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).trim() === oldTopic) {
      sheet.getRange(i + 1, 2).setValue(newTopic);
      count++;
    }
  }
  return jsonResponse({ status: "success", message: `已成功將 ${count} 篇記事的主題更新為【${newTopic}】` });
}


// =============================================================================
// 🌐 跨網域 CORS 預檢處理
// =============================================================================
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}


// =============================================================================
// 📥 讀取資料 (GET)
// =============================================================================
function doGet(e) {
  try {
    const sheetName = e && e.parameter && e.parameter.sheet ? e.parameter.sheet : DEFAULT_CARDS_SHEET;
    const data = getActiveCards(sheetName);
    return jsonResponse({
      status: "success",
      sheetName: sheetName,
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
// 📤 操作請求 (POST)：支援新增、編輯、刪除、排序、置頂、點讚、多使用者等操作
// =============================================================================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("無效的請求資料");
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    switch (action) {
      // 使用者認證
      case "login":
        return handleUserLogin(payload);

      case "register":
        return handleUserRegister(payload);

      // 卡片讀取與寫入
      case "getBoardData":
        return jsonResponse({
          status: "success",
          ...getActiveCards(payload.sheetName)
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

      // 新功能：愛心點讚與卡片置頂
      case "toggleLike":
        return handleToggleLike(payload);

      case "togglePin":
        return handleTogglePin(payload);

      // 總管理操作
      case "verifyAdmin":
        return handleVerifyAdmin(payload);

      case "updateMasterPin":
        return handleUpdateMasterPin(payload);

      case "getTrashCards":
        return handleGetTrashCards(payload);

      case "restorePost":
        return handleRestorePost(payload);

      case "renameTopic":
        return handleRenameTopic(payload);

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
// 📋 資料庫核心操作模組 (支援置頂、自訂底色、點讚)
// =============================================================================

// 取得所有未被軟刪除的有效卡片
function getActiveCards(requestedSheetName) {
  const sheet = getTargetSheet(requestedSheetName);
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
        updatedAt: row[8] ? formatDateTime(row[8]) : "",
        isPinned: String(row[10]).toUpperCase() === 'TRUE',
        bgColor: String(row[11] || "#FFFFFF"),
        likeCount: Number(row[12]) || 0
      });
    }
  }

  // 排序規則：同主題內，置頂卡片 (isPinned) 優先，其餘按 orderIndex 升冪排列
  cards.sort((a, b) => {
    if (a.topic !== b.topic) {
      return a.topic.localeCompare(b.topic, "zh-Hant");
    }
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1; // 置頂排在前面
    }
    return a.orderIndex - b.orderIndex;
  });

  return {
    topics: Array.from(topicSet),
    cards: cards
  };
}

// 1. 新增卡片 (支援底色與置頂選項)
function handleCreatePost(data) {
  const sheet = getTargetSheet(data.sheetName);
  const topic = String(data.topic || "未分類").trim();
  const title = String(data.title || "").trim();
  const content = String(data.content || "").trim();
  const pin = String(data.pin || "").trim();
  const base64Image = data.image;
  const isPinned = Boolean(data.isPinned);
  const bgColor = String(data.bgColor || "#FFFFFF");

  if (!content && !base64Image) {
    throw new Error("請至少輸入記事內容或附帶圖片！");
  }

  let fileUrl = "";
  if (base64Image && base64Image.indexOf("data:image") !== -1) {
    try {
      fileUrl = saveBase64ImageToDrive(base64Image);
    } catch (imgErr) {
      Logger.log("圖片儲存過程發生異常：" + imgErr.toString());
    }
  }

  const existingCards = getActiveCards(data.sheetName).cards.filter(c => c.topic === topic);
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
    false,    // is_deleted
    isPinned, // is_pinned
    bgColor,  // bg_color
    0         // like_count
  ]);

  return jsonResponse({
    status: "success",
    message: "新增成功",
    cardId: newId
  });
}

// 2. 編輯卡片內容 (支援修改底色與置頂)
function handleUpdatePost(data) {
  const sheet = getTargetSheet(data.sheetName);
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
  if (data.isPinned !== undefined) sheet.getRange(targetRowIndex, 11).setValue(Boolean(data.isPinned));
  if (data.bgColor !== undefined) sheet.getRange(targetRowIndex, 12).setValue(String(data.bgColor));

  if (data.image) {
    if (data.image === "REMOVE") {
      sheet.getRange(targetRowIndex, 6).setValue("");
    } else if (data.image.indexOf("data:image") !== -1) {
      try {
        const newFileUrl = saveBase64ImageToDrive(data.image);
        sheet.getRange(targetRowIndex, 6).setValue(newFileUrl);
      } catch (e) {
        Logger.log("更換圖片失敗: " + e.toString());
      }
    }
  }

  sheet.getRange(targetRowIndex, 9).setValue(new Date());

  return jsonResponse({
    status: "success",
    message: "修改已儲存"
  });
}

// 3. 刪除卡片
function handleDeletePost(data) {
  const sheet = getTargetSheet(data.sheetName);
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

  const masterPin = getMasterPin();
  let isAuthorized = false;

  if (inputPin === masterPin) {
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
  const sheet = getTargetSheet(data.sheetName);
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
  const sheet = getTargetSheet(data.sheetName);
  const id = String(data.id);
  const topic = String(data.topic);
  const targetIndex = parseInt(data.targetIndex, 10);

  if (isNaN(targetIndex) || targetIndex < 1) {
    throw new Error("請輸入大於 0 的有效序號");
  }

  const allActive = getActiveCards(data.sheetName).cards.filter(c => c.topic === topic);
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

// 6. 愛心點讚 (加一讚)
function handleToggleLike(data) {
  const sheet = getTargetSheet(data.sheetName);
  const id = String(data.id || "").trim();
  if (!id) throw new Error("缺少卡片 ID");

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      const currentLikes = Number(rows[i][12]) || 0;
      const newLikes = currentLikes + 1;
      sheet.getRange(i + 1, 13).setValue(newLikes);
      return jsonResponse({ status: "success", likes: newLikes });
    }
  }
  return jsonResponse({ status: "error", message: "找不到該卡片" });
}

// 7. 切換置頂狀態 (Pin to top)
function handleTogglePin(data) {
  const sheet = getTargetSheet(data.sheetName);
  const id = String(data.id || "").trim();
  if (!id) throw new Error("缺少卡片 ID");

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      const currentPinned = String(rows[i][10]).toUpperCase() === 'TRUE';
      const newPinned = !currentPinned;
      sheet.getRange(i + 1, 11).setValue(newPinned);
      return jsonResponse({ status: "success", isPinned: newPinned });
    }
  }
  return jsonResponse({ status: "error", message: "找不到該卡片" });
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
  
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log("setSharing 略過: " + e.toString());
  }
  
  return "https://lh3.googleusercontent.com/d/" + file.getId();
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
