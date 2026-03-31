// ============================================================
// Money Manager - Google Apps Script Backend
// ============================================================
// SETUP INSTRUCTIONS:
// 1. Open your Google Sheet
// 2. Extensions > Apps Script
// 3. Paste this entire file into Code.gs
// 4. Run seedDefaultData() once manually (Run > Run function > seedDefaultData)
// 5. Deploy > New deployment > Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Copy the deployment URL into your .env as VITE_API_URL
// ============================================================

const SHEET_NAMES = {
  TRANSACTIONS: 'Transactions',
  CATEGORIES: 'Categories',
  ACCOUNTS: 'Accounts',
  SCHEDULES: 'Schedules',
  PREFERENCES: 'Preferences',
};

// ── Entry Points ─────────────────────────────────────────────

function doGet(e) {
  const action = e.parameter.action;
  let result;
  try {
    switch (action) {
      case 'getTransactions':
        result = getTransactions(e.parameter.startDate, e.parameter.endDate);
        break;
      case 'getCategories':
        result = getCategories();
        break;
      case 'getAccounts':
        result = getAccounts();
        break;
      case 'getSchedules':
        result = getSchedules();
        break;
      case 'getPreferences':
        result = getPreferences();
        break;
      case 'ping':
        result = { ok: true, timestamp: new Date().toISOString() };
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return corsResponse(result);
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return corsResponse({ error: 'Invalid JSON body' });
  }

  const { action, data, id } = body;
  let result;
  try {
    switch (action) {
      case 'addTransaction':
        result = addTransaction(data);
        break;
      case 'updateTransaction':
        result = updateTransaction(id, data);
        break;
      case 'deleteTransaction':
        result = deleteTransaction(id);
        break;
      case 'addCategory':
        result = addCategory(data);
        break;
      case 'updateCategory':
        result = updateCategory(id, data);
        break;
      case 'deleteCategory':
        result = deleteCategory(id);
        break;
      case 'reorderCategories':
        result = reorderCategories(body.ids);
        break;
      case 'addAccount':
        result = addAccount(data);
        break;
      case 'updateAccount':
        result = updateAccount(id, data);
        break;
      case 'deleteAccount':
        result = deleteAccount(id);
        break;
      case 'addSchedule':
        result = addSchedule(data);
        break;
      case 'updateSchedule':
        result = updateSchedule(id, data);
        break;
      case 'deleteSchedule':
        result = deleteSchedule(id, data && data.deleteTxns);
        break;
      case 'getScheduleTransactionCount':
        result = getScheduleTransactionCount(id);
        break;
      case 'applyDueSchedules':
        result = applyDueSchedules();
        break;
      case 'addTransfer':
        result = addTransfer(data);
        break;
      case 'deleteTransfer':
        result = deleteTransfer(body.transferId);
        break;
      case 'updateTransfer':
        result = updateTransfer(body.transferId, data);
        break;
      case 'setPreference':
        result = setPreference(data.key, data.value);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return corsResponse(result);
}

// ── Transactions ─────────────────────────────────────────────

function getTransactions(startDate, endDate) {
  const sheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const rows = sheetToObjects(sheet);

  if (!startDate && !endDate) return { data: rows };

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate + 'T23:59:59') : null;

  const filtered = rows.filter(function (row) {
    const d = new Date(row.date);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });

  return { data: filtered };
}

function addTransaction(data) {
  const sheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const now = new Date().toISOString();
  const id = generateId('txn');
  sheet.appendRow([
    id,
    data.date,
    data.amount,
    data.type,
    data.categoryId || '',
    data.accountId || '',
    data.note || '',
    now,              // createdAt
    now,              // updatedAt
    data.currency || '',
    data.exchangeRate || 1,
    data.subCategoryId || '',
    data.subAccountId || '',
  ]);
  // Write scheduleId to the correct column if it exists (safe header-aware write)
  if (data.scheduleId) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var schCol = headers.indexOf('scheduleId');
    if (schCol !== -1) {
      sheet.getRange(sheet.getLastRow(), schCol + 1).setValue(data.scheduleId);
    }
  }
  return { ok: true, id: id };
}

function updateTransaction(id, data) {
  const sheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol = headers.indexOf('id');

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === id) {
      const now = new Date().toISOString();
      const rowNum = i + 1;
      if (data.date !== undefined) sheet.getRange(rowNum, headers.indexOf('date') + 1).setValue(data.date);
      if (data.amount !== undefined) sheet.getRange(rowNum, headers.indexOf('amount') + 1).setValue(data.amount);
      if (data.type !== undefined) sheet.getRange(rowNum, headers.indexOf('type') + 1).setValue(data.type);
      if (data.categoryId !== undefined) sheet.getRange(rowNum, headers.indexOf('categoryId') + 1).setValue(data.categoryId);
      if (data.accountId !== undefined) sheet.getRange(rowNum, headers.indexOf('accountId') + 1).setValue(data.accountId);
      if (data.note !== undefined) sheet.getRange(rowNum, headers.indexOf('note') + 1).setValue(data.note);
      if (data.subCategoryId !== undefined && headers.indexOf('subCategoryId') !== -1) {
        sheet.getRange(rowNum, headers.indexOf('subCategoryId') + 1).setValue(data.subCategoryId || '');
      }
      if (data.currency !== undefined && headers.indexOf('currency') !== -1) {
        sheet.getRange(rowNum, headers.indexOf('currency') + 1).setValue(data.currency || '');
      }
      if (data.exchangeRate !== undefined && headers.indexOf('exchangeRate') !== -1) {
        sheet.getRange(rowNum, headers.indexOf('exchangeRate') + 1).setValue(Number(data.exchangeRate) || 1);
      }
      if (data.subAccountId !== undefined && headers.indexOf('subAccountId') !== -1) {
        sheet.getRange(rowNum, headers.indexOf('subAccountId') + 1).setValue(data.subAccountId || '');
      }
      sheet.getRange(rowNum, headers.indexOf('updatedAt') + 1).setValue(now);
      return { ok: true };
    }
  }
  return { error: 'Transaction not found: ' + id };
}

