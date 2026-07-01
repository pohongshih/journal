/**
 * 高中線上週記管理平台 v2.0
 * Backend Logic (Google Apps Script)
 */

function clearSheetCache() {
  CacheService.getScriptCache().removeAll([
    'SHEET_Users',
    'SHEET_Students',
    'SHEET_Journals',
    'SHEET_Comments',
    'SHEET_WeeklyTopics'
  ]);
}

// 1. 服務入口 - GET
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "API is running." }))
    .setMimeType(ContentService.MimeType.JSON);
}

// 2. 服務入口 - POST (API)
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const data = params.data || {};
    
    let result = {};
    
    switch(action) {
      case 'login':
        result = apiLogin(data.account, data.password);
        break;
      case 'getAdminData':
        result = apiGetAdminData();
        break;
      case 'adminAction':
        apiAdminAction(data.subAction, data.userId, data.payload);
        result = { status: 'success' };
        break;
      case 'getTeacherData':
        result = apiGetTeacherData(data.classId, data.userId, data.role);
        break;
      case 'saveTopic':
        apiSaveTopic(data);
        result = { status: 'success' };
        break;
      case 'deleteTopic':
        apiDeleteTopic(data.topicId);
        result = { status: 'success' };
        break;
      case 'saveGrade':
        apiSaveGrade(data);
        result = { status: 'success' };
        break;
      case 'manageStudent':
        apiManageStudent(data.subAction, data.payload);
        result = { status: 'success' };
        break;
      case 'getStudentData':
        result = apiGetStudentData(data.userId);
        break;
      case 'submitJournal':
        apiSubmitJournal(data);
        result = { status: 'success' };
        break;
      case 'generateAIComment':
        result = { status: 'success', comment: apiGenerateAIComment(data.content) };
        break;
      default:
        result = { status: 'error', message: 'Unknown action: ' + action };
    }
    
    // Return JSON response. Using CORS safe approach by returning JSON directly.
    // Ensure client uses 'text/plain' Content-Type to avoid preflight OPTIONS.
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. 資料庫工具
const DB_CACHE = {};

function getDb() {
  // 將這裡改為您的 Sheet ID
  return SpreadsheetApp.openById('1M9fhCesLlavEPH8V88i_p2zFIcipoFhHi3T9Z2RSsGY');
}

function getData(sheetName) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'SHEET_' + sheetName;

  // ① 嘗試從 Cache 拿
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // ② Cache 沒有才讀 Spreadsheet
  const sheet = getDb().getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h).trim());

  const data = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let v = row[i];
      if (v instanceof Date) v = v.toISOString();
      obj[h] = v;
    });
    return obj;
  });

  // ③ 存入 Cache（300 秒）
  cache.put(cacheKey, JSON.stringify(data), 300);

  return data;
}

// 3. 權限與登入
function apiLogin(account, password) {
  if (account === 'admin' && password === 'admin') {
    return { status: 'success', role: 'admin', name: 'Admin', userId: 'ADMIN', class: '101' };
  }
  const users = getData('Users');
  const user = users.find(u => u.account == account && u.password == password);
  if (user) {
     if (user.role === 'teacher' && user.status !== 'active') {
         return { status: 'error', message: user.status === 'suspended' ? '帳號已停用' : '帳號待審核中' };
     }
     return { ...user, status: 'success' };
  }
  const students = getData('Students');
  const student = students.find(s => s.account == account && s.password == password);
  if (student) {
     if (student.status !== 'active') return { status: 'error', message: '帳號停用中' };
     return { ...student, role: 'student', userId: student.studentId, status: 'success' };
  }
  return { status: 'error', message: '帳號或密碼錯誤' };
}

// 4. 管理者 API
function apiGetAdminData() {
  return getData('Users').filter(u => u.role === 'teacher');
}

function apiAdminAction(action, userId, data) {
  const sheet = getDb().getSheetByName('Users');
  const allData = sheet.getDataRange().getValues();
  const rowIdx = allData.findIndex(r => r[0] == userId); 

  if (rowIdx > 0) {
    const r = rowIdx + 1;
    if (action === 'activate') sheet.getRange(r, 7).setValue('active'); 
    if (action === 'suspend') sheet.getRange(r, 7).setValue('suspended');
    if (action === 'delete') sheet.deleteRow(r);
    if (action === 'update') {
        if(data.account) sheet.getRange(r, 2).setValue(data.account);
        if(data.password) sheet.getRange(r, 3).setValue(data.password);
        if(data.name) sheet.getRange(r, 4).setValue(data.name);
        if(data.class) sheet.getRange(r, 6).setValue(data.class);
    }
  }
  clearSheetCache(); 
}

// 5. 老師 API
function apiGetTeacherData(classId, userId, role) {
  const students = getData('Students');
  const topics = getData('WeeklyTopics');
  const journals = getData('Journals');
  const comments = getData('Comments');

  const commentMap = {};
  comments.forEach(c => commentMap[c.journalId] = c.comment);

  const filteredStudents = role === 'admin'
    ? students
    : students.filter(s => String(s.class) === String(classId) && s.teacherId === userId);

  const filteredTopics = role === 'admin'
    ? topics
    : topics.filter(t => t.teacherId === userId);

  filteredTopics.sort((a, b) =>
    new Date(a.createdAt || a.publishDate) - new Date(b.createdAt || b.publishDate)
  );

  const mergedJournals = journals.map(j => ({
    ...j,
    teacherComment: commentMap[j.journalId] || ''
  }));

  return {
    students: filteredStudents,
    topics: filteredTopics,
    journals: mergedJournals
  };
}

