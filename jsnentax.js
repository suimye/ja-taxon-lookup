#!/usr/bin/env node
'use strict';

const https = require('https');
const readline = require('readline');

// --- HTTP helper ---

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    if (!qid) return [jaName, 'NA', 'NA', 'NA', 'NA'];

    const info = await getWikidataInfo(qid);
    if (!info || !info.scientificName) return [jaName, 'NA', 'NA', 'NA', 'NA'];

    const { scientificName, taxid, englishNames } = info;
    const pngName = scientificName.replace(/\s+/g, '_').toLowerCase() + '.png';

    return [
      jaName,
      scientificName,
      pngName,
      englishNames.length > 0 ? englishNames.join(' ') : 'NA',
      taxid || 'NA',
    ];
  } catch (e) {
    process.stderr.write(`Error processing "${jaName}": ${e.message}\n`);
    return [jaName, 'NA', 'NA', 'NA', 'NA'];
  }
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });

  const lines = [];
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) lines.push(trimmed);
  }

  process.stdout.write(['日本語名', '種名', 'png名', '英名', 'Taxid'].join('\t') + '\n');

  for (const name of lines) {
    const result = await processName(name);
    process.stdout.write(result.join('\t') + '\n');
    await sleep(300);
  }
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
