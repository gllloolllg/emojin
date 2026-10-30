# 同じオーナー同士の対戦禁止（2026-10-30）

通常（GAS定期）・強制・チャンピオン（チャレンジ）・マイエモジンの全モードに適用する。本人に限らず、同じプレイヤーのエモジン同士を除外する。NPCは従来どおり人間・NPCと対戦できる。同一個体との対戦は禁止を維持する。

## 実装

- `EmojinEngine.canBattle(a,b)`を共通判定にする。フロントの`selectBattlePair`、`forced`、`hourly`とGASの`scheduledStep_`で共有する。
- 強制・定期は、有効な2体の組み合わせを均等に抽選する。候補ごとの相手数で最初の個体を重み付けし、その相手から均等抽選する。全組み合わせの配列や再抽選ループは作らない。
- チャンピオン・マイエモジンは、参加可能で対戦相手もいる対象から1体を均等抽選し、その相手から均等抽選する。チャンピオンの最大星数や休止・休眠の除外は維持し、下位個体へ繰り上げない。
- 相手がいなければ、手動は理由を表示して無課金で中止。GASはその時間帯を完了扱いにし、試合・成績・未確認件数を増やさない。30体超でも無限ループしない。NPC不足補充など既存の保守は維持する。
- `planBattle`は同オーナー対戦を保存計画前に拒否する。空のbeforeを使う既存NPC保守は維持する。
- Firestoreルールは、更新前の個体のownerUid/isNpcを参照して同オーナー対戦の新規作成を拒否する。結果のisNpcを書き換えて回避しないよう、既存個体のisNpcも更新不可にする。認証・本人財布・履歴不変・既存getAfter照合は維持する。
- 未保存の同オーナー手動要求は、新フロントで無課金取消し、ローカルの既存取消記録に残す。残高が費用未満でも取消可能。既に同じbattleIdが保存済みなら従来の結果を返し、再精算しない。
- 過去ログは変更しない。表示時に組み合わせを再検証したり再抽選したりしないため、過去の同オーナー対戦も再生できる。戦闘解決本体`battle`/`resolveTurn`・確率・成績・コスト・孵化報酬・5個退場は変更しない。

## 本番適用の順序

2026-10-30の適用状況：ユーザーからGAS停止、Code.gs/Engine.gsの差し替え保存、Firestoreルール公開の完了報告を受領。フロント公開へ進む。本番のmaintenance解除・トリガー再登録の完了は未受領。

GAS・Firestore管理者への直接接続は未設定。以下の管理画面操作はユーザーが行い、完了後にこちらでフロントを本番公開する。作業ブランチは`feat/no-same-owner-battles`。個体・wallet・過去ログのデータ移行は不要。`migrateToV4`は実行しない。

1. 稼働中のGASの`Code.gs`・`Engine.gs`、Firestoreルールをコピーして控える。GASで既存の`pauseForV4Migration`を実行し、hourlyBattleトリガーを削除、実行中のhourlyBattleが終了したことを確認する。maintenanceで手動保存も一時停止する。既存のMigration.gsはそのまま使える。
2. GASの`Engine.gs`と`Code.gs`を、このブランチの検証済みファイルへ差し替えて保存する。`Migration.gs`・`appsscript.json`・プロジェクトの接続設定は変更不要。
   - [Engine.gs](https://raw.githubusercontent.com/gllloolllg/emojin/feat/no-same-owner-battles/gas/Engine.gs)
   - [Code.gs](https://raw.githubusercontent.com/gllloolllg/emojin/feat/no-same-owner-battles/gas/Code.gs)
3. [Firebaseルール画面](https://console.firebase.google.com/project/emojin-49855/firestore/rules)で、このブランチの[firestore.rules](https://raw.githubusercontent.com/gllloolllg/emojin/feat/no-same-owner-battles/firestore.rules)を公開する。GASはIAM権限でルールを迂回するため、ルールだけの先行更新では旧GASを防げない。停止と2ファイルの差し替えを省略しない。
4. 上記の完了をこちらへ知らせる。こちらで最新mainの変更を保護してフロントを公開し、GitHub Pagesの配信ファイル一致を確認する。PWAのプレイ・保存中の更新延期は維持する。
5. フロント公開の完了連絡後、GASの既存`finishV4Migration`でmaintenanceを解除し、`setupGame`でhourlyBattleトリガーを1つだけ再登録する。これは今回データ移行を行う操作ではない。アプリを閉じて開き直す。

古いクライアントによる別オーナー対戦は有効なため引き続き保存可能。同オーナー対戦のバッチはルールが全体を拒否し、モジ・孵化・成績を部分反映しない。その未送信要求は新フロントへ更新後に取り消す。過去ログには新しい制約を後付けしない。

## 検証

```sh
node --check app.js
node --check sw.js
node scripts/sync-gas-engine.cjs --check
node --test tests/*.test.cjs
python3 tests/battle-menu.py
python3 tests/replay-v4.py
EMOJIN_TEST_WIDTH=320 EMOJIN_TEST_HEIGHT=568 python3 tests/replay-v4.py
XDG_CONFIG_HOME=/workspace/.emojin-config FIREBASE_EMULATORS_PATH=/workspace/.emojin-emulators \
  FIREBASE_CLI_DISABLE_USAGE_REPORTING=1 RULE_TEST_DEPENDENCIES=/workspace/.emojin-test-tools \
  /workspace/.emojin-test-tools/node_modules/.bin/firebase emulators:exec \
  --project demo-emojin-v4 --only firestore --config /workspace/emojin/firebase.test.json \
  'node --test /workspace/emojin/tests/firestore-rules.cjs'
```

Node全131件、Firestore Emulator全34件。共通抽選、同率チャンピオン、NPC同士、有効な相手なし、40体同オーナーの終了、再試行・既存時間帯の二重実行、費用不足時の旧要求取消、既に保存済みの同オーナー試合の再取得、GASとフロントの同seedでの一致、旧クライアントの保存拒否と原子性を確認する。ブラウザーは390×844・320×568で手動3モードの中止案内・無課金、過去の同オーナー試合を含むログ再生・スキップ・成績演出を確認する。本番DBへの検証書き込みは行わない。iPhone実機は未確認。
