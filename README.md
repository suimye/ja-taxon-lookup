# JSNENTax

日本語名から**種名・png名・英名・Taxid**を取得するツール。

Wikipedia / Wikidata を経由して情報を取得します。

---

## ダウンロード（アプリ）

**[→ Releases ページからダウンロード](../../releases/latest)**

| ファイル | 対象 |
|---------|------|
| `JSNENTax-x.x.x-arm64.dmg` | Mac（Apple Silicon: M1/M2/M3） |
| `JSNENTax-x.x.x.dmg`       | Mac（Intel） |

### インストール手順（Mac）

1. DMGをダブルクリック
2. `JSNENTax` を Applications フォルダへドラッグ
3. Applications から `JSNENTax` をダブルクリックして起動

> **初回起動時**：「開発元が未確認」と表示された場合は、
> アイコンを**右クリック → 「開く」** を選択してください。

---

## 使い方

1. 左の入力欄に日本語名を **1行1件** で入力（コピー&ペースト可）
2. 「検索実行」ボタンをクリック
3. 結果が順次表示される
4. 「TSVをコピー」または「TSVを保存」でエクスポート

### 出力形式（タブ区切りTSV）

| 日本語名 | 種名 | png名 | 英名 | Taxid |
|---------|------|-------|------|-------|
| ハナミズキ | Cornus florida | cornus_florida.png | flowering dogwood | 4283 |

- 該当なし → `NA`
- 英名が複数ある場合はスペース区切り

---

## コマンドライン版

```bash
echo -e "ハナミズキ\nアキニレ" | node jsnentax.js
```

---

## 開発者向け（ソースからビルド）

```bash
npm install
npm start          # 開発起動
npm run build:mac  # Mac用DMGを生成（dist/フォルダ）
npm run build:win  # Windows用インストーラを生成
```
