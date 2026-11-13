# コードの担当と変更場所

フレームワーク・バンドラーは使わない。GitHub Pagesでそのまま配信するJavaScriptとCSSで構成する。機能や役割の境界が明確で、独立して検証できるところから分離する。関数ごとの細分化や、依頼に伴わない一括再構成は行わない。

| ファイル | 担当 |
|---|---|
| `slot-engine.js` | スロットの確率・配当設定、通常/フリー抽選、ライン/ANY配当、保存済みv1/v2/v3結果の検証。DOM・通信・ウォレット更新を持たない |
| `app.js` | 通常バトルなどのエンジン、Firebase接続と共通ウォレット/receipt処理、街・各機能の画面と演出 |
| `index.html` | 画面の土台、スクリプトの読み込み順、PWA更新の確認と安全な適用 |
| `style.css` | 共通と各機能の表示・スマホレイアウト |
| `sw.js` | 必須ファイルをまとめたキャッシュ、更新・オフライン時のシェル配信 |
| `gas/Engine.gs` | app.jsの通常バトルエンジンから同期するGAS版。スロットエンジンは含めない |

## スロットを変更するとき

- 確率・配当・BETの正本は `slot-engine.js` の `MojiSpinEngine.CONFIG`。画面側へ別の表を手書きしない。
- 画面・演出は `app.js` の `showMojiSpin`、`showSlotBet`、`playSlotRound` など。保存済み結果を表示し、表示中に再抽選しない。
- 残高の変更は `createCloud` の共通トランザクションと不変receiptへ集約する。エンジンや画面から直接残高を書き換える別経路を作らない。
- `index.html` で `slot-engine.js` → `app.js` の順にdeferで読み込む。公開API名は `globalThis.MojiSpinEngine` を維持する。
- `tests/slot-any-bonus.test.cjs` は実際の `slot-engine.js` を読み、確率境界・配当・旧保存データ・二重精算を検証する。`tests/slot-bet.py` / `tests/slot-any-bonus.py` はChromiumで表示・操作を検証する。

## ファイルを追加・分離するとき

新しい必須JSを追加したら、HTMLの読み込み順と `sw.js` のCORE・HTML内のシェル名クエリ付与を合わせて更新する。COREの構成を変える場合はキャッシュ名前空間も分け、旧ワーカーの掃除が新しい準備済みキャッシュを消さないようにする。プレイ中・保存中の更新延期を維持し、`tests/pwa-v4.py` で更新失敗・旧クライアントからの移行・新ファイルを含むオフライン読込を確認する。

機能の最新仕様はAGENTS.mdから参照する個別仕様書を優先する。今回の分離ではスロットエンジンの内容・確率・配当・保存形式を変更しない。GAS・Firestoreルール・既存データの更新は不要。

## エモジンのぼうけん
`adventure-store.js` は本人のウォレット・開始receipt・結果receipt・上位記録のアダプター。共通のcreateCloud操作キューからトランザクションを実行する。`adventure/` は全画面iframeで表示を隔離し、親のHOSTアダプター経由だけでDB操作する。仕様と公開順序は [ADVENTURE.md](ADVENTURE.md)。