// Creates two linked transaction records for a transfer between accounts.
// Both records share a transferId and carry fromAccountId + toAccountId.
function addTransfer(data) {
  const sheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const now = new Date().toISOString();
  const transferId = generateId('trf');
  const idOut = generateId('txn');
  const idIn  = generateId('txn');

  // Outflow: money leaves fromAccount (subAccountId = fromSubAccountId)
  sheet.appendRow([
    idOut, data.date, data.amount, 'transfer',
    '', data.fromAccountId, data.note || '',
    now, now,
    data.currency || '', data.exchangeRate || 1,
    '', data.fromSubAccountId || '',
    transferId, data.fromAccountId, data.toAccountId,
  ]);
  // Inflow: money arrives at toAccount (subAccountId = toSubAccountId)
  sheet.appendRow([
    idIn, data.date, data.amount, 'transfer',
    '', data.toAccountId, data.note || '',
    now, now,
    data.currency || '', data.exchangeRate || 1,
    '', data.toSubAccountId || '',
    transferId, data.fromAccountId, data.toAccountId,
  ]);
  return { ok: true, transferId: transferId, idOut: idOut, idIn: idIn };
}

// Deletes both legs of a transfer by transferId.
function deleteTransfer(transferId) {
  const sheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const tCol = headers.indexOf('transferId');
  if (tCol === -1) return { error: 'transferId column not found' };
  // Delete from bottom up so row numbers stay valid
  for (var i = rows.length - 1; i >= 1; i--) {
    if (rows[i][tCol] === transferId) sheet.deleteRow(i + 1);
  }
  return { ok: true };
}

