# お知らせ（2026-10-24）

作業ブランチ：`feat/announcements`。2026-10-24、ユーザーからFirestoreルール公開の「完了」を受領。検証済みフロントをmainへ反映してGitHub Pagesの配信内容を確認する。GASの変更・トリガー停止・メンテナンス・データ移行は不要。

## プレイヤー側

- メイン画面左上に🔔。未読なしは不透明度35%＋暗め、未読ありは通常の絵文字。件数バッジは付けない。
- 起動・ログイン後、表示中の約1分ごと、復帰時に取得する。通常取得は1分間キャッシュし、同時取得をまとめる。取得してもモーダルを自動表示しない。
- 🔔を押したときだけ濃い緑のモーダルを開き、公開済みの全本文を掲載日時の降順で表示する。タイトル・日時・個別の詳細画面は表示しない。本文はHTMLとして実行せず、改行を含む文字列として表示する。
- 既読情報はlocalStorageの`emojin.announcements.openedAt.<projectId>`に保存する日時1つだけ。オーナー別・記事別の既読情報やFirestoreへの既読書き込みは作らない。ブラウザー/端末ごとの状態で、別端末へ同期しない。
- 掲載日時が前回の保存日時以降（`publishedAt >= lastOpened`）の本文を太字にする。開いた瞬間の日時を取得し、本文の取得成功後に保存する。その回の太字は変更せず、次回の表示から新しい日時を使う。空の一覧も正常表示なら保存する。
- 読み込みに失敗したり、読み込み中に閉じたりした場合は既読日時を進めない。別タブがより新しい既読日時を保存していた場合も巻き戻さない。localStorageが使えなくても現在のセッション内は動く。
- モーダルを開く際は起動時の古い通信結果を流用せず、その後に新しく取得する。読み込み中に追加された本文を表示しないまま既読扱いにする競合を避ける。
- PWAの更新延期・画面高さ・safe-area・既存スロット背景は維持する。

## Firebaseで追加する方法

1. [本番Firestore](https://console.firebase.google.com/project/emojin-49855/firestore/databases/-default-/data)を開く。
2. 最初だけ「コレクションを開始」を押し、コレクションIDを **`announcements`** にする。
3. 「ドキュメントを追加」。ドキュメントIDは **自動ID** でよい。
4. 次の3項目を入力して保存する。項目名・型は表のとおりにする。

|フィールド|型|入力例|
|---|---|---|
|`body`|string|お知らせ機能を追加しました。|
|`publishedAt`|timestamp|掲載したい日時（通常は現在の日時）|
|`published`|boolean|`true`|

**`title`は不要。** `publishedAt`は日時文字列・数値ではなくFirestoreのtimestamp型を選ぶ。`published`も文字列の`"true"`ではなくboolean型のtrueにする。本文は短い文章を推奨する。改行はそのまま表示する。

追加は新しいドキュメントを作る。修正は該当ドキュメントの`body`を編集する。修正を新たな未読として通知したい場合は`publishedAt`も新しい日時へ変更する。掲載を取り下げる/下書きにする場合は`published:false`。次の取得または一覧を開き直した時点で反映する。公開済み本文は日時順で全件表示し、200件などの上限は付けない。将来の日時を入力しても予約公開にはならない（published:trueなら一覧に出る）。

## 保存・権限と本番反映

`getAnnouncements`は`announcements`を`where('published','==',true)`で読み取り、有効な本文/timestampを確認してクライアントで日時降順に並べる。単一フィールド索引だけで動き、複合索引の追加は不要。個々の既読情報やオーナー情報は書き込まない。

追加するルールは次の部分だけで、既存のゲーム・wallet・config等の権限は維持する。

```text
match /announcements/{id} {
  allow read: if signedIn() && resource.data.published == true;
  allow write: if false;
}
```

認証済みプレイヤーのみ公開済みを読める。下書きの読み取り、アプリからの追加・編集・削除は拒否。Firebaseコンソールの管理者による操作はIAM権限で行う。

本番反映は、ルールを先に公開し、その完了後にフロントをmainへ反映する。お知らせ本文をまだ追加していなくても公開でき、一覧は「お知らせはありません。」となる。この環境はFirebase管理用CLIが未認証の場合、ルールの公開だけユーザーがFirebaseコンソールで行う。ルール追加は既存プレイを停止しない。

## 検証

```sh
node --check app.js
node --check sw.js
node scripts/sync-gas-engine.cjs --check
node --test tests/*.test.cjs
python3 tests/announcements.py
XDG_CONFIG_HOME=/workspace/.emojin-config FIREBASE_EMULATORS_PATH=/workspace/.emojin-emulators \
  FIREBASE_CLI_DISABLE_USAGE_REPORTING=1 RULE_TEST_DEPENDENCIES=/workspace/.emojin-test-tools \
  /workspace/.emojin-test-tools/node_modules/.bin/firebase emulators:exec \
  --project demo-emojin-v4 --only firestore --config /workspace/emojin/firebase.test.json \
  'node --test /workspace/emojin/tests/firestore-rules.cjs'
```

Node全115件成功。Firestore Emulatorの権限・GAS REST統合全30件成功。認証済みの公開済み一覧/単体取得、下書き・未ログイン・未絞込一覧の拒否、クライアント書き込み拒否、既存ゲーム権限を確認した。

Chromium 390×844・320×568で左上🔔、未読/既読の見た目、自動表示なし、本文のみの降順、太字保持、開いた日時の保存と再読込、新着・空状態、250件全件、通信失敗・閉じた古い応答、文字列の安全な表示、DBへの既読書き込みなしを確認。本番Firebaseへのテスト書き込みは行っていない。iPhone実機は未確認。
