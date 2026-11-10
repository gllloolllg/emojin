# デイリーバトルの廃止

2026-11-09の依頼により廃止する。未受け取り賞金も含めて終了することをユーザー確認済み。旧仕様はGit履歴に残し、再適用しない。

## 廃止内容

- 街の💪ボタン、投票・再生・命名・賞金受け取り画面、専用のフロントエンジンとAPIを削除。
- GASの `DailyBattleScheduler.gs` と `DailyBattleEngine.gs` を削除する。既存 `Code.gs` は関数の存在確認後にのみ呼び出すため、差し替え不要。停止用の互換関数は残さない。
- 通常 `hourlyBattle` の毎分トリガーを維持する。通常バトル・モジくじ・スロットは継続。
- Firestoreの `dailyBattles`、`dailyBattleSecrets`、`dailyBattlePlayers`、`dailyBattleNames` と `meta/dailyBattle` はクライアントから読み書き不可にする。新規の賞金・命名receiptの作成も拒否する。
- DBの過去記録・秘密データ・投票・命名・既存receiptは削除しない。残高の一括変更、返金、賞金の自動付与、移行は行わない。
- 旧端末の未送信 `dailyBattleClaim` / `dailyBattleRename` は、新フロントで新しい支出・付与なしに取り消す。既にreceiptがある場合はそれを返し、再精算しない。他の未送信操作は通常どおり扱う。

## 本番への適用順序

GAS・ルールの直接接続はないため、この2点はユーザーが適用する。フロントは両方の適用完了報告後に公開する。

1. GASの **DailyBattleScheduler.gs と DailyBattleEngine.gs** を削除して保存する。関数 `dailyBattleTick_` / `checkDailyBattle` を持つファイルを別名で登録していた場合は、その該当ファイルを削除する。
2. 本番Firebase `emojin-49855` のFirestoreルール全文を、廃止対応版の **firestore.rules** へ差し替えて公開する。
3. 両方の完了報告後、作業ブランチをmainへ反映し、実際のGitHub Pages配信内容を照合する。

2026-11-10：ユーザーからGAS削除とルール更新の完了報告を受領済み。再適用は不要。

`Code.gs`、通常 `Engine.gs`、`Migration.gs`、`Announcements.gs`、`appsscript.json` の更新は不要。移行関数は実行しない。受付中の対戦も新たに実行・精算しない。

## 検証

`node --check app.js`、`node --check sw.js`、`node scripts/sync-gas-engine.cjs --check`、`node --test tests/*.test.cjs`、Firestoreエミュレーターの `tests/firestore-rules.cjs`、Chromiumの `tests/economy-ui.py` / `tests/slot-bet.py` / `tests/replay-v4.py` を使う。模擬データ・ローカル環境で確認し、本番DBへの書き込み・iPhone実機確認とは区別する。