// Updates both legs of a transfer (shared fields + per-leg accountId/subAccountId).
function updateTransfer(transferId, data) {
  const sheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const tCol     = headers.indexOf('transferId');
  const accCol   = headers.indexOf('accountId');
  const fromCol  = headers.indexOf('fromAccountId');
  if (tCol === -1) return { error: 'transferId column not found' };
  const now = new Date().toISOString();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][tCol]) !== String(transferId)) continue;
    const rowNum = i + 1;
    // Shared fields
    if (data.date !== undefined)         sheet.getRange(rowNum, headers.indexOf('date') + 1).setValue(data.date);
    if (data.amount !== undefined)       sheet.getRange(rowNum, headers.indexOf('amount') + 1).setValue(data.amount);
    if (data.note !== undefined)         sheet.getRange(rowNum, headers.indexOf('note') + 1).setValue(data.note || '');
    if (data.currency !== undefined && headers.indexOf('currency') !== -1)
      sheet.getRange(rowNum, headers.indexOf('currency') + 1).setValue(data.currency || '');
    if (data.exchangeRate !== undefined && headers.indexOf('exchangeRate') !== -1)
      sheet.getRange(rowNum, headers.indexOf('exchangeRate') + 1).setValue(data.exchangeRate || 1);
    // Update both legs' fromAccountId / toAccountId
    if (data.fromAccountId !== undefined && fromCol !== -1)
      sheet.getRange(rowNum, fromCol + 1).setValue(data.fromAccountId);
    if (data.toAccountId !== undefined && headers.indexOf('toAccountId') !== -1)
      sheet.getRange(rowNum, headers.indexOf('toAccountId') + 1).setValue(data.toAccountId);
    // Per-leg: outflow has accountId === fromAccountId
    const isOutflow = fromCol !== -1 && String(rows[i][accCol]) === String(rows[i][fromCol]);
    if (isOutflow) {
      if (data.fromAccountId !== undefined) sheet.getRange(rowNum, accCol + 1).setValue(data.fromAccountId);
      if (data.fromSubAccountId !== undefined && headers.indexOf('subAccountId') !== -1)
        sheet.getRange(rowNum, headers.indexOf('subAccountId') + 1).setValue(data.fromSubAccountId || '');
    } else {
      if (data.toAccountId !== undefined) sheet.getRange(rowNum, accCol + 1).setValue(data.toAccountId);
      if (data.toSubAccountId !== undefined && headers.indexOf('subAccountId') !== -1)
        sheet.getRange(rowNum, headers.indexOf('subAccountId') + 1).setValue(data.toSubAccountId || '');
    }
    sheet.getRange(rowNum, headers.indexOf('updatedAt') + 1).setValue(now);
  }
  return { ok: true };
}

// ── Preferences ───────────────────────────────────────────────

function getOrCreatePreferencesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.PREFERENCES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.PREFERENCES);
    sheet.appendRow(['key', 'value']);
  }
  return sheet;
}

function getPreferences() {
  const sheet = getOrCreatePreferencesSheet();
  return { data: sheetToObjects(sheet) };
}

function setPreference(key, value) {
  const sheet = getOrCreatePreferencesSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const keyCol = headers.indexOf('key');
  const valCol = headers.indexOf('value');
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][keyCol] === key) {
      sheet.getRange(i + 1, valCol + 1).setValue(value);
      return { ok: true };
    }
  }
  sheet.appendRow([key, value]);
  return { ok: true };
}

function deleteTransaction(id) {
  const sheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const rows = sheet.getDataRange().getValues();
  const idCol = rows[0].indexOf('id');

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === id) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { error: 'Transaction not found: ' + id };
}

// ── Categories ────────────────────────────────────────────────

function getCategories() {
  return { data: sheetToObjects(getSheet(SHEET_NAMES.CATEGORIES)) };
}

function addCategory(data) {
  const sheet = getSheet(SHEET_NAMES.CATEGORIES);
  const id = generateId('cat');
  sheet.appendRow([id, data.name, data.color || '#6B7280', data.icon || '📁', data.type || 'expense', false, data.parentId || '']);
  return { ok: true, id: id };
}

function updateCategory(id, data) {
  const sheet = getSheet(SHEET_NAMES.CATEGORIES);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol = headers.indexOf('id');

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === id) {
      const rowNum = i + 1;
      if (data.name !== undefined) sheet.getRange(rowNum, headers.indexOf('name') + 1).setValue(data.name);
      if (data.color !== undefined) sheet.getRange(rowNum, headers.indexOf('color') + 1).setValue(data.color);
      if (data.icon !== undefined) sheet.getRange(rowNum, headers.indexOf('icon') + 1).setValue(data.icon);
      if (data.type !== undefined) sheet.getRange(rowNum, headers.indexOf('type') + 1).setValue(data.type);
      return { ok: true };
    }
  }
  return { error: 'Category not found: ' + id };
}

function deleteCategory(id) {
  const sheet = getSheet(SHEET_NAMES.CATEGORIES);
  const rows = sheet.getDataRange().getValues();
  const idCol = rows[0].indexOf('id');

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === id) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { error: 'Category not found: ' + id };
}

