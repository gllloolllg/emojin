# 最大10ターン方式（rulesVersion 4）：実装・検証・切り替え手順

作業ブランチ：`feat/ten-turn-matches`、追加UI修正：`fix/battle-menu-touch-target`。テスト先の実プレイはユーザー確認済み。本番GAS差し替え後のプレビューも16体・draft 0件で一致し、停止・ルール配備・移行の案内後、ユーザーから移行後プレビュー `activeCount:16, emojinCount:0, draftCount:0` を受領した。フロント9d97ecfのGitHub Pages公開成功とHTML/JS/CSS/SWの一致を確認済み。maintenance解除・トリガー再開の手順は提示済みだが、実行完了の報告は未受領。

## 稼働コードの照合結果と残る前提

最初の添付4ファイルに加え、2026-10-19に「これが今のもの」として再共有された `Code.gs`・`Engine.gs`・`appsscript.json` を全て読んだ。最新版の共有によって、稼働GASのソース不足は解消した。

- 最新Code.gsはFirestore REST方式。`emojin-49855`、毎分トリガー、時間帯別の実行マーカー、競合時再試行、休止・休眠処理、NPC補充を確認した。Spreadsheet版は過去の添付であり、切り替え元ではない。
- 最新Engine.gsはrulesVersion 3。旧フロントとの差は生成価格・手動バトル選択用の補助関数等で、戦闘フェーズ自体は一致する。旧フロントと今回共有の稼働GASそれぞれについて、1,000 seedの旧ターンとの比較を通した。稼働GASの比較元は `tests/fixtures/deployed-gas-v3-engine.cjs`。
- 新GASでは、既存の初期化時NPC補充、試合前の休止・休眠反映とNPC不足補充、前時間帯の未完了処理の再開、参加数30以下までの追加試合を維持する。NPCの事前保守だけでは試合・星・未確認件数を増やさない。
- GASの保存は既存のupdateTime前提付きcommitから読み取りを含むFirestoreトランザクションへ置換した。時刻マーカーと `b-hour-<hour>-<round>` の記録ID規則は維持する。
- 共有ルールはクライアント管理方式で、認証済みユーザーによる他オーナーの対戦結果更新を許し、財布とreceiptは本人限定。今回もこの信頼モデルを継続し、匿名や他人の財布へ権限を広げない。
- テストGASのOAuth/IAM・実Firestore保存・同一時間帯の重複防止はユーザー実行ログで確認した。本番のOAuth/IAM・配備済みルール・インデックス・対象件数は未確認。トリガーの実際の登録状態も本番切り替え時に確認する。

## 試合エンジン

`app.js` のEmojinEngineを正本にし、`node scripts/sync-gas-engine.cjs` で同一内容の `gas/Engine.gs` を生成する。`--check` は差分があると失敗する。ブラウザー側の単一app.js構成は維持した。

`resolveTurn` は旧battleの毒→抽選・呪いブロック・ツイン→回復→防御→攻撃/吸血/反動→カウンター→毒付与→呪い付与をそのまま解決する。HPの下限をターン境界で0にするが、毒で一時的に0以下になっても、そのターンの回復等を飛ばさない。旧版と同じフェーズ内同時処理であり、途中のHP0で早期打ち切りしない。

`battle` が最大HP・毒なし・呪いなしで開始し、最大10回resolveTurnを呼ぶ。各ターン終了時にHP0を判定し、なければ次へ。10ターン目でもHP0を先に判定する。

| 決着 | 勝者 | 敗者/両者 |
|---|---|---|
| 片方HP0 | ☆+3 | 敗者💀+1 |
| 両方HP0 | 勝者なし | 両者💀+1 |
| 10ターン後、HP差あり | ☆+2 | 敗者💀+1 |
| 10ターン後、同HP | 両者☆+1 | 💀加算なし |

HP差は割合でなく整数の残りHP。💀は`defeats`として累積し、3個でstatus dead。HP0だけではdeadにしない。星は既存の50到達基準を維持し、飛び越えも>=50でlegendにする。保存値は従来どおり50で上限とする。新規・NPCのmaxHpは5〜8の均等抽選。

