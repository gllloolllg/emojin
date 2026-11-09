# デイリーバトルの廃止

2026-11-09の依頼により廃止する。未受け取り賞金も含めて終了することをユーザー確認済み。旧仕様はGit履歴に残し、再適用しない。

## 廃止内容

- 街の💪ボタン、投票・再生・命名・賞金受け取り画面、専用のフロントエンジンとAPIを削除。
- GASの `DailyBattleScheduler.gs` を無処理の互換関数に差し替える。既存 `Code.gs` からの呼び出しは残してよい。`checkDailyBattle` はDBへアクセスせず `{"retired":true,"status":"retired"}` を返す。
- 通常 `hourlyBattle` の毎分トリガーを維持する。通常バトル・モジくじ・スロットは継続。
- Firestoreの `dailyBattles`、`dailyBattleSecrets`、`dailyBattlePlayers`、`dailyBattleNames` と `meta/dailyBattle` はクライアントから読み書き不可にする。新規の賞金・命名receiptの作成も拒否する。
- DBの過去記録・秘密データ・投票・命名・既存receiptは削除しない。残高の一括変更、返金、賞金の自動付与、移行は行わない。
- 旧端末の未送信 `dailyBattleClaim` / `dailyBattleRename` は、新フロントで新しい支出・付与なしに取り消す。既にreceiptがある場合はそれを返し、再精算しない。他の未送信操作は通常どおり扱う。

## 本番への適用順序

GAS・ルールの直接接続はないため、この2点はユーザーが適用する。フロントは両方の適用完了報告後に公開する。

1. GASの **DailyBattleScheduler.gs 全文** を、このブランチの同名ファイルへ差し替えて保存する。ファイル名を変更している場合は `dailyBattleTick_` / `checkDailyBattle` の定義があるファイルを差し替える。新規ファイルへの重複追加はしない。
2. `checkDailyBattle` を手動実行し、`{"retired":true,"status":"retired"}` を確認する。Webアプリのデプロイ・新規トリガー・既存トリガー停止は不要。旧 `DailyBattleEngine.gs` はGAS側に残っていても呼ばれないので問題ない。
3. 本番Firebase `emojin-49855` のFirestoreルール全文を、同じブランチの **firestore.rules** へ差し替えて公開する。
4. 両方の完了報告後、作業ブランチをmainへ反映し、実際のGitHub Pages配信内容を照合する。

`Code.gs`、通常 `Engine.gs`、`Migration.gs`、`Announcements.gs`、`appsscript.json` の更新は不要。移行関数は実行しない。受付中の対戦も新たに実行・精算しない。

## 検証

`node --check app.js`、`node --check sw.js`、`node scripts/sync-gas-engine.cjs --check`、`node --test tests/*.test.cjs`、Firestoreエミュレーターの `tests/firestore-rules.cjs`、Chromiumの `tests/economy-ui.py` / `tests/slot-bet.py` / `tests/replay-v4.py` を使う。模擬データ・ローカル環境で確認し、本番DBへの書き込み・iPhone実機確認とは区別する。