function reorderCategories(ids) {
  const sheet = getSheet(SHEET_NAMES.CATEGORIES);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = rows.slice(1);
  const idCol = headers.indexOf('id');

  // Build id -> row map
  const rowMap = {};
  data.forEach(function(row) { rowMap[row[idCol]] = row; });

  // Clear all data rows
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  // Re-append in new order (skip unknown ids)
  ids.forEach(function(id) {
    if (rowMap[id]) sheet.appendRow(rowMap[id]);
  });

  // Append any rows not in the ids list at the end
  data.forEach(function(row) {
    if (ids.indexOf(row[idCol]) === -1) sheet.appendRow(row);
  });

  return { ok: true };
}

// ── Accounts ──────────────────────────────────────────────────

function getAccounts() {
  return { data: sheetToObjects(getSheet(SHEET_NAMES.ACCOUNTS)) };
}

function addAccount(data) {
  const sheet = getSheet(SHEET_NAMES.ACCOUNTS);
  const id = generateId('acc');
  sheet.appendRow([id, data.name, data.color || '#6B7280', data.icon || '💳', data.type || 'bank', data.initialBalance || 0, false, data.parentId || '']);
  return { ok: true, id: id };
}

function updateAccount(id, data) {
  const sheet = getSheet(SHEET_NAMES.ACCOUNTS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol = headers.indexOf('id');

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === id) {
      const rowNum = i + 1;
      if (data.name !== undefined) sheet.getRange(rowNum, headers.indexOf('name') + 1).setValue(data.name);
      if (data.color !== undefined) sheet.getRange(rowNum, headers.indexOf('color') + 1).setValue(data.color);
      if (data.icon !== undefined) sheet.getRange(rowNum, headers.indexOf('icon') + 1).setValue(data.icon);
      if (data.type !== undefined) sheet.getRange(rowNum, headers.indexOf('type') + 1).setValue(data.type);
      if (data.initialBalance !== undefined) sheet.getRange(rowNum, headers.indexOf('initialBalance') + 1).setValue(data.initialBalance);
      if (data.parentId !== undefined && headers.indexOf('parentId') !== -1) {
        sheet.getRange(rowNum, headers.indexOf('parentId') + 1).setValue(data.parentId || '');
      }
      return { ok: true };
    }
  }
  return { error: 'Account not found: ' + id };
}

function deleteAccount(id) {
  const sheet = getSheet(SHEET_NAMES.ACCOUNTS);
  const rows = sheet.getDataRange().getValues();
  const idCol = rows[0].indexOf('id');

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === id) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { error: 'Account not found: ' + id };
}

// ── Helpers ───────────────────────────────────────────────────

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const tz = Session.getScriptTimeZone();
  return data.slice(1).map(function (row) {
    const obj = {};
    headers.forEach(function (header, i) {
      var val = row[i];
      // Normalize Date objects → 'YYYY-MM-DD' strings so the frontend
      // string-comparison (t.date === '2024-01-15') always works.
      if (val instanceof Date && !isNaN(val.getTime())) {
        val = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
      }
      obj[header] = val;
    });
    return obj;
  });
}

function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function corsResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Seed Default Data ─────────────────────────────────────────
// Run this function ONCE manually from the Apps Script editor
// after creating the three sheets with correct headers.

function seedDefaultData() {
  seedCategories();
  seedAccounts();
  Logger.log('Seed complete!');
}

function seedCategories() {
  const sheet = getSheet(SHEET_NAMES.CATEGORIES);
  // Clear existing data except header
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  const defaults = [
    ['cat_housing',    'Housing',       '#EF4444', '🏠', 'expense', true],
    ['cat_food',       'Food & Dining', '#F97316', '🍽️', 'expense', true],
    ['cat_groceries',  'Groceries',     '#84CC16', '🛒', 'expense', true],
    ['cat_transport',  'Transport',     '#3B82F6', '🚗', 'expense', true],
    ['cat_leisure',    'Leisure',       '#A855F7', '🎮', 'expense', true],
    ['cat_health',     'Health',        '#EC4899', '💊', 'expense', true],
    ['cat_utilities',  'Utilities',     '#14B8A6', '💡', 'expense', true],
    ['cat_shopping',   'Shopping',      '#F59E0B', '🛍️', 'expense', true],
    ['cat_education',  'Education',     '#6366F1', '📚', 'expense', true],
    ['cat_salary',     'Salary',        '#22C55E', '💼', 'income',  true],
    ['cat_freelance',  'Freelance',     '#10B981', '💻', 'income',  true],
    ['cat_investment', 'Investment',    '#0EA5E9', '📈', 'income',  true],
    ['cat_gift',       'Gift',          '#F43F5E', '🎁', 'both',    true],
    ['cat_other',      'Other',         '#6B7280', '📦', 'both',    true],
  ];

  defaults.forEach(function (row) {
    sheet.appendRow(row);
  });
}