## ログと保存状態

新しいエモジンフィールド：`defeats`、`rulesVersion:4`、`recordVersion`、対戦後の`lastBattleId`。

- 試合外のcurrentHpはmaxHp、poisonedはfalse、cursedSlotsは空。
- ログのbeforeは試合開始状態、turnsとeventsは出目・状態異常・HP変化を含む。各イベントにはturnがある。
- finalStateは試合終了時の実HPと付与後成績。afterはHPと状態異常をリセットした永続化用状態。KOのHP0と永続化後の全回復を混同しない。
- awardsには各者のstars/defeats加算、resultには決着種別・勝者・残HP・ターン数を記録。
- Firestoreのbattlesには従来のseq/ownerUids/jsonに加え、rulesVersion/emojinIds/afterを保存。ルールがgetAfterで同じトランザクションの結果と照合するための構造。
- 過去ログは書き換えず、v3のfinishイベントは従来の再生分岐を通す。今回の互換検証は現在の旧v3形式について行った。

手動バトルは一つのFirestoreトランザクションでwallet・孵化ゲージ・双方の成績・ログ・未確認件数・legend・NPC・metaを保存する。途中ターンは保存しない。同じbattleIdの再送は既存ログを返し、再課金しない。recordVersion等の比較で途中に変わった入力を拒否する。

GASはFirestore RESTのbeginTransaction/batchGet/runQuery/commitを使用する。ScriptLockは同一GAS内の重複を抑え、Firestoreトランザクションとmetaのhour/runningHour/scheduledCountが別実行・フロントとの競合を防ぐ。ABORTEDは新しいトランザクションで最大5回再試行。

ペア抽選と試合の乱数ストリームを分離し、ログに記録したpair/seed/battleAt/battleIdをそのままフロントのbattleへ渡せば同じ結果になる。NPC補充も同じ派生seedから作る。定期処理は既存どおり毎分トリガー＋時刻マーカーで各時間を1回実行し、参加可能数30超の場合の追加試合も維持する。長い処理は次の毎分トリガーへ同じordinalで継続する。

1試合につき、費用・孵化報酬・battleSeq・未確認ID・成績は1回。試合によるNPC補充は試合後に一度。既存の試合前保守による不足補充も維持する。通常100モジ/+1、チャレンジ・マイエモジン200モジ/+2のまま。NPCも同じ💀ルールだが墓地一覧の除外は維持する。

## 再生・成績表示・PWA

成績は共通recordBadgeで星の下に💀3個を並べ、未獲得は薄くする。街のresidentには従来のstarだけを使い、💀を表示しない。詳細名の余白と一覧のサイズを調整し、HPや名前に重ねない。呪いの☠️は従来の別表示。

ターン数はヘッダーの `n / 10`。再生はログの出目を使い、装飾用の回転表示も乱数抽選から切り離した。成績演出ではbeforeの成績→獲得ラベル→保存済み最終値の順に描き、最終値にさらに加算しない。実データへ加算するコードは再生側にはない。

skipの例外を1試合内で処理し、保存済み最終ターンの出目・結果・獲得ラベルを表示して停止する。タップで次の未確認試合へ進む。結果待ちの間はskipを無効にし、未確認を消化しない。通常再生でも☆＋n/💀＋1は結果画面を閉じるまで残す。速度1/2/4と保存を維持する。3個目の💀では獲得後に退場を示し、legendは☆獲得後に既存演出へ進む。

SW更新時の無条件skipWaitingを廃止した。新SWは既存クライアントが閉じるまで待ち、通常のHTML/JS/CSSのシェル更新は従来どおりEmojinCanReloadに従う。切り替え時には全員にPWA/タブを一度閉じて開き直してもらう。既に動いている旧JavaScriptを遠隔で安全にv4へ置換することまでは保証しない。

