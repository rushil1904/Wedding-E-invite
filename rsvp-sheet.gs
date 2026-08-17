/**
 * Wedding RSVP → Google Sheet
 * =============================================================================
 * SETUP (about two minutes)
 *
 *  1. Create a Google Sheet. Name it whatever you like.
 *  2. Extensions → Apps Script. Delete the placeholder and paste this file in.
 *  3. Deploy → New deployment → gear icon → Web app.
 *       Execute as:      Me
 *       Who has access:  Anyone            ← must be "Anyone", not "Anyone with
 *                                            a Google account", or guests get a
 *                                            login wall instead of an RSVP.
 *  4. Authorise it when prompted (it is your own script writing to your own
 *     sheet; the "unverified app" warning is expected — Advanced → Go to …).
 *  5. Copy the deployment's /exec URL into `rsvpEndpoint` in config.js.
 *
 *  To check it is live, open the /exec URL in a browser: it should reply
 *  {"ok":true,...} rather than an error page.
 *
 *  After editing this script, use Deploy → Manage deployments → edit → Version:
 *  New version. Without that the old code keeps serving.
 * =============================================================================
 */

var SHEET_NAME = 'RSVPs';
var HEADERS = ['Submitted', 'ID', 'Name', 'Guests', 'Celebrations', 'Team'];

function doPost(e) {
  // Guests can submit at the same moment; the lock stops two writes landing
  // on the same row.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json({ ok: false, error: 'busy' });
  }

  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // honeypot: a real guest never fills this, so accept and discard silently
    if (data.hp) return json({ ok: true });
    if (!data.name) return json({ ok: false, error: 'name required' });

    var row = [
      new Date(),
      String(data.id || ''),
      String(data.name).slice(0, 120),
      Number(data.guests) || 1,
      (data.celebrations || []).join(', '),
      String(data.team || ''),
    ];

    var sheet = getSheet();
    var at = findRowById(sheet, row[1]);
    if (at > 0) {
      sheet.getRange(at, 1, 1, row.length).setValues([row]);   // an update
    } else {
      sheet.appendRow(row);
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Opening the /exec URL in a browser should confirm the endpoint is alive. */
function doGet() {
  return json({ ok: true, note: 'RSVP endpoint is live' });
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Row number for a submission id, or -1. Lets a guest correct their RSVP. */
function findRowById(sheet, id) {
  if (!id) return -1;
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, 2, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
