# Emotional score
- 画像をAIが分析し、喜び・悲しみ・怒り・驚きの感情を100点満点で点数化します。
- 詳細な評価結果を、音声出力することができます。 

## sample

- **sample_index.html**: htmlのコードです。cloud runのURL、を置き換えて利用ください。
- **sample_code.gs**: gasのコードです。SPREADSHEETのID、シート名、google driveのフォルダID、google api key、VOICEVOX_API_KEY、を置き換えて利用ください。
- **sample_cloudrun_index.js**: cloud runのコードです。Vision APIのキー、を置き換えて利用ください。
- **sample_cloudrun_package.json**: cloud runのコードです。

## URL

- **[sample_index.html](https://sites.google.com/view/emotionalscore/%E3%83%9B%E3%83%BC%E3%83%A0)**
- スマホから利用する場合は、ブラウザでPC版サイトに設定してご利用ください。
- このhtmlは、corsの制限からgoogleのオリジン以外では正しく動作しませんので、ご注意ください。
