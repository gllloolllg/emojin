# デイリーバトル（2026-11-02）

## 最新仕様

日本時間で0:30にその日の専用NPC2体を作り、18:30に投票を締め切って決着する。既存のhourlyBattleの毎分トリガーが処理するため、作成・結果公開はその時刻以降の最初の実行となる。締切はFirestoreサーバー時刻で厳密に18:30未満。18:30〜翌0:30は直前の結果を表示し、0:30から当日分へ切り替える。GAS遅延時は「結果を確認中」、未作成時は「準備中」と表示する。停止期間に未決着だった最後の対戦は、復旧後に先に決着する。停止中の未作成の日をまとめて作らない。

通常のemojins/battles/legends/meta/gameのデータ・成績は変更しない。HPは抽選せず8固定。通常NPCと同じ基本スキルの重みで5枠を抽選し、6枠目はattack1。特殊スキルなし。名前は通常NPC同様のカナ3文字＋ン。通常エンジンの最大10ターン方式を使い、保存済みイベントだけを再生する。

1日・本人UIDごとに無料で1票、変更・取消不可。左右ともに右側の勝利/圧勝ボタンには💪を付ける指定。左から「左💪 圧勝300」「左 勝利100」「🌀 引き分け300」「右💪 勝利100」「右💪 圧勝300」。通常勝利2ボタンを広めにする。圧勝は相手HP0、通常勝利は10ターン後の残りHP差。相打ち・同HPは引き分け。

通常はスキルの左3枠だけ公開し、右3枠は?。投票候補のポップアップは別の投票ボタンへ切り替え可能で、内部の「投票」で初めて確定。確定後は全候補無効、選んでいない4つをグレーにする。別端末でも同じ投票結果を返す。

再生時は6枠を隠した状態から右3枠を順に派手に公開。再生は保存速度を無視して1×、スキップなし。終了後は元の通常バトル速度へ戻す。☆・💀は表示しない。当選者は再生終了後の「賞金を受け取る」を押して初めてウォレットへ加算。自然回復・3,000超の残高維持・不変receiptとトランザクションによる二重受領防止を使う。

自分が投票した過去の日の対戦だけ履歴に表示する。未再生は強調し、右上の「過去のバトル」と街の起動ボタンに赤丸を付ける。再生済み情報はprojectId/UID/日付ごとの端末保存（保存不可ならセッション内）。端末データが消えても賞金の受領記録はDBに残る。履歴からの再生後も未受領なら受領できる。賞金の期限は設けず記録を残す。

## 保存場所・権限

- `dailyBattleSecrets/YYYY-MM-DD`：GASのみ。全6枠・seed。クライアントのread/writeを拒否。
- `dailyBattles/YYYY-MM-DD`：認証済みread、GASのみwrite。決着前は名前・絵文字・HP・左3枠だけ。決着後だけlog/outcomeを追加。
- `meta/dailyBattle`：GASのみwrite。通常のmeta/gameを使わない。
- `dailyBattleVotes/{uid}/days/YYYY-MM-DD`：本人のみread、受付中だけcreate、update/delete不可。votedAtはserverTimestamp。投票先は0〜4。
- `wallets/{uid}/operations/daily-battle-YYYY-MM-DD`：不変の賞金receipt。的中済み投票・公開結果・賞金額・同時ウォレット更新のrevision/残高増分/recentOperationsをルールで照合。通常のwallet/スロット/くじの保存経路は維持。

同時受領では片方の古いwallet revisionをルールが先に拒否する場合がある。その場合でも、すでに確定済みの同じ日付のreceiptと最新財布が取得できたときだけ成功扱いで同じ記録を返す。receiptがなければ権限エラーを握りつぶさない。

## ソースと確認

純粋な日次エンジンはapp.jsのDaily Battle区間が正本。`node scripts/sync-daily-battle.cjs`で`gas/DailyBattleEngine.gs`へ同期し、`--check`で一致を確認する。通常エンジンの同期とは別。スケジューラーは`gas/DailyBattleScheduler.gs`。Code.gsは既存hourlyBattleへ呼び出し1か所を追加するだけで、毎分トリガーは維持。日次処理の失敗はログに記録して次の毎分で再試行し、通常の定期処理を妨げない。

```sh
node --check app.js
node --check sw.js
node scripts/sync-gas-engine.cjs --check
node scripts/sync-daily-battle.cjs --check
node --test tests/*.test.cjs
python3 tests/daily-battle.py
python3 tests/replay-v4.py
python3 tests/pwa-v4.py
```

ローカルのFirestore Emulatorはfirebase.test.jsonとdemo-emojin-v4だけを使う。テスト用Firebaseプロジェクトの準備は不要。本番へテスト投票・賞金・サンプル対戦を書き込まない。

## 本番適用（フロントを先行公開しない）

1. 現在のGASと公開ルールを控える。通常個体・wallet・既存ログのデータ移行は不要。`migrateToV4`・`pauseForV4Migration`・`finishV4Migration`は実行しない。
2. 既存GASプロジェクトへ`DailyBattleEngine.gs`と`DailyBattleScheduler.gs`を新規ファイルとして追加する。`Code.gs`を同梱版へ差し替える。通常Engine.gs、Migration.gs、Announcements.gs、appsscript.jsonの差し替えは不要。FIREBASE_PROJECT_IDは本番emojin-49855の既存設定を維持。
3. ファイル一式を保存する。既存hourlyBattleの毎分トリガーはそのままでよく、追加トリガーやWebアプリのデプロイは不要。次の毎分トリガーから処理が始まる。
4. Firestoreルール全文を同梱のfirestore.rulesへ更新・公開する。通常ゲームのメンテナンスやトリガー停止は不要。新規コレクションを管理画面で手作成する必要もない。
5. 次の毎分処理後、GASで読み取り専用`checkDailyBattle`を手動実行する。dayが本日（0:30前は前日）、exists:true、status:openまたはfinished、publicSlotCounts:[3,3]、closeAtJSTが18:30となることを確認する。not-createdならhourlyBattleの実行履歴を確認する。ログに非公開スキルやseedは出さない。
6. ユーザーがGAS保存・ルール公開・上記確認の完了を知らせた後、検証済みフロントをmainへ反映する。GitHub Pagesの配信内容を照合する。PWAのプレイ中/保存中の安全な更新延期を維持する。

検証結果：Node 143件、公式Firestore Emulatorのルール/GAS REST統合39件が成功。Chromium 390×844・320×568で投票候補切替・確定後無効・非公開6枠・1×再生・受領ボタン・履歴再生・未再生バッジを確認。既存バトル再生とPWAの更新延期も成功。

現段階ではローカル実装・検証のみ。本番のGAS/IAM・実機Safari確認は別。過去仕様書に残る未適用記録を根拠に、既存のバトル移行を再実行しない。
