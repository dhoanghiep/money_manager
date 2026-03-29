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
    now,
    now,
  ]);
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
      sheet.getRange(rowNum, headers.indexOf('updatedAt') + 1).setValue(now);
      return { ok: true };
    }
  }
  return { error: 'Transaction not found: ' + id };
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
  sheet.appendRow([id, data.name, data.color || '#6B7280', data.icon || '📁', data.type || 'expense', false]);
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
  sheet.appendRow([id, data.name, data.color || '#6B7280', data.icon || '💳', data.type || 'bank', data.initialBalance || 0, false]);
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
  return data.slice(1).map(function (row) {
    const obj = {};
    headers.forEach(function (header, i) {
      obj[header] = row[i];
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

  ensureSheet(SHEET_NAMES.TRANSACTIONS, ['id', 'date', 'amount', 'type', 'categoryId', 'accountId', 'note', 'createdAt', 'updatedAt']);
  ensureSheet(SHEET_NAMES.CATEGORIES,   ['id', 'name', 'color', 'icon', 'type', 'isDefault']);
  ensureSheet(SHEET_NAMES.ACCOUNTS,     ['id', 'name', 'color', 'icon', 'type', 'initialBalance', 'isDefault']);

  Logger.log('Sheets set up successfully!');
}
