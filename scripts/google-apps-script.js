/**
 * Google Sheets + Apps Script setup
 * ---------------------------------
 * 1. Create a Google Sheet with headers in row 1:
 *    Timestamp | Name | Phone | Email | Source | Page
 *
 * 2. Extensions → Apps Script → paste this file → Save
 *
 * 3. Deploy → New deployment → Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 *
 * 4. Copy the Web App URL into js/config.js → googleScriptUrl
 *
 * 5. After editing this script later, Deploy → Manage deployments → Edit → New version
 */

const SHEET_NAME = "Leads";

function doPost(e) {
  try {
    const raw = e.postData && e.postData.contents ? e.postData.contents : "{}";
    const data = JSON.parse(raw);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(["Timestamp", "Name", "Phone", "Email", "Source", "Page"]);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Name", "Phone", "Email", "Source", "Page"]);
    }

    sheet.appendRow([
      data.submittedAt || new Date().toISOString(),
      data.name || "",
      data.phone || "",
      data.email || "",
      data.source || "",
      data.page || "",
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: "Bybit Analytics lead endpoint" }))
    .setMimeType(ContentService.MimeType.JSON);
}