強制バトルの追加メニューは、ユーザーの追加依頼により三点ボタンから上向き三角へ変更。強制バトルの真上に64×44pxのタッチ領域を配置し、開いたメニューはその上へ表示する。さらに「目立たなくてもいい」という依頼により、枠・背景・影をなくし、三角を16pxの落ち着いた色へ変更した。展開中の三角は下向きとなる。320×568・390×844で配置・端付近のタップ・開閉を確認。星は頂角を広げ、数字を35pxへ拡大。0〜50の代表的な1桁・2桁の字形が星内に収まることを確認。safe-areaと画面高さは変更していない。

## 旧クライアント・保留操作

`config/battle = {rulesVersion:4, maintenance:false}` が新方式の書き込み条件。configはクライアントから変更できず、GASのIAM認証でのみ切り替える。切り替え中は新規財布・生成・スロット・報酬・バトルの書き込みを止める。既存receiptの照合は可能。

- 新ルールはversion/defeats等のない旧emojinと旧形式ログのバトル書き込みを拒否する。旧タブが残っていても旧方式で成績を更新できない。
- 新クライアントで復帰した「未保存のv3バトル」は無課金で取り消し、localStorageのcancelledOperationsへID付きで保存し、通知する。旧入力を新試合として勝手に再抽選・実行しない。
- 同じIDの旧バトルが既に保存済みなら、取り消さずその結果を返す。
- 新クライアントはメンテナンスエラーで未送信キューを消さない。
- 生成途中はサーバーのdraftを5〜8へ正規化し、paid/payment/cost/候補を維持する。同じdraft IDでもHP更新を取り込み、端末の名前・選択・演出段階は保持する。再課金しない。

## 移行対象と冪等性

2026-10-19 20:54:52 JST、本番 `emojin-49855` の `previewProductionV4` をユーザーが実行。activeCount=16、emojinCount=16、hpReducedCount=10、draftCount=0、invalidCount=0。最大HP10が7体・9が3体（各8へ）、7が3体・5が3体（維持）。全16体の☆は維持し、💀は0から開始する。これは読み取り時点の対象であり、旧GAS停止後に再確認する。本番の書き込み・移行・公開はまだ実施していない。

`previewV4Migration()` は書き込みなし。対象ID、変更前後maxHp、draftのあるwalletパス、件数を返す。

実行対象はFirestoreのstatus activeかつrulesVersionが4でないemojins、および未正規化のwallets.draft。9/10→8、5〜8維持、星維持、defeats初期0、currentHp=maxHp、毒・呪い解除、rulesVersion4/recordVersion初期0。想定外の最大HPや将来バージョンは推測で直さずエラーにする。

各対象は同一トランザクションでmigrationBackupsへ旧値を保存してから更新する。emojinは1実行25件、draftも25件まで。中断・再実行は既にv4の個体をスキップし、新しい💀や成績をリセットしない。dead/legend、battles、legendsは変更しない。財布残高・孵化ゲージ・予約済み費用は変更しない。

利用可能なら全体のFirestoreエクスポートを別途取得する（管理エクスポートの利用条件・費用は環境による）。今回の対象別バックアップだけで、本番全体の復旧が完了するとは扱わない。再開後のv4戦績がある場合、旧バックアップを一括復元すると新戦績を失うため、まず停止して差分を確認する。

## ユーザーが行う切り替え手順（この順序）

### 事前準備：ここでは本番データを変更しない

テスト先 `emojin-test` の準備状況と具体的な操作は [TEST_ENVIRONMENT.md](TEST_ENVIRONMENT.md) を参照。テスト用ZIPは接続先を固定してあり、本番GASへコピーしない。

