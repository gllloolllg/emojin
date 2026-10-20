# 💀10でボチ・累積カウンター（2026-10-21）

作業ブランチ：`feat/ten-defeat-limit`。実装・ローカル検証済み。本番への公開・GAS差し替え・ルール配備・設定変更は未実施。

## 動作

- 最大10ターン、HP判定、スキル、☆、費用・孵化報酬は維持する。
- 共通エンジンの `DEFEAT_LIMIT = 10` を正本にする。敗北の💀は引き続き試合ごとに1回加算。💀1〜9は生存、10でdead。NPCも同じ。
- 勝利や回復では💀を減らさない。既存の生存個体の💀・☆を引き継ぐ。レジェンド基準は50を維持する。
- 成績は☆の下に `💀×0`〜`💀×10`。街を歩く個体には表示しない。詳細・一覧・バトル・レジェンドは共通recordBadgeを使う。
- 💀＋1の既存演出を残し、累積カウンター全体を拡大する。付与前から保存済み付与後の値へ切り替え、再生で実データを加算しない。10個目で退場する。
- 既存のボチ・レジェンド・過去ログを書き換えたり復活させたりしない。旧ログの3個目での退場は当時の結果として再生する。

## 保存と旧版対策

試合の基本形式はrulesVersion 4を維持し、ログ・Firestoreのbattleドキュメント・未保存バトル要求へ `defeatLimit:10` を追加する。ログにこの値がない旧v4は再生時だけ3を用いる。

`config/battle` の新しい有効条件：

```json
{"rulesVersion":4,"defeatLimit":10,"maintenance":false}
```

新フロントと新GASはこの設定が揃うまで新規処理を進めない。新ルールは新ログのdefeatLimitが10であること、active/legendが💀0〜9、deadが💀10であることを確認する。認証・本人wallet・履歴不変・revision・getAfter照合等は維持する。これで旧v4クライアントが💀3の死亡結果を保存することを防ぐ。GASはIAMでルールを迂回するため、旧GASのトリガー停止と実行終了の確認も必要。

旧v4の未保存要求は新クライアントで無課金取消・ローカルへ記録する。同じIDの旧試合が保存済みなら、その結果を返して再課金しない。wallet・slot receipt・中断スピンは維持する。

既存のv4エモジン・ドラフトは保存フィールドが変わらないため、個体ごとの移行や💀リセットは不要。

## メニュー

強制バトルの上端を基準に、▲の64×44pxのタッチ領域の下端と開いたメニューの下端を揃える。▲の図形は下寄せし、メニューの下部に閉じる操作用領域を確保する。項目と▲は重ならず、同じ▲で閉じられる。控えめな16px・透明背景を維持し、画面高さ・safe-areaは変更しない。

## 本番へ反映する順序

1. 現GAS・ルール・公開コミットを保管する。旧hourlyBattleトリガーを停止し、GASの実行中処理が全て終了したことを確認する。
2. 本番GASの `Engine.gs`・`Code.gs`・`Migration.gs` を今回の版へ差し替える。appsscript.jsonのスコープ変更は不要。接続先が `emojin-49855` であることを確認する。
3. `previewV4Migration` を実行し、`emojinCount:0, draftCount:0` と既存カウンターの維持を確認する。0でなければ対象を提示して調査し、今回の更新として勝手に個体移行しない。
4. `pauseForV4Migration` を実行する（configへmaintenance:true/defeatLimit:10を設定）。新しい `firestore.rules` を本番へ配備する。
5. 検証済みフロントをmainへ公開し、GitHub Pagesの完了と配信ファイルの一致を確認する。
6. `finishV4Migration` を実行する。全件v4であることを読み取りで検証し、defeatLimit:10/maintenance:falseにする。今回は `migrateToV4` の実行は不要。
7. `setupGame` でhourlyBattleの毎分トリガーを1つだけ再登録する。PWA・タブをすべて閉じて開き直す。定期試合は引き続き時刻マーカーにより1時間に1回。

フロントだけを先行公開しない。旧クライアントは定期的なPWA更新・再起動で置き換える。公開にはユーザーの明示的な依頼が必要。

## 検証

Node 81件成功。💀0〜9からの敗北、10個目の退場、勝者の累積維持、既存v4カウンターと旧墓地の維持、GASの3/9/10個目、新GASの旧設定での停止、旧未保存要求の無課金取消・保存済み結果の返却、旧ログの3個/新ログの10個の字幕、フロント/GASの一致等を確認。

公式Firestore Emulatorで15件成功。3・9個目のactive、10個目のdead保存、旧3個方式の書き込み拒否、既存の認証・財布権限・競合・二重保存防止、GAS RESTの試合保存と移行処理を確認。本番へ接続せず実行した。

Chromium 390×844・320×568で💀×0/×10、9→10の成績獲得、退場、legend接続、スキップの結果待ち、表示の非重複、メニューと▲の接続位置・端付近のタップ・開閉を確認。iPhone実機は未確認。

```sh
node --check app.js
node --check sw.js
node scripts/sync-gas-engine.cjs --check
node --test tests/*.test.cjs
python3 tests/replay-v4.py
EMOJIN_TEST_WIDTH=320 EMOJIN_TEST_HEIGHT=568 python3 tests/replay-v4.py
XDG_CONFIG_HOME=/workspace/.emojin-config FIREBASE_EMULATORS_PATH=/workspace/.emojin-emulators \
  FIREBASE_CLI_DISABLE_USAGE_REPORTING=1 RULE_TEST_DEPENDENCIES=/workspace/.emojin-test-tools \
  /workspace/.emojin-test-tools/node_modules/.bin/firebase emulators:exec \
  --project demo-emojin-v4 --only firestore --config /workspace/emojin/firebase.test.json \
  'node --test /workspace/emojin/tests/firestore-rules.cjs'
```
