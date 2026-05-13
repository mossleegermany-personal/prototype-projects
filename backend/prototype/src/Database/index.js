import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

async function getSheets() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function fetchRows(sheets, sheetName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:ZZ`,
  });
  return res.data.values || [];
}

function rowToObject(headers, row) {
  return Object.fromEntries(headers.map((h, i) => [h, row[i] ?? null]));
}

function objectToRow(headers, obj) {
  return headers.map((h) => obj[h] ?? '');
}

// Finds the row index (including header) matching { field: value }
function findRowIndex(rows, headers, match) {
  const [key, value] = Object.entries(match)[0];
  const colIdx = headers.indexOf(key);
  if (colIdx === -1) return -1;
  return rows.findIndex((r, i) => i > 0 && String(r[colIdx] ?? '') === String(value));
}

// Find one row — match e.g. { Email: 'a@b.com' } or { 'User ID': 1 }
export async function dbFind(sheetName, match) {
  const sheets = await getSheets();
  const rows = await fetchRows(sheets, sheetName);
  if (rows.length === 0) return null;
  const headers = rows[0];
  const rowIndex = findRowIndex(rows, headers, match);
  return rowIndex === -1 ? null : rowToObject(headers, rows[rowIndex]);
}

// Insert a new row — auto-increments first column if omitted; auto-fills Date/Time if those headers exist
export async function dbCreate(sheetName, data) {
  const sheets = await getSheets();
  const rows = await fetchRows(sheets, sheetName);
  const headers = rows[0] || [];
  const idKey = headers[0];
  const payload = { ...data };

  if (idKey && !payload[idKey]) {
    const ids = rows.slice(1).map((r) => parseInt(r[0], 10)).filter((n) => !isNaN(n));
    payload[idKey] = ids.length > 0 ? Math.max(...ids) + 1 : 1;
  }

  const now = new Date();
  if (headers.includes('Date') && !payload['Date']) payload['Date'] = now.toISOString().split('T')[0];
  if (headers.includes('Time') && !payload['Time']) payload['Time'] = now.toTimeString().split(' ')[0];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [objectToRow(headers, payload)] },
  });

  return rowToObject(headers, objectToRow(headers, payload));
}

// Update a row matched by { field: value }, applying only the provided updates
export async function dbUpdate(sheetName, match, updates) {
  const sheets = await getSheets();
  const rows = await fetchRows(sheets, sheetName);
  if (rows.length === 0) return null;
  const headers = rows[0];
  const rowIndex = findRowIndex(rows, headers, match);
  if (rowIndex === -1) return null;

  const merged = { ...rowToObject(headers, rows[rowIndex]), ...updates };
  const updatedRow = objectToRow(headers, merged);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIndex + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updatedRow] },
  });

  return rowToObject(headers, updatedRow);
}

// Delete the row matched by { field: value }
export async function dbRemove(sheetName, match) {
  const sheets = await getSheets();
  const rows = await fetchRows(sheets, sheetName);
  if (rows.length === 0) return false;
  const headers = rows[0];
  const rowIndex = findRowIndex(rows, headers, match);
  if (rowIndex === -1) return false;

  const metaRes = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetId = metaRes.data.sheets.find(
    (s) => s.properties.title === sheetName
  ).properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 },
        },
      }],
    },
  });

  return true;
}