1. **切り替え元の保管**。2026-10-19に再共有されたFirestore版を照合済み。GASプロジェクトと現行ファイルのバックアップを保管し、実際のhourlyBattleトリガーが毎分1つであることを確認する。
2. **ローカル検証結果を確認する（完了）**。2026-10-19、通信設定の反映後に公式エミュレーターを取得し、下記のFirestoreルール9テストとGAS REST統合2テストが全件成功。設定の追加操作は不要。実GAS/IAM・実機確認は次の手順で行う。
3. **テスト用Firebase/GASで一式を確認**。GASへgas/Code.gs・Engine.gs・Migration.gs・appsscript.jsonをコピーし、Script PropertiesのFIREBASE_PROJECT_IDをテスト用IDに設定。GAS実行アカウントに対象FirestoreへのIAM権限（例：Datastore User）を用意し、必要なOAuthスコープを許可する。秘密鍵や認証情報をチャット・リポジトリに置かない。REST利用のためWebアプリの匿名公開は不要。
4. テストDBでプレビュー→停止→移行→再プレビュー→有効化→手動hourlyBattle→同時実行を確認する。iPhoneのPWAでも再生・画面重なり・スキップ・旧ログ・オフライン復帰を確認する。模擬テストで実IAMや実ルールを検証したことにはしない。

### 本番切り替え：対象プレビュー提示後に実行する

5. まず現行GASへ `scripts/production-preview.gs` を別ファイルとして追加し、**previewProductionV4だけを実行**する。本番接続先を固定し、読み取り専用で対象ID・HP変更・draft・不整合を分割ログへ出す。全ログを提示して対象を確認する。不整合があれば切り替え前に調査する。この操作は旧Engineやトリガーを差し替えない。
6. GAS旧コード・旧ルール・公開コミットを控え、可能ならFirestore全体もエクスポートする。本番GASのタイマートリガーを停止し、実行中の旧GASが全て終了したことを実行履歴で確認する。旧GASは新ゲートを見ないため、トリガー削除だけで移行を開始しない。利用者へメンテナンスと全PWA/タブの終了を案内する。GASに新4ファイルを保存し、接続先が `emojin-49855` であることを確認する。Code.gsの既定値は現行同様このIDで、Script PropertiesにFIREBASE_PROJECT_IDがある場合はそちらが優先される。テスト用の上書き設定を本番へ残さない。現行同様、新版もWebアプリとして公開する必要はない。
7. 新GASのpreviewV4Migrationで停止後の対象を再確認する。最初のプレビューとの差異があれば提示する。現在、本番の実対象件数は不明。
8. 対象確認後にpauseForV4Migrationを実行し、新firestore.rulesをFirebase Consoleへ配備する。旧クライアントのゲーム書き込みが失敗することを確認する。この時点ではゲートがmaintenance trueなので新旧とも新規バトルを進めない。
9. migrateToV4を繰り返し、remaining.emojinCount/draftCountが0になるまで進める。各実行は最大25+25件。履歴が変わらず、backupと対象のHP・星・defeatsが合うことを確認する。
10. v4フロント（index.html/app.js/style.css/sw.js）をGitHub Pagesへ公開する。PWAを閉じて開き直し、未確認旧ログが再生できることと、全員が新版を読めることを確認する。
11. finishV4Migrationで全件移行を検証してゲートをmaintenance falseにする。setupGameで毎分のhourlyBattleトリガーを1つだけ登録する。通常/追加バトルの費用と孵化報酬、1試合1ログ/未確認1件、NPC補充を確認する。実プレイの書き込み確認は、指定したテスト用オーナーで明示的に行う。

Firestoreルールだけ、またはフロントだけを単独で先行有効化しない。GAS/ルール/データ/フロントの切り替えはメンテナンス中にまとめる。

## 検証コマンドと結果

```sh
node --check app.js
node --check sw.js
node scripts/sync-gas-engine.cjs --check
node --test tests/*.test.cjs
python3 tests/replay-v4.py
EMOJIN_TEST_WIDTH=320 EMOJIN_TEST_HEIGHT=568 python3 tests/replay-v4.py
python3 tests/pwa-v4.py
```

Node：58テスト成功（共通ロジック51件＋テスト環境の接続先保護・初期化5件＋本番読み取り専用プレビュー2件）。旧フロント・稼働GASそれぞれとの旧ターン比較1,000ケース、フロント/GASの100seed完全一致、10ターン境界/実数HP/同時KO/状態異常/💀/legend、保存再試行、GAS時刻マーカー・初期NPC補充・前時間帯の再開、移行の再実行、旧保留操作、生成途中HP更新を確認。

