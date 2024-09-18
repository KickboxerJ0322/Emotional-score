const SPREADSHEET_ID = 'SPREADSHEETのID';
const SHEET_NAME = 'シート名';
const DRIVE_FOLDER_ID = 'google driveのフォルダID';
const API_KEY = 'google api key';
const VOICEVOX_API_KEY = 'VOICEVOX_API_KEY'; // ここにAPIキーを保存

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

function getVoiceVoxApiKey() {
  return VOICEVOX_API_KEY;
}

function analyzeImage(imageData) {
  const fileName = `image_${new Date().getTime()}.png`; // ファイル名をバッククォートで囲む必要があります
  const blob = Utilities.newBlob(Utilities.base64Decode(imageData.split(',')[1]), 'image/png', fileName);
  const driveFile = DriveApp.getFolderById(DRIVE_FOLDER_ID).createFile(blob);
  
  const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`; // URLもバッククォートで囲む必要があります
  const requestPayload = {
    requests: [{
      image: {
        content: imageData.split(',')[1]
      },
      features: [
        { type: 'LABEL_DETECTION' },
        { type: 'FACE_DETECTION', maxResults: 30 },
        { type: 'LANDMARK_DETECTION' },
        { type: 'LOGO_DETECTION' },
        { type: 'TEXT_DETECTION' },
        { type: 'SAFE_SEARCH_DETECTION' },
        { type: 'IMAGE_PROPERTIES' },
        { type: 'WEB_DETECTION' }
      ]
    }]
  };

  const response = UrlFetchApp.fetch(visionUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(requestPayload)
  });

  const responseData = JSON.parse(response.getContentText());
  const analysisResult = processVisionResponse(responseData, fileName);
  saveAnalysisResult(analysisResult);
  
  return analysisResult;
}

function processVisionResponse(responseData, fileName) {
  const result = responseData.responses[0];
  const faceAnnotations = result.faceAnnotations || [];
  
  // 日本標準時でタイムスタンプを取得し、表示形式を "YYYY/MM/DD HH:MM:SS" に変更
  const jstTimestamp = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false });

  return {
    timestamp: jstTimestamp,
    fileName: fileName,
    emotions: faceAnnotations,  // 各人物の感情データをそのまま保持
    faceScoreText: calculateFaceScore(processEmotions(faceAnnotations)),  // 平均値スコア
    labels: JSON.stringify(result.labelAnnotations || []),
    landmarks: JSON.stringify(result.landmarkAnnotations || []),
    logos: JSON.stringify(result.logoAnnotations || []),
    texts: JSON.stringify(result.textAnnotations || []),
    safeSearch: JSON.stringify(result.safeSearchAnnotation || {}),
    dominantColors: JSON.stringify(result.imagePropertiesAnnotation?.dominantColors || []),
    webEntities: JSON.stringify(result.webDetection?.webEntities || [])
  };
}

function formatEmotions(faceAnnotations) {
  return faceAnnotations.map((face, index) => {
    return `Person ${index + 1}: Joy - ${face.joyLikelihood}, Sorrow - ${face.sorrowLikelihood}, Anger - ${face.angerLikelihood}, Surprise - ${face.surpriseLikelihood}`;
  }).join(' | ');
}

function processEmotions(faceAnnotations) {
  const emotions = { Joy: [], Sorrow: [], Anger: [], Surprise: [] };

  faceAnnotations.forEach(face => {
    const joyLikelihood = face.joyLikelihood;
    const sorrowLikelihood = face.sorrowLikelihood;
    const angerLikelihood = face.angerLikelihood;
    const surpriseLikelihood = face.surpriseLikelihood;

    emotions.Joy.push(likelihoodToScore(joyLikelihood));
    emotions.Sorrow.push(likelihoodToScore(sorrowLikelihood));
    emotions.Anger.push(likelihoodToScore(angerLikelihood));
    emotions.Surprise.push(likelihoodToScore(surpriseLikelihood));
  });

  return {
    Joy: calculateAverage(emotions.Joy),
    Sorrow: calculateAverage(emotions.Sorrow),
    Anger: calculateAverage(emotions.Anger),
    Surprise: calculateAverage(emotions.Surprise)
  };
}

function likelihoodToScore(likelihood) {
  switch (likelihood) {
    case 'VERY_UNLIKELY': return 0;
    case 'UNLIKELY': return 50;
    case 'POSSIBLE': return 80;
    case 'LIKELY': return 90;
    case 'VERY_LIKELY': return 100;
    default: return 0;
  }
}

function calculateAverage(scores) {
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function calculateFaceScore(emotions) {
  return `Joy: ${emotions.Joy}, Sorrow: ${emotions.Sorrow}, Anger: ${emotions.Anger}, Surprise: ${emotions.Surprise}`;
}

function saveAnalysisResult(analysisResult) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const nextRow = lastRow + 1;

  // emotions を適切にフォーマットして、各人物ごとの感情データを保存
  const formattedEmotions = analysisResult.emotions.map((face, index) => {
    return `Person ${index + 1}: Joy - ${face.joyLikelihood}, Sorrow - ${face.sorrowLikelihood}, Anger - ${face.angerLikelihood}, Surprise - ${face.surpriseLikelihood}`;
  }).join(' | ');

  // 11列のデータを保存するために範囲を11列に設定
  sheet.getRange(nextRow, 1, 1, 11).setValues([[
    analysisResult.timestamp,
    analysisResult.fileName,
    formattedEmotions,  // 各人物ごとの感情データを保存
    analysisResult.faceScoreText,  // こちらは合算されたスコア
    analysisResult.labels,
    analysisResult.landmarks,
    analysisResult.logos,
    analysisResult.texts,
    analysisResult.safeSearch,
    analysisResult.dominantColors,
    analysisResult.webEntities
  ]]);
}

function saveAnnotatedImage(imageData, fileName) {
  const blob = Utilities.newBlob(Utilities.base64Decode(imageData.split(',')[1]), 'image/png', `annotated_${fileName}`);
  DriveApp.getFolderById(DRIVE_FOLDER_ID).createFile(blob);
}