function seedAccounts() {
  const sheet = getSheet(SHEET_NAMES.ACCOUNTS);
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  const defaults = [
    ['acc_cash',   'Cash',           '#22C55E', '💵', 'cash',   0, true],
    ['acc_bank',   'Bank Account',   '#3B82F6', '🏦', 'bank',   0, true],
    ['acc_credit', 'Credit Card',    '#EF4444', '💳', 'credit', 0, true],
    ['acc_saving', 'Savings',        '#A855F7', '🐷', 'bank',   0, true],
  ];

  defaults.forEach(function (row) {
    sheet.appendRow(row);
  });
}

// ── Sub-category Column Migration ────────────────────────────
// Run once after updating Code.gs to add the new columns to existing sheets.

function addSubCategoryColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Add parentId to Categories (column G)
  var catSheet = ss.getSheetByName('Categories');
  var catHeaders = catSheet.getRange(1, 1, 1, catSheet.getLastColumn()).getValues()[0];
  if (catHeaders.indexOf('parentId') === -1) {
    catSheet.getRange(1, catSheet.getLastColumn() + 1).setValue('parentId');
    Logger.log('Added parentId column to Categories');
  }

  // Add subCategoryId to Transactions (column J)
  var txSheet = ss.getSheetByName('Transactions');
  var txHeaders = txSheet.getRange(1, 1, 1, txSheet.getLastColumn()).getValues()[0];
  if (txHeaders.indexOf('subCategoryId') === -1) {
    txSheet.getRange(1, txSheet.getLastColumn() + 1).setValue('subCategoryId');
    Logger.log('Added subCategoryId column to Transactions');
  }

  Logger.log('Migration complete!');
}

// ── Sub-account Column Migration ──────────────────────────────
// Run once after updating Code.gs to add parentId to Accounts
// and subAccountId to Transactions.

function addSubAccountColumns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Add parentId to Accounts
  var accSheet = ss.getSheetByName('Accounts');
  var accHeaders = accSheet.getRange(1, 1, 1, accSheet.getLastColumn()).getValues()[0];
  if (accHeaders.indexOf('parentId') === -1) {
    accSheet.getRange(1, accSheet.getLastColumn() + 1).setValue('parentId');
    Logger.log('Added parentId column to Accounts');
  }

  // Add subAccountId to Transactions
  var txSheet = ss.getSheetByName('Transactions');
  var txHeaders = txSheet.getRange(1, 1, 1, txSheet.getLastColumn()).getValues()[0];
  if (txHeaders.indexOf('subAccountId') === -1) {
    txSheet.getRange(1, txSheet.getLastColumn() + 1).setValue('subAccountId');
    Logger.log('Added subAccountId column to Transactions');
  }

  Logger.log('Sub-account migration complete!');
}

// ── Transfer Column Migration ──────────────────────────────────
// Run once to add transferId, fromAccountId, toAccountId to Transactions.

function addTransferColumns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName('Transactions');
  var headers = txSheet.getRange(1, 1, 1, txSheet.getLastColumn()).getValues()[0];
  ['transferId', 'fromAccountId', 'toAccountId'].forEach(function(col) {
    if (headers.indexOf(col) === -1) {
      txSheet.getRange(1, txSheet.getLastColumn() + 1).setValue(col);
      Logger.log('Added ' + col + ' to Transactions');
    }
  });
  Logger.log('Transfer migration complete!');
}

// ── scheduleId Column Migration ───────────────────────────────
// Run once to add scheduleId to Transactions (links a transaction to the schedule that created it).
function addScheduleIdColumn() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) { Logger.log('Transactions sheet not found'); return; }
  var headers = txSheet.getRange(1, 1, 1, txSheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('scheduleId') === -1) {
    txSheet.getRange(1, txSheet.getLastColumn() + 1).setValue('scheduleId');
    Logger.log('Added scheduleId column to Transactions');
  } else {
    Logger.log('scheduleId column already exists');
  }
}

