const express = require('express');
const { Storage } = require('@google-cloud/storage');
const axios = require('axios');

const app = express();
app.use(express.json());  // JSONパーサーを追加

const storage = new Storage();
const bucketName = 'my-bucket-emotionalscore';  // バケット名を指定
const API_KEY = 'Vision APIのキー';  // Vision APIのキー

// CORS対応のミドルウェアを追加
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // プリフライトリクエスト（OPTIONSリクエスト）への対応
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  next();
});

// POSTリクエストで画像を受け取り、処理する
app.post('/analyzeImage', async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).send({ error: 'Image data is required' });
  }

  try {
    // 画像をCloud Storageにアップロード
    const uploadResponse = await uploadToCloudStorage(image);
    console.log('File uploaded to Cloud Storage:', uploadResponse);

    // Vision APIで画像を解析
    const analysisResult = await analyzeImageWithVision(image);
    console.log('Vision API Analysis Result:', analysisResult);

    res.status(200).send({
      success: true,
      message: 'Image analyzed successfully',
      uploadResponse,
      analysisResult
    });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).send({ error: 'Failed to analyze image' });
  }
});

// 画像をCloud Storageにアップロードする関数
async function uploadToCloudStorage(imageData) {
  const fileName = `image_${Date.now()}.png`;
  const buffer = Buffer.from(imageData.split(',')[1], 'base64');

  const file = storage.bucket(bucketName).file(fileName);
  await file.save(buffer, {
    metadata: { contentType: 'image/png' },
    public: true
  });

  const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
  return { fileName, publicUrl };
}

// Vision APIで画像を解析する関数
async function analyzeImageWithVision(imageData) {
  const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`;
  const requestPayload = {
    requests: [
      {
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
      }
    ]
  };

  const response = await axios.post(visionUrl, requestPayload, {
    headers: { 'Content-Type': 'application/json' }
  });

  return response.data.responses[0];
}

// アプリを起動
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