Chromium：320×568・390×844でv3ログ→v4試合の連続再生、skip後に現在試合の最終出目・獲得表示で停止してタップ待ち、10ターン表示、成績前後の分離、💀3個、legend接続、速度保存、再生からのバトル書き込み0回、街の💀なし、成績とHPの非重複、獲得ラベルの保持、星内の数字、ナビ内メニューの操作領域を確認。時間待ちだけを短縮したレスポンスで検証し、実機での演出タイミングの保証とはしない。

PWA：実際のsw.jsとindex内の更新処理を隔離ローカルサイトで動かし、busyタブのシェル維持、idleタブだけの更新、新SWの待機、全旧クライアント終了後の復帰を確認。

Firestoreルール：2026-10-19、通信設定反映後に公式Firestore Emulator v1.22.0で**ルール9テストとGAS REST統合2テスト、計11テスト全件成功**。正常な試合・NPC・本人walletの一括保存が許可され、旧形式・不正HP・孤立NPC・他人のwallet・履歴変更・config/backupへのクライアント操作・メンテナンス中の書き込み・二重保存が拒否されること、同じ入力の同時保存が片方だけ成功することを確認。Node 58テストと合わせて69テスト（別ランナー）。本番へ接続せずdemo-emojin-v4で実行した。テスト用の実Firebase/GAS保存・再実行はユーザーログで確認し、テスト画面も「バトルは完璧」とユーザー確認済み。最新UI修正の実機確認と本番移行は未実施。

GAS REST統合テストでは、製品のEngine.gs/Code.gs/Migration.gsを変更せずVMで実行し、UrlFetchAppの通信先だけをローカルエミュレーターへ置換。実際のbeginTransaction/batchGet/runQuery/commitで定期試合の保存・再実行時の重複防止・NPC補充・全回復・未確認件数、移行プレビューの読み取り専用性・バックアップ・draft正規化・残高維持・移行後💀を維持した再実行を確認した。エミュレーターの管理者トークンはGASのIAM認証自体を検証しない。transaction付きGETにはエミュレーターのBYTE_STRINGパーサー不具合があったため、新GASは正式APIのbatchGet（JSON本文にtransactionを指定）を使う。

起動確認：実Firebase SDKを使い、ログアウト画面・Service Workerの制御・ページ例外0件を確認。Chromium単独のHTTPSは環境プロキシのCAを信頼できず失敗するため、公開GETだけをOSの証明書でTLS検証するPython urllibで中継した。取得内容は改変せず、証明書検証も無効化していない。ブラウザーの証明書DBは変更しておらず、Chromiumの直接HTTPS接続の問題は残る。認証操作・本番DB書き込みは実行していない。

```sh
# リポジトリ外の一時ディレクトリにテスト依存を置く例
npm install --prefix /tmp/emojin-rules-check --cache /tmp/emojin-npm-cache \
  --no-audit --no-fund firebase-tools@15.34.0 @firebase/rules-unit-testing@6.0.0 firebase@13.0.0
# firebase.test.jsonはローカル専用。実プロジェクトIDを使わない。
XDG_CONFIG_HOME=/tmp/emojin-config FIREBASE_EMULATORS_PATH=/tmp/emojin-emulators \
  FIREBASE_CLI_DISABLE_USAGE_REPORTING=1 RULE_TEST_DEPENDENCIES=/tmp/emojin-rules-check \
  /tmp/emojin-rules-check/node_modules/.bin/firebase emulators:exec \
  --project demo-emojin-v4 --only firestore --config /workspace/emojin/firebase.test.json \
  'node --test /workspace/emojin/tests/firestore-rules.cjs'
```

ルールテストは認証、他人のwallet拒否、名前変更拒否、config/backupの管理者限定、旧形式バッチの拒否、履歴不変、正式な結果/NPC/財布の一括保存、二重commitの拒否、maintenance時の拒否を含む。実行前にJava 21以上と公式エミュレーターJAR取得が必要。
