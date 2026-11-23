# Connect Gmail (nick@advisorbooking.com) to the Command Center

About 5 minutes. No Google Cloud project, no API console. A small Apps Script runs inside
your own Google account and answers one question: "show me the recent emails with these
prospect addresses." It can only read. It cannot send, draft, label or delete.

Do every step signed in to Google as **nick@advisorbooking.com** only. If Chrome is signed in to
several Google accounts, use a private window so the script is not created in the wrong one.

## 1. Create the script

1. Go to https://script.google.com and click **New project**.
2. Rename it (top left): `Advisor Booking Gmail bridge`.
3. Delete everything in `Code.gs` and paste the whole of `Code.gs` from this folder.
4. Click the gear (**Project Settings**), tick **Show "appsscript.json" manifest file in editor**.
   Go back to the editor, open `appsscript.json`, replace everything with this folder's
   `appsscript.json`. This limits the script to read-only Gmail access.

## 2. Save the key

1. Still in **Project Settings**, scroll to **Script Properties**, click **Add script property**.
2. Property: `BRIDGE_KEY`. Value: the key from your private setup sheet (Claude sends it to you
   as a file, never in chat). Click **Save script properties**.

## 3. Allow Gmail read access

1. In the editor, pick `testRead` in the function menu and click **Run**.
2. Google asks for permission. Choose nick@advisorbooking.com. If you see "Google hasn't verified
   this app", click **Advanced**, then **Go to Advisor Booking Gmail bridge**. It is your own script.
3. The permission screen should say **View your email messages and settings**. That is read only.
   Click **Allow**. The log shows "Gmail read works".

## 4. Publish it as a web address

1. Click **Deploy**, then **New deployment**. Gear icon, choose **Web app**.
2. Execute as: **Me (nick@advisorbooking.com)**. Who has access: **Anyone**.
   ("Anyone" is needed so the 7am refresh can reach it without a Google login. Without the key it
   answers "bad key" and shows nothing.)
3. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
4. Paste that URL to Claude in the chat. The URL alone reads nothing.

## Turning it off

Deploy, Manage deployments, Archive. Or delete the project. Access ends at once.
To rotate the key, change `BRIDGE_KEY` in Script Properties and give Claude the new setup sheet.