// Run once after updating Code.gs to add currency + exchangeRate columns to existing Transactions sheet.
function addCurrencyColumns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) { Logger.log('Transactions sheet not found'); return; }
  var headers = txSheet.getRange(1, 1, 1, txSheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('currency') === -1) {
    txSheet.getRange(1, txSheet.getLastColumn() + 1).setValue('currency');
    Logger.log('Added currency column to Transactions');
  }
  if (headers.indexOf('exchangeRate') === -1) {
    txSheet.getRange(1, txSheet.getLastColumn() + 1).setValue('exchangeRate');
    // Default existing rows to exchangeRate = 1
    var lastRow = txSheet.getLastRow();
    if (lastRow > 1) {
      var col = txSheet.getLastColumn();
      txSheet.getRange(2, col, lastRow - 1, 1).setValue(1);
    }
    Logger.log('Added exchangeRate column to Transactions');
  }
  Logger.log('Done');
}

// ── Schedules ─────────────────────────────────────────────────
// Columns: id | name | amount | type | categoryId | accountId | note | frequency | startDate | nextDate | endDate | isActive | createdAt

function getSchedules() {
  return { data: sheetToObjects(getSheet(SHEET_NAMES.SCHEDULES)) };
}

function addSchedule(data) {
  const sheet = getSheet(SHEET_NAMES.SCHEDULES);
  const id = generateId('sch');
  const now = new Date().toISOString();
  sheet.appendRow([
    id,
    data.name || '',
    data.amount,
    data.type,
    data.categoryId || '',
    data.accountId || '',
    data.note || '',
    data.frequency,
    data.startDate,
    data.startDate,   // nextDate starts as startDate
    data.endDate || '',
    true,             // isActive
    now,
  ]);
  return { ok: true, id: id };
}

function updateSchedule(id, data) {
  const sheet = getSheet(SHEET_NAMES.SCHEDULES);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol = headers.indexOf('id');

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === id) {
      const rowNum = i + 1;
      const fields = ['name','amount','type','categoryId','accountId','note','frequency','startDate','nextDate','endDate','isActive'];
      fields.forEach(function(f) {
        if (data[f] !== undefined) {
          sheet.getRange(rowNum, headers.indexOf(f) + 1).setValue(data[f]);
        }
      });
      return { ok: true };
    }
  }
  return { error: 'Schedule not found: ' + id };
}

function deleteSchedule(id, deleteTxns) {
  // Optionally delete all transactions created by this schedule
  if (deleteTxns) {
    const txSheet = getSheet(SHEET_NAMES.TRANSACTIONS);
    const txRows = txSheet.getDataRange().getValues();
    const txHeaders = txRows[0];
    const schIdCol = txHeaders.indexOf('scheduleId');
    if (schIdCol !== -1) {
      // Collect rows to delete (largest index first to avoid row shifting)
      var toDelete = [];
      for (var j = 1; j < txRows.length; j++) {
        if (txRows[j][schIdCol] === id) {
          toDelete.push(j + 1); // 1-indexed sheet row
        }
      }
      for (var k = toDelete.length - 1; k >= 0; k--) {
        txSheet.deleteRow(toDelete[k]);
      }
    }
  }

  const sheet = getSheet(SHEET_NAMES.SCHEDULES);
  const rows = sheet.getDataRange().getValues();
  const idCol = rows[0].indexOf('id');
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === id) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { error: 'Schedule not found: ' + id };
}

// Returns how many transactions were created by the given schedule
function getScheduleTransactionCount(scheduleId) {
  const txSheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const txRows = txSheet.getDataRange().getValues();
  const txHeaders = txRows[0];
  const schIdCol = txHeaders.indexOf('scheduleId');
  if (schIdCol === -1) return { count: 0 };
  var count = 0;
  for (var i = 1; i < txRows.length; i++) {
    if (txRows[i][schIdCol] === scheduleId) count++;
  }
  return { count: count };
}

// Google Sheets getValues() returns date cells as Date objects, not strings.
// This helper normalizes them to 'yyyy-MM-dd' for safe string comparisons.
function normDateStr(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val).substring(0, 10); // handles 'yyyy-MM-ddTHH:...' too
}

