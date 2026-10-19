# テスト環境の準備

2026-10-19：ユーザーからテスト用プロジェクトID `emojin-test` の作成完了の申告あり。Web設定を受領。Firebase Authenticationの公開プロジェクト設定APIが200を返し、プロジェクト番号428626068875の一致を確認。Firestoreの設定・GASのIAMはまだ直接確認していない。
本番 `emojin-49855` のデータ、ルール、公開先、GAS、トリガーは変更していない。

## 今行うFirebase側の操作

Firebase Consoleで `emojin-test` を選択する。

1. Firestore Databaseでデータベースを作成。Standardエディション、データベースID `(default)`、ロケーションは東京 `asia-northeast1`、セキュリティは本番モードとする。テスト用の実行可否を確認する前に本番ルールを変更しない。
2. Authenticationを開始し、ログイン方法「メール/パスワード」を有効にする。メールリンク認証は今回のゲームでは使用しない。
3. プロジェクト設定 → 全般 → マイアプリのWeb（</>）からアプリを追加。表示名は `emojin-test-web`。まだHostingは設定しない。
4. WebアプリのSDK設定を「構成」にして、`const firebaseConfig = {...}` を共有する。ここでprojectIdが `emojin-test` か確認する。これはWeb用の公開設定であり、サービスアカウント秘密鍵やログイン情報は不要。

## 準備済みのGASファイル

最新一式は `/workspace/emojin-test-package.zip` と展開済み `/workspace/emojin-test-package/`。web/（テスト用フロント）、gas/（GAS）、firestore.rules、Firebase Hosting用設定、README、チェックサムを同梱。旧GASのみのZIPはこの一式で置き換える。ゲーム全体の本番バックアップではない。

- Code.gs：共通版から接続先を `emojin-test` に変更し、異なるScript PropertiesのIDを通信前に拒否する検査を追加。
- Engine.gs / Migration.gs / appsscript.json：作業ブランチの共通版と同一。
- TestSetup.gs：接続先の確認、読み取り専用checkTestConnection、空DB用initializeTestWorld。正本はscripts/test-project-setup.gs。初期化は設定とNPC10体だけを作り、トリガーは登録しない。
- firestore.rules：テストFirestore用。GASのファイルではない。
- README.md / SHA256SUMS.json：用途・内容の確認用。

接続先未設定・正しいIDはテスト先へ、誤ったID・本番IDは通信前に停止することを4条件の模擬検証で確認済み。ユーザーのGAS実行ログでテストFirestoreへの接続と初期化成功を確認済み。公開Web設定の取得とSDKの読み込みだけを行い、実アカウント・DBへの変更は行っていない。

今後エンジンやGASを修正した際はZIPを作り直す。この一時ZIPを正本として編集しない。正本はリポジトリのgas/とapp.js。

## 次に行う作業

テスト専用のフロントを準備済み。受領したWeb設定をコピー側だけに入れ、アプリ名をエモジン TEST、SWキャッシュ名をテスト専用に変更。ゲームエンジンは共通版と一致する。Firebase Hosting設定はemojin-test/web/を指定し、公開は未実施。テスト用GASは新しいApps Scriptプロジェクトへコピーし、接続先・実行アカウントのIAM・OAuthスコープを確認する。Webアプリとしての匿名公開は不要。
テストDBのルール・初期化を整え、定期バトル・移行・フロントの実保存・再生とiPhone表示を確認してから、本番の対象プレビューへ進む。本番移行実行は対象と手順を提示してから行う。

## 今ユーザーが行うGAS接続確認

1. Apps Scriptで新規プロジェクト「エモジン テスト」を作成する。
2. 最新ZIPのgas/からCode.gs、Engine.gs、Migration.gs、TestSetup.gsを同名でコピーする。設定でマニフェストの表示を有効化して、appsscript.jsonも差し替える。
3. 保存し、関数checkTestConnectionを実行する。テストFirebaseを作成したGoogleアカウントで実行・OAuth許可を行う。
4. 実行ログを共有する。これは読み取りのみで、まだDB初期化やトリガー登録は行わない。

接続確認後のテストDBルール設定、initializeTestWorld、テスト画面の配置、手動hourlyBattle実行の順序はZIP内READMEに記載。

検証：テスト画面で実SDKのログアウト画面・SW制御・ページ例外0件を確認。公開GETをTLS検証付きPython urllibで中継した（環境Chromium単独の証明書問題は別件）。認証のPOSTやDB書き込みはブロックして0件を確認した。テストプロジェクト以外への接続拒否、空DBの読み取り、初期化、再実行での成績維持、既存データがある場合の拒否をNode5テストで確認した。

## チャットでの直接貼り付け対応

添付ZIPの取得がユーザー側で失敗したため、GitHubへの送信は行わずコードをチャットへ直接提示している。
GASの接続確認後、ユーザーはEngine.gsの追加完了を申告済み。
提示したEngine.gsの絵文字一覧に転記ミス（🪟）が1か所あり、正本どおり🪰へ直すよう案内した。リポジトリの正本・ZIPのEngine.gsにはこの転記ミスはない。
提示済みのCode.gsは、テスト用gas/Code.gsとTestSetup.gsを連結したもの。初期化・接続確認関数もCode.gsに含むため、別途TestSetup.gsを追加する必要はない。Migration.gsはまだチャットで提示していない。