function apiSaveTopic(data) {
  const sheet = getDb().getSheetByName('WeeklyTopics');
  
  if (data.topicId) {
      const all = sheet.getDataRange().getValues();
      const rowIdx = all.findIndex(r => r[0] == data.topicId);
      if (rowIdx > 0) {
          const r = rowIdx + 1;
          sheet.getRange(r, 2).setValue(data.title);
          sheet.getRange(r, 3).setValue(data.content);
          sheet.getRange(r, 4).setValue(data.publishDate);
          sheet.getRange(r, 5).setValue(data.dueDate);
          sheet.getRange(r, 6).setValue(data.allowLate);
          sheet.getRange(r, 9).setValue(data.minLength); 
          clearSheetCache(); 
          return;
      }
  }

  const id = 'TP' + new Date().getTime();
  sheet.appendRow([id, data.title, data.content, data.publishDate, data.dueDate, data.allowLate, data.teacherId, new Date().toISOString(), data.minLength]);
  clearSheetCache();
}

function apiDeleteTopic(topicId) {
  const sheet = getDb().getSheetByName('WeeklyTopics');
  const data = sheet.getDataRange().getValues();
  const rowIdx = data.findIndex(r => r[0] == topicId);
  if (rowIdx > 0) {
    sheet.deleteRow(rowIdx + 1);
  }
  clearSheetCache();
}

function apiSaveGrade(data) {
  const jSheet = getDb().getSheetByName('Journals');
  const jData = jSheet.getDataRange().getValues();
  const jRow = jData.findIndex(r => r[0] == data.journalId);
  if(jRow > 0) jSheet.getRange(jRow+1, 7).setValue(data.score); 

  const cSheet = getDb().getSheetByName('Comments');
  const cData = cSheet.getDataRange().getValues();
  const cRow = cData.findIndex(r => r[1] == data.journalId);
  
  if (cRow > 0) {
    cSheet.getRange(cRow+1, 4).setValue(data.comment);
    cSheet.getRange(cRow+1, 5).setValue(new Date().toISOString());
  } else {
    const cid = 'C' + new Date().getTime();
    cSheet.appendRow([cid, data.journalId, 'TEACHER', data.comment, new Date().toISOString()]);
  }
  clearSheetCache(); 
}

function apiManageStudent(action, data) {
  const sheet = getDb().getSheetByName('Students');
  
  if (action === 'update' && data.studentId) {
     const all = sheet.getDataRange().getValues();
     const rowIdx = all.findIndex(r => r[0] == data.studentId);
     if (rowIdx > 0) {
         const r = rowIdx + 1;
         sheet.getRange(r, 2).setValue(data.name);
         sheet.getRange(r, 3).setValue(data.class);
         sheet.getRange(r, 4).setValue(data.seatNumber);
         sheet.getRange(r, 5).setValue(data.account);
         sheet.getRange(r, 6).setValue(data.password);
     }
  }
  else if (action === 'create') {
    const uid = 'S' + new Date().getTime() + Math.floor(Math.random()*100);
    sheet.appendRow([uid, data.name, data.class, data.seatNumber, data.account, data.password, 'active', data.teacherId]);
  }
  clearSheetCache(); 
}

// 6. 學生 API
function apiGetStudentData(userId) {
  const students = getData('Students');
  const topics = getData('WeeklyTopics');
  const journals = getData('Journals');
  const comments = getData('Comments');

  const user = students.find(s => s.studentId === userId) || {};
  const commentMap = {};
  comments.forEach(c => commentMap[c.journalId] = c.comment);

  topics.sort((a, b) =>
    new Date(a.createdAt || a.publishDate) - new Date(b.createdAt || b.publishDate)
  );

  const userJournals = journals
    .filter(j => j.studentId === userId)
    .map(j => ({
      ...j,
      teacherComment: commentMap[j.journalId] || ''
    }));

  return { user, topics, journals: userJournals };
}

function apiSubmitJournal(data) {
  const sheet = getDb().getSheetByName('Journals');
  const allData = sheet.getDataRange().getValues();
  const rowIdx = allData.findIndex(r => r[1] == data.topicId && r[2] == data.studentId);
  const now = new Date().toISOString();
  
  if (rowIdx > 0) {
    sheet.getRange(rowIdx+1, 4).setValue(data.content);
    sheet.getRange(rowIdx+1, 5).setValue(now);
    sheet.getRange(rowIdx+1, 6).setValue(data.status);
  } else {
    const jid = 'J' + new Date().getTime();
    sheet.appendRow([jid, data.topicId, data.studentId, data.content, now, data.status, '']);
  }
  clearSheetCache(); 
}

function apiGenerateAIComment(studentContent) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('apiKey');
    if (!apiKey) return "錯誤：未設定 API Key";
  
    const modelName = "gemini-2.5-flash";

    const apiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      modelName +
      ":generateContent?key=" +
      apiKey;

    const prompt =
      "你是一位親切的高中老師。請根據以下學生的週記內容，寫一段約50字的老師評語，口語化並提供鼓勵與建議：" +
      studentContent;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const json = JSON.parse(response.getContentText());

    if (json.error) {
      return "AI錯誤: " + json.error.message;
    }

    return json.candidates?.[0]?.content?.parts?.[0]?.text || "無回應";

  } catch (e) {
    return e.toString();
  }
}
