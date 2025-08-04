# Mentor Merlin NMC Flow Activity

This repository contains a small static website that allows participants to
practice arranging the steps of the Nursing and Midwifery Council (NMC)
registration process in the correct order.  Users are asked to enter
their name and email address, then drag and drop the tiles until they
believe the sequence is correct.  Once submitted, a message displays
immediately to indicate whether or not the order was correct and the
result is posted to a Google Sheet via a Google Apps Script web app.

## Running the site locally

The site is completely static — it consists of an `index.html` page,
a `style.css` file for styling, an `activity.js` script that handles
the drag‑and‑drop logic and submission, and an `assets` folder containing
the Mentor Merlin logo.  To run the site locally you can simply open
`index.html` in a web browser:

```bash
cd site
python3 -m http.server 8000
```

and then navigate to [http://localhost:8000](http://localhost:8000) in
your browser.

## Integrating with Google Sheets

By default the site posts each submission to a Google Apps Script
endpoint.  To make this work you need to create your own Google
Apps Script attached to a Google Sheet and deploy it as a web app.  The
Apps Script should be configured to accept POST requests containing
JSON data and append each submission to your sheet.  Below is a
minimal example of such a script:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const data = JSON.parse(e.postData.contents);
  // Append a new row: Name, Email, Result, Timestamp, Order as a string
  sheet.appendRow([
    data.name,
    data.email,
    data.result,
    data.timestamp,
    data.order.join(',')
  ]);
  return ContentService.createTextOutput('OK');
}

function doGet(e) {
  // Optional: return all rows as JSON for an admin dashboard
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const rows = sheet.getDataRange().getValues();
  // Skip header row if present
  const result = rows.slice(1).map((row) => {
    return {
      name: row[0],
      email: row[1],
      result: row[2],
      timestamp: row[3],
      order: row[4]
    };
  });
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

After saving the script, click **Deploy → New deployment** and choose
**Web app**.  Make sure to set **Execute as:** “Me” and **Who has
access:** “Anyone”.  Deploy the script and copy the generated script
identifier (it will look like `AKfycb...`).  Replace the
`YOUR_SCRIPT_ID` placeholder in `activity.js` with your actual
identifier.  Every time a user submits their attempt, a new row will
be appended to your sheet.

## Customising the steps

If the NMC process changes or you want to use the site for a different
sequence of steps, you can modify the `steps` array at the top of
`activity.js`.  Each step has a unique numeric `id` and a `text`
property.  The correct sequence is the order in which they appear
within the array.

## License

This project is provided for educational purposes and may be adapted
for your own use.  Mentor Merlin retains rights to the logo contained
in the `assets` folder.