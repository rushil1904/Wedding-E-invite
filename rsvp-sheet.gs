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
 *  {"ok":true,...} rather than an error page. If you instead see "Sorry,
 *  unable to open the file at this time", you are almost certainly signed
 *  into more than one Google account — try an incognito window.
 *
 *  Rows go to a tab named "RSVPs", which the script creates on first use.
 *  If the sheet looks empty, check the tabs along the bottom before anything
 *  else — a fresh sheet opens on "Sheet1", which stays empty forever.
 *
 *  After editing this script, use Deploy → Manage deployments → edit → Version:
 *  New version. Without that the old code keeps serving.
 * =============================================================================
 */

var SHEET_NAME = 'RSVPs';
var HEADERS = ['Submitted', 'ID', 'Name', 'Guests', 'Celebrations', 'Side', 'Team', 'Flag'];

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

    if (!data.name) return json({ ok: false, error: 'name required' });

    /* The honeypot FLAGS a row, it never drops it. Browser autofill has been
       known to fill off-screen inputs, and silently discarding a real RSVP
       because of that is far worse than a flagged row you can glance at. */
    var flag = data.hp ? 'check — honeypot filled' : '';

    var row = [
      new Date(),
      String(data.id || ''),
      String(data.name).slice(0, 120),
      Number(data.guests) || 1,
      (data.celebrations || []).join(', '),
      String(data.side || ''),          // which invitation they came from
      String(data.team || ''),
      flag,
    ];

    var sheet = getSheet();
    var at = findRowById(sheet, row[1]);
    if (at > 0) {
      sheet.getRange(at, 1, 1, row.length).setValues([row]);   // an update
    } else {
      sheet.appendRow(row);
      at = sheet.getLastRow();
    }

    /* Reporting where the row landed turns "it said saved but I see nothing"
       into a one-request answer: wrong tab, or wrong spreadsheet. */
    return json({
      ok: true,
      spreadsheet: SpreadsheetApp.getActiveSpreadsheet().getName(),
      sheet: sheet.getName(),
      row: at,
      flagged: !!flag,
    });
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

/**
 * DIAGNOSTIC — run this from the editor (select whereAmI → Run) and read the
 * execution log. It needs no deployment, so it always reflects the code in
 * front of you rather than whatever version is currently published.
 *
 * It answers the only question that matters when the sheet looks empty:
 * which file is this script actually writing to?
 */
function whereAmI() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('NOT BOUND to a spreadsheet. This is a standalone script — ' +
               'open the sheet you want, use Extensions > Apps Script, and ' +
               'paste this file in there instead.');
    return;
  }
  Logger.log('Writing to file: ' + ss.getName());
  Logger.log('URL: ' + ss.getUrl());
  var names = ss.getSheets().map(function (sh) {
    return sh.getName() + ' (' + sh.getLastRow() + ' rows)';
  });
  Logger.log('Tabs: ' + names.join(' | '));
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
