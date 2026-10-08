# 譜めくり

PDFや紙の楽譜を取り込んで、めくって、書き込める楽譜ビューアです。
iPad・iPhone・Androidのブラウザで動き、ホーム画面に追加するとアプリのように使えます。無料・登録不要で、インターネットにつながっていなくても使えます。

**▶ https://satorun-run.github.io/fumekuri/**

<img src="promo/qr.png" alt="譜めくりを開くQRコード" width="200">

## 使い始め方

1. iPad・iPhoneは **Safari**、Androidは **Chrome** で上のURLを開く（QRコードを読み取ってもOK）
2. 共有ボタン →「**ホーム画面に追加**」（Androidはメニュー →「ホーム画面に追加」または「アプリをインストール」）
3. ホーム画面の「譜めくり」から起動する

初回だけインターネット接続が必要です。2回目からはネットなしでも使えます。
最初は「サンプルで試す」を押すと、練習用の楽譜で操作を試せます。

## できること

- **取り込み**：PDF（複数まとめて可）、紙の楽譜のカメラスキャン（四隅の自動検出・傾き補正・影の除去）
- **めくる**：画面の端をタップ、スワイプ、Bluetoothペダル（矢印キー・PageUp/PageDown・スペース）。横向きで見開き表示
- **ページ設定**：楽譜ごとに見開きの組み方（奇数／偶数ページ始まり）と、表示する最初・最後のページ
- **書き込み**：ペン（7色・筆圧対応）、蛍光ペン（5色）、消しゴム、記号（p・mf・f・cresc.・ブレス・指番号）。書き込み中もページを移動できます
- **書き出し・共有**：書き込み入りのPDF出力、AirDrop・メール・LINEなどでの共有
- **整理**：フォルダ、検索（ひらがな・カタカナを区別しない）、複製、セットリスト（曲順どおりに続けてめくる）
- **バックアップ**：すべての楽譜と書き込みを1つのファイルに書き出し・復元

## 動作環境

- iPad / iPhone：iPadOS・iOS 16 以降の Safari
- Android：Chrome の最新版
- パソコンの Chrome・Edge・Safari でも動きます

## プライバシー

楽譜・書き込み・設定は、お使いの端末の中だけに保存されます。開発者を含む第三者に送られることはありません。アクセス解析や広告も使っていません。
詳しくは [プライバシーポリシーとご利用にあたって](https://satorun-run.github.io/fumekuri/policy.html) をご覧ください。

## ご利用にあたって

- 無料で提供しています。動作の保証はなく、データの消失などについて責任を負いません。大切な楽譜は「設定 → すべての楽譜をバックアップ」で定期的に書き出してください。
- 楽譜は著作権法で認められた範囲でご利用ください。市販の楽譜や著作権のある楽譜を、権利者の許可なく配布・公開しないでください。
- ホーム画面のアイコンを削除すると、保存した楽譜も消えます。

## 不具合の報告・ご意見

[Issues](https://github.com/satorun-run/fumekuri/issues) へお寄せください。

## ライセンス

譜めくり本体（app.js、styles.css などのプログラムとアイコン）：Copyright © 2026 satorun-run. All rights reserved.

次のオープンソースソフトウェアを、改変せずに同梱しています。著作権表示とライセンス全文は [ライセンス表示](https://satorun-run.github.io/fumekuri/licenses.html) にまとめています。

| ソフトウェア | 著作権者 | ライセンス | 全文 |
|---|---|---|---|
| PDF.js 3.11.174 | Mozilla Foundation and contributors | Apache License 2.0 | [licenses/pdfjs-LICENSE.txt](licenses/pdfjs-LICENSE.txt) |
| Adobe CMap Resources | Adobe Systems Incorporated | BSD 3-Clause | [licenses/cmaps-LICENSE.txt](licenses/cmaps-LICENSE.txt) |
| Foxit 標準フォント | PDFium Authors | BSD 3-Clause | [licenses/foxit-LICENSE.txt](licenses/foxit-LICENSE.txt) |
| Liberation Sans フォント | Google Corporation / Red Hat, Inc. | SIL Open Font License 1.1 | [licenses/LICENSE_LIBERATION.txt](licenses/LICENSE_LIBERATION.txt) |
| pdf-lib 1.17.1 | Andrew Dillon | MIT | [licenses/pdf-lib-LICENSE.txt](licenses/pdf-lib-LICENSE.txt) |
| └ @pdf-lib/standard-fonts（Adobe Core 14 AFM を含む） | Andrew Dillon | MIT | [licenses/standard-fonts-LICENSE.txt](licenses/standard-fonts-LICENSE.txt) |
| └ @pdf-lib/upng | Photopea | MIT | [licenses/upng-LICENSE.txt](licenses/upng-LICENSE.txt) |
| └ pako（zlib の移植） | Vitaly Puzrin, Andrei Tuputcyn | MIT（zlib License） | [licenses/pako-LICENSE.txt](licenses/pako-LICENSE.txt) |
| └ tslib | Microsoft Corporation | Apache License 2.0 | [licenses/pdfjs-LICENSE.txt](licenses/pdfjs-LICENSE.txt) |
