const { app, BrowserWindow, ipcMain, session } = require('electron'); 
const path = require('path');
const fetch = require('node-fetch'); // GA4
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// -------------------- GA4 Measurement Protocol Setup --------------------
const MEASUREMENT_ID = 'G-N37W7P80N8';       // Your GA4 Measurement ID
const API_SECRET = '-4qlikfLRAWINWjj-1QWVg'; // Your GA4 API secret
const clientIdFile = path.join(__dirname, 'client-id.txt');

let clientId;
if (fs.existsSync(clientIdFile)) {
  clientId = fs.readFileSync(clientIdFile, 'utf8');
} else {
  clientId = uuidv4();
  fs.writeFileSync(clientIdFile, clientId);
}

function sendEvent(eventName, params = {}) {
  fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`, {
    method: 'POST',
    body: JSON.stringify({
      client_id: clientId,
      events: [{ name: eventName, params }]
    })
  }).catch(err => console.error('GA event error:', err));
}

// Example event tracking functions
function trackAppLaunch() { sendEvent('app_launch', { app_name: 'Nyx Browser' }); }
function trackStudySession() { sendEvent('study_session', { sessions_completed: 1 }); }
function trackNoteSaved() { sendEvent('note_saved', { notes_count: 1 }); }
function trackCO2Saved(amount) { sendEvent('co2_saved', { grams: amount }); }
// ------------------------------------------------------------------------

// -------------------- Ghostery EasyList Ad Blocker Setup --------------------
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const { fetchDocument } = require('@ghostery/adblocker-electron');
const { session: electronSession } = require('electron');

let adBlocker;

async function initAdBlocker() {
  try {
    adBlocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetchDocument);
    ElectronBlocker.enableBlockingInSession(electronSession.defaultSession, adBlocker);
    console.log('[AdBlocker] EasyList loaded successfully.');
  } catch (err) {
    console.error('[AdBlocker] Failed to load EasyList:', err);
  }
}
// ------------------------------------------------------------------------

let mainWindow;

const AD_BLOCK_DOMAINS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'adservice.google.com', 'facebook.com/tr', 'connect.facebook.net',
  'analytics.google.com', 'google-analytics.com', 'googletagmanager.com',
  'ads-twitter.com', 'static.ads-twitter.com', 'analytics.twitter.com',
  'ads.linkedin.com', 'ads.pinterest.com', 'ads.reddit.com'
];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    },
    backgroundColor: '#1a1a1a',
    icon: path.join(__dirname, 'icon.ico') // <-- your .ico
  });

  mainWindow.loadFile('index.html');

  // Track app launch
  trackAppLaunch();

  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    const url = details.url;
    const shouldBlock = AD_BLOCK_DOMAINS.some(domain => url.includes(domain));
    callback({ cancel: shouldBlock });
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  await initAdBlocker(); // Initialize EasyList blocker safely
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// -------------------- IPC Window Controls --------------------
ipcMain.handle('minimize-window', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.handle('maximize-window', () => {
  if (mainWindow) mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.handle('close-window', () => { if (mainWindow) mainWindow.close(); });
// ------------------------------------------------------------------------