## テストGAS初期化の実行結果

ユーザーがinitializeTestWorldを実行し、次のログを共有した。テスト環境で実際の読み書きとNPC作成が成功した証拠であり、本番IAMや定期トリガー、フロント実保存を検証したものではない。

```json
{"projectId":"emojin-test","rulesVersion":4,"maintenance":false,"activeCount":10,"initialized":true}
```

次はCode.gs末尾にcheckTestBattle（scripts/test-project-setup.gsに保持）を追加し、hourlyBattle→checkTestBattleを実行する。同じ時間帯にもう一度hourlyBattle→checkTestBattleを実行し、battleCount/battleSeq/battleIdが変わらないことと、1〜10ターン・全回復・状態異常解除を確認する。時間帯が変わった場合は新しい試合が正常に作られるため、currentHour/completedHourも比較する。トリガー登録はまだ行わない。

## テストGASの初回試合：ユーザー実行ログ

currentHour=completedHour=497888、battleCount=battleSeq=1、battleId=b-hour-497888-0、rulesVersion=4。4ターンでknockout、winner=1、決着時HP=[0,5]。
敗者NPCはstars=0/defeats=1/status=active、永続化HP=7/7。勝者NPCはstars=3/defeats=0/status=active、永続化HP=8/8。resetConfirmed=true。
テストGASによる実Firestoreへの1試合保存、KO報酬、💀1個で生存、試合後のHP・状態のリセットをログで確認した。毒・呪いを実際に受けた試合や10ターン境界をこの1試合で検証したとは扱わない。
ユーザーが同一時間帯にhourlyBattleを再実行した後のログでもcurrentHour=completedHour=497888、battleCount=battleSeq=1、battleId=b-hour-497888-0を維持。双方の星・💀・status・HPも同一、resetConfirmed=true。実テストGASの同一時間帯での再実行による重複試合・成績の再加算がないことを確認した。これは異なるGASプロジェクトの同時競合や応答消失の再送まで検証したものではない。

次はemojin-testのFirestore Consoleへ検証済みfirestore.rulesを貼り付け、テスト用クライアントが認証後に読み書きできるルールへ更新する。クライアントの実保存・再生、iPhone実機、旧データ移行の実テストは引き続き未確認。本番操作・定期トリガー登録は行わない。

## 次の画面準備：Cloud Shellへの直接貼り付け

ユーザーがemojin-testのFirestoreルールを公開したと申告。ブラウザークライアントからの実保存はこれから確認する。
ZIPの添付が利用できず、ユーザーはコードの直接提示を希望しているため、Cloud Shellでテスト画面ファイルを復元する準備スクリプトを /workspace/emojin-test-preview-bootstrap.py に作成した。これは一時生成物で、正本ではない。
スクリプトは既存の公開コミットb474f2afacad827f41f9d3f73be0cacb129e25caから8ファイルを取得し、テスト画面との差分を適用する。取得前後のSHA-256、JS構文、既存出力ディレクトリを上書きしないことを確認する。Firebase接続先・Hosting設定はemojin-test、公開対象はweb/のみ。
/workspace/emojin-test-package/web/と同じ8ファイルが生成されることを /tmp/emojin-test-cloudshell-validation で検証済み。画面やDBの公開・変更、GitHubへのpushは行っていない。
次にユーザーがGoogle Cloud Consoleのemojin-testでCloud Shellを開き、そこへ準備コードを貼る。Firebase Hostingのログイン・テスト画面公開は、その後にユーザー自身の端末内で行う。認証コードやトークンをチャットへ送らせない。

Cloud Shellを開いたとの返信を受領。直接貼り付け用に /workspace/emojin-test-preview-paste.py を作成した。データ量を減らすため、圧縮した行単位の差分を公開コミットの内容に適用する。元ファイルと生成ファイルのSHA-256を全8件照合し、JS構文も確認する。
/tmp/emojin-preview-paste-check/emojin-test-preview で実行成功し、準備済みweb/と一致。ユーザーへはpython3のヒアドキュメントとして全コードを提示する。成功表示は READY: emojin-test-preview (8 files verified). Not deployed yet.。実サイト公開やDB変更は行わない。

## ユーザーの実プレイ確認と最終UI修正

ユーザーがCloud Shellで8ファイルのSHA-256照合成功（READY）を報告し、Firebase CLIへログイン後、テスト画面を実際にプレイして「テストできました。バトルは完璧です」と確認した。端末機種や全境界ケースまで検証したとは扱わない。
追加依頼により、skip後は最終出目・獲得表示でタップ待ち、通常時も獲得表示保持、ナビ内の三点メニュー、星の頂角と数字サイズを修正。最新修正はChromium 320×568・390×844で確認し、Node 58件＋公式エミュレーター11件＋PWA更新検証が成功した。テスト先への最新UIの再配備および本番移行は未実施。
本番更新の依頼を受領したため作業ブランチのGitHub送信を進める。本番mainの公開はデータ移行とメンテナンスゲートに合わせる。まず読み取り専用のscripts/production-preview.gsで本番の実対象を確認する。