// Called on app load (and after creating a new schedule) — creates transactions
// for any overdue schedules and advances their nextDate past today.
function applyDueSchedules() {
  const tz = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');

  const schedSheet = getSheet(SHEET_NAMES.SCHEDULES);
  const txSheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const rows = schedSheet.getDataRange().getValues();
  const headers = rows[0];

  const col = {};
  headers.forEach(function(h, i) { col[h] = i; });

  // Get the transaction sheet headers once (for scheduleId column lookup)
  const txHeaders = txSheet.getRange(1, 1, 1, txSheet.getLastColumn()).getValues()[0];
  const schIdCol = txHeaders.indexOf('scheduleId'); // -1 if column not added yet

  const applied = [];

  for (var i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[col['isActive']]) continue;

    // Normalize dates — Sheets returns Date objects, not strings
    const endDate = normDateStr(row[col['endDate']]);
    if (endDate && endDate < today) continue;  // schedule fully expired

    var nextDate = normDateStr(row[col['nextDate']]);
    if (!nextDate || nextDate > today) continue; // not due yet

    const frequency = row[col['frequency']];
    const scheduleId = row[col['id']];

    // Apply all missed periods up to and including today
    while (nextDate <= today) {
      if (endDate && nextDate > endDate) break;

      const now = new Date().toISOString();
      const txId = generateId('txn');
      txSheet.appendRow([
        txId,
        nextDate,
        row[col['amount']],
        row[col['type']],
        row[col['categoryId']] || '',
        row[col['accountId']] || '',
        'Schedule: ' + (row[col['name']] || '') + (row[col['note']] ? ' · ' + row[col['note']] : ''),
        now,
        now,
      ]);
      // Write scheduleId to the correct column (header-aware, safe for existing sheets)
      if (schIdCol !== -1) {
        txSheet.getRange(txSheet.getLastRow(), schIdCol + 1).setValue(scheduleId);
      }

      applied.push({ scheduleId: scheduleId, transactionId: txId, date: nextDate });
      nextDate = advanceDate(nextDate, frequency);
    }

    // Save updated nextDate back to the schedule row
    schedSheet.getRange(i + 1, col['nextDate'] + 1).setValue(nextDate);
  }

  return { ok: true, applied: applied };
}

function advanceDate(dateStr, frequency) {
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid DST shifts
  switch (frequency) {
    case 'daily':     d.setDate(d.getDate() + 1);         break;
    case 'weekly':    d.setDate(d.getDate() + 7);         break;
    case 'biweekly':  d.setDate(d.getDate() + 14);        break;
    case 'monthly':   d.setMonth(d.getMonth() + 1);       break;
    case 'yearly':    d.setFullYear(d.getFullYear() + 1); break;
  }
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// ── Fix Headers (run once if headers are missing) ─────────────
// Run this if you seeded data before running setupSheets().
// It inserts the correct header row at row 1 of each sheet.

function fixHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  function insertHeaders(name, headers) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) { Logger.log('Sheet not found: ' + name); return; }
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    Logger.log('Headers fixed for: ' + name);
  }

  insertHeaders('Transactions', ['id', 'date', 'amount', 'type', 'categoryId', 'accountId', 'note', 'createdAt', 'updatedAt']);
  insertHeaders('Categories',   ['id', 'name', 'color', 'icon', 'type', 'isDefault']);
  insertHeaders('Accounts',     ['id', 'name', 'color', 'icon', 'type', 'initialBalance', 'isDefault']);

  Logger.log('All headers fixed!');
}

// ── Sheet Setup Helper ────────────────────────────────────────
// Run this to create the sheets and headers if they don't exist yet.

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  function ensureSheet(name, headers) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }
    return sheet;
  }

  ensureSheet(SHEET_NAMES.TRANSACTIONS, ['id', 'date', 'amount', 'type', 'categoryId', 'accountId', 'note', 'createdAt', 'updatedAt', 'subCategoryId', 'currency', 'exchangeRate', 'subAccountId', 'transferId', 'fromAccountId', 'toAccountId', 'scheduleId']);
  ensureSheet(SHEET_NAMES.CATEGORIES,   ['id', 'name', 'color', 'icon', 'type', 'isDefault', 'parentId']);
  ensureSheet(SHEET_NAMES.ACCOUNTS,     ['id', 'name', 'color', 'icon', 'type', 'initialBalance', 'isDefault']);
  ensureSheet(SHEET_NAMES.SCHEDULES,    ['id', 'name', 'amount', 'type', 'categoryId', 'accountId', 'note', 'frequency', 'startDate', 'nextDate', 'endDate', 'isActive', 'createdAt']);

  Logger.log('Sheets set up successfully!');
}
