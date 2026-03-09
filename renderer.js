'use strict';

const HEADERS = ['日本語名', '種名', 'png名', '英名', 'Taxid'];

const inputArea   = document.getElementById('input-area');
const runBtn      = document.getElementById('run-btn');
const clearBtn    = document.getElementById('clear-btn');
const copyBtn     = document.getElementById('copy-btn');
const saveBtn     = document.getElementById('save-btn');
const statusEl    = document.getElementById('status');
const progressBar = document.getElementById('progress-bar');
const resultBody  = document.getElementById('result-body');
const resultCount = document.getElementById('result-count');

let results = []; // { jaName, scientificName, pngName, englishNames, taxid }

function setStatus(msg) { statusEl.textContent = msg; }

function setProgress(done, total) {
  progressBar.style.width = total > 0 ? `${Math.round((done / total) * 100)}%` : '0%';
}

function makeCell(text) {
  const td = document.createElement('td');
  if (!text || text === 'NA') {
    td.textContent = text || 'NA';
    td.className = 'na';
  } else {
    td.textContent = text;
  }
  return td;
}

function appendRow(r, rowEl) {
  rowEl.innerHTML = '';
  [r.jaName, r.scientificName, r.pngName, r.englishNames, r.taxid].forEach((v, i) => {
    const td = makeCell(v);
    rowEl.appendChild(td);
  });
  rowEl.classList.remove('loading');
}

function buildTSV() {
  const lines = [HEADERS.join('\t')];
  for (const r of results) {
    lines.push([r.jaName, r.scientificName, r.pngName, r.englishNames, r.taxid].join('\t'));
  }
  return lines.join('\n');
}

runBtn.addEventListener('click', async () => {
  const names = inputArea.value.split('\n').map(s => s.trim()).filter(Boolean);
  if (names.length === 0) { setStatus('日本語名を入力してください。'); return; }

  // Reset
  results = [];
  resultBody.innerHTML = '';
  copyBtn.disabled = true;
  saveBtn.disabled = true;
  runBtn.disabled = true;
  setProgress(0, names.length);
  resultCount.textContent = `結果: 0 / ${names.length} 件`;

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    setStatus(`処理中 (${i + 1}/${names.length}): ${name}`);

    // Add placeholder row
    const tr = document.createElement('tr');
    tr.className = 'loading';
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = `${name} を検索中...`;
    tr.appendChild(td);
    resultBody.appendChild(tr);
    tr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const r = await window.api.processName(name);
    results.push(r);
    appendRow(r, tr);

    setProgress(i + 1, names.length);
    resultCount.textContent = `結果: ${i + 1} / ${names.length} 件`;
  }

  setStatus(`完了: ${names.length} 件処理しました。`);
  runBtn.disabled = false;
  copyBtn.disabled = false;
  saveBtn.disabled = false;
});

clearBtn.addEventListener('click', () => {
  inputArea.value = '';
  results = [];
  resultBody.innerHTML = '<tr class="loading"><td colspan="5" class="empty-state">まだ検索が実行されていません。</td></tr>';
  resultCount.textContent = '結果: 0 件';
  copyBtn.disabled = true;
  saveBtn.disabled = true;
  setProgress(0, 0);
  setStatus('入力欄に日本語名を入力してください。');
});

copyBtn.addEventListener('click', async () => {
  const tsv = buildTSV();
  try {
    await navigator.clipboard.writeText(tsv);
    const orig = copyBtn.textContent;
    copyBtn.textContent = 'コピー完了!';
    setTimeout(() => { copyBtn.textContent = orig; }, 1500);
  } catch (e) {
    setStatus('コピーに失敗しました。');
  }
});

saveBtn.addEventListener('click', async () => {
  const tsv = buildTSV();
  const ok = await window.api.saveFile(tsv);
  if (ok) {
    const orig = saveBtn.textContent;
    saveBtn.textContent = '保存完了!';
    setTimeout(() => { saveBtn.textContent = orig; }, 1500);
  }
});
