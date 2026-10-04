// elya/drive.js — Upload de fichiers vers Google Drive (compte de service).
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
const GOOGLE_SERVICE_ACCOUNT_BASE64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 || '';

export async function uploadToDrive(buffer, filename, mimeType) {
  if (!GOOGLE_SERVICE_ACCOUNT_BASE64) {
    const err = new Error('not_configured');
    err.code = 'not_configured';
    throw err;
  }
  const { google } = await import('googleapis');
  const { Readable } = await import('stream');
  const credentials = JSON.parse(Buffer.from(GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.file'] });
  const drive = google.drive({ version: 'v3', auth });

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const created = await drive.files.create({
    requestBody: { name: filename, parents: GOOGLE_DRIVE_FOLDER_ID ? [GOOGLE_DRIVE_FOLDER_ID] : undefined },
    media: { mimeType, body: stream },
    fields: 'id, webViewLink',
  });
  await drive.permissions.create({
    fileId: created.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });
  return created.data.webViewLink;
}

export function isDriveConfigured() {
  return !!GOOGLE_SERVICE_ACCOUNT_BASE64;
}
