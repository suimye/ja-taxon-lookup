'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');

// --- HTTP helper (follows redirects, adds User-Agent) ---

function fetchJSON(urlString) {
  return new Promise((resolve, reject) => {
    const fetch = (target) => {
      const u = new URL(target);
      const opts = {
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: { 'User-Agent': 'JSNENTax/1.0 (https://dbcls.rois.ac.jp)' },
      };
      https.get(opts, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetch(res.headers.location);
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
        });
      }).on('error', reject);
    };
    fetch(urlString);
  });
}

// --- API functions ---

async function getWikidataId(jaName) {
  const url = `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(jaName)}`;
  const data = await fetchJSON(url);
  return data.wikibase_item || null;
}

async function getWikidataInfo(qid) {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&format=json`;
  const data = await fetchJSON(url);
  const entity = data.entities && data.entities[qid];
  if (!entity) return null;

  const scientificName =
    entity.claims.P225 && entity.claims.P225[0].mainsnak.datavalue &&
    entity.claims.P225[0].mainsnak.datavalue.value;

  const taxid =
    entity.claims.P685 && entity.claims.P685[0].mainsnak.datavalue &&
    entity.claims.P685[0].mainsnak.datavalue.value;

  const englishNames = (entity.claims.P1843 || [])
    .map(c => c.mainsnak.datavalue && c.mainsnak.datavalue.value)
    .filter(v => v && v.language === 'en')
    .map(v => v.text);

  return { scientificName, taxid, englishNames };
}

async function processName(jaName) {
  try {
    const qid = await getWikidataId(jaName);
    if (!qid) {
      return { jaName, scientificName: 'NA', pngName: 'NA', englishNames: 'NA', taxid: 'NA' };
    }

    const info = await getWikidataInfo(qid);
    if (!info || !info.scientificName) {
      return { jaName, scientificName: 'NA', pngName: 'NA', englishNames: 'NA', taxid: 'NA' };
    }

    const { scientificName, taxid, englishNames } = info;
    const pngName = scientificName.replace(/\s+/g, '_').toLowerCase() + '.png';

    return {
      jaName,
      scientificName,
      pngName,
      englishNames: englishNames.length > 0 ? englishNames.join(' ') : 'NA',
      taxid: taxid || 'NA',
    };
  } catch (e) {
    return { jaName, scientificName: 'NA', pngName: 'NA', englishNames: 'NA', taxid: 'NA' };
  }
}

// --- Electron window ---

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '日本語名 → 種名・英名・Taxid 検索',
  });
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// --- IPC handlers ---

ipcMain.handle('process-name', async (_event, jaName) => {
  return await processName(jaName);
});

ipcMain.handle('save-file', async (_event, content) => {
  const { filePath } = await dialog.showSaveDialog({
    title: '結果を保存',
    defaultPath: 'result.tsv',
    filters: [{ name: 'TSVファイル', extensions: ['tsv'] }, { name: 'すべてのファイル', extensions: ['*'] }],
  });
  if (filePath) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
});
