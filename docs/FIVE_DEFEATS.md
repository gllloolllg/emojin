# 💀5個以上でボチ：次に💀を獲得した時点（2026-10-22）

作業ブランチ：`feat/five-defeat-limit`。2026-10-22、ユーザーの「分かりました。進めましょう。」を受領し、本番切り替えを開始。本番はまだ未反映で、GAS画面でのメンテナンス化・トリガー停止の完了待ち。従来の[TEN_DEFEATS.md](TEN_DEFEATS.md)の10個方式を置き換える。ユーザーによるGAS直接接続の準備は中止中で、こちらからGASへは接続・書き込みしていない。

## 新しい条件

共通エンジンの `DEFEAT_LIMIT=5`。試合終了時に次の両方を満たす場合のみボチへ移す。

1. その試合で💀を1個獲得した。
2. 加算後の💀が5個以上。

|試合前|結果|試合後|
|---|---|---|
|💀3|敗北|💀4、生存|
|💀4|敗北|💀5、ボチ|
|💀5〜9|敗北・相打ち|💀6〜10、ボチ|
|💀5〜9|勝利・10ターン同点|個数維持、生存（☆50なら従来どおりレジェンド）|

プレイヤー・NPC、通常の強制バトル・チャレンジ・マイエモジン・GAS定期バトルは同じ判定。各試合のスキル・最大10ターン・HP判定・成績付与・コスト・孵化報酬は維持する。

既存個体の一括移動・💀リセット・5への切り捨てはしない。表示は引き続き `💀×個数` で、既存の6〜9個や過去の10個も実数を表示する。街には💀を表示しない。既存のボチ・レジェンド・過去ログは変更せず、再生で成績を加算しない。新ログの退場字幕は「💀 5個以上」、旧3/10個ログは当時の閾値を使う。

## 互換性と保存

- `rulesVersion:4`は維持。新ログ・要求・`config/battle`は `defeatLimit:5` で揃える。旧10個方式のクライアントとGASは一致しないゲートで新規試合を進められない。
- 旧10個方式の未保存要求は新フロントで無課金取消。既に保存済みの同じIDは元の結果を返し、再抽選・再課金しない。スロットやwalletのreceiptは維持する。
- 入力検証には `LEGACY_DEFEAT_LIMIT=10` を使い、activeの💀0〜9を引き続き受け入れる。これは新しい退場閾値ではなく既存データの上限。GASのプレビューも5〜9個を不整合と扱わない。
- Firestoreは従来の認証・本人wallet・履歴不変・revision・getAfter照合を維持する。active/legendは0〜9、deadは5〜10を受け入れ、更新前後の比較で「💀増分0または1」「新規獲得かつ5以上の時だけdead」を必須にする。新規作成は従来どおり💀0。5個目の敗者をactiveで保存したり、既存9個の勝者を9個のままdeadにしたり、個数を減らす更新は拒否する。

## 本番反映の順序

本番GASのスクリプトID：`1kr7RV5zmIfwNH8dnG88nVGVmOMjkUMOm0UcI8NnrtxnRTilG8W4Mq4wX`。接続先Firebaseは `emojin-49855`。今回、個体・wallet・過去ログのデータ移行は不要。フロント単独で先行公開しない。

1. 稼働中のGAS・ルール・公開コミットを控える。現在のGASで `pauseForV4Migration` を実行してメンテナンス状態にし、hourlyBattleのトリガーを停止、実行中処理の終了を確認する。
2. 本番GASの `Engine.gs` と `Migration.gs` をこのブランチの版へ差し替える。`Code.gs`・`appsscript.json`は変更不要。スクリプトプロパティの接続先が本番を指すことを確認する。
3. `previewV4Migration` を実行する。既存💀5〜9を含め、`emojinCount:0, draftCount:0`ならそのまま進む。0以外や不整合なら停止し、対象を確認する。今回 `migrateToV4` を実行したり個体を移動したりしない。
4. 新しいGASで `pauseForV4Migration` を実行し、設定を `rulesVersion:4, defeatLimit:5, maintenance:true` にする。このブランチの `firestore.rules` を本番へ公開する。
5. 明示的な公開依頼と前段の完了確認後、検証済みフロントをGitHub Pagesへ反映し、配信ファイルの一致を確認する。PWAのプレイ中・保存中の更新延期は維持する。
6. `finishV4Migration` を実行し、`defeatLimit:5, maintenance:false`へ切り替える。`setupGame`でhourlyBattleトリガーを1つだけ再登録する。PWA・タブは一度閉じて開き直す。

## 確認方法

```sh
node --check app.js
node --check sw.js
node scripts/sync-gas-engine.cjs --check
node --test tests/*.test.cjs
python3 tests/replay-v4.py
EMOJIN_TEST_WIDTH=320 EMOJIN_TEST_HEIGHT=568 python3 tests/replay-v4.py
EMOJIN_TEST_PRIOR=9 python3 tests/replay-v4.py
XDG_CONFIG_HOME=/workspace/.emojin-config FIREBASE_EMULATORS_PATH=/workspace/.emojin-emulators \
  FIREBASE_CLI_DISABLE_USAGE_REPORTING=1 RULE_TEST_DEPENDENCIES=/workspace/.emojin-test-tools \
  /workspace/.emojin-test-tools/node_modules/.bin/firebase emulators:exec \
  --project demo-emojin-v4 --only firestore --config /workspace/emojin/firebase.test.json \
  'node --test /workspace/emojin/tests/firestore-rules.cjs'
```

Nodeでは0〜9個からの次の敗北、既存5〜9個の勝利・同点・レジェンド、相打ち、強制バトルの再試行/二重精算防止、GAS定期試合との一致、設定切替のプレビュー・既存成績維持、旧未保存/保存済み10個方式、3/10/5個ログ字幕、累積表示を確認する。Firestoreエミュレーターでは認証・保存・競合に加え、新旧ゲート、5個目と6〜10個目の退場、5〜9個での生存、退場条件違反・個数切り捨ての拒否を確認する。ブラウザーは模擬cloudで実表示・スキップ・報酬の保持・4→5と9→10の退場・勝者の9個維持・レジェンド・旧ログを確認し、本番データに書き込まない。iPhone実機は未確認。

確認結果：Node全100件、Firestore Emulatorのルール・GAS REST統合29件、計129件成功。Chromium 390×844・320×568の両方で4→5の退場と既存9個の勝者維持、390×844で9→10の退場も成功。構文、フロント/GAS共通エンジンの同期、差分の空白チェック成功。本番GAS・Firestore・GitHub Pagesへの変更は行っていない。
