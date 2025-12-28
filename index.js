// index.js
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// -------- Middleware --------
app.use(cors());
app.use(express.json({ limit: '10mb' })); // büyük payloadlar için
app.use(express.urlencoded({ extended: true }));

// -------- Rate Limit --------
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 60, // 1 dakikada 60 istek
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// -------- Health Check --------
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running!' });
});

// -------- Solve Route (OpenAI Proxy) --------
app.post('/solve', async (req, res) => {
  try {
    const data = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY missing' });
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process request', details: err.message });
  }
});

// -------- Audio TTS Route --------
app.post('/audio/speech', async (req, res) => {
  try {
    const { input, model = 'tts-1', voice = 'alloy', response_format = 'mp3' } = req.body;

    if (!input) return res.status(400).json({ error: 'Input text required' });

    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      { input, model, voice, response_format },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        responseType: 'arraybuffer',
      }
    );

    res.set('Content-Type', `audio/${response_format}`);
    res.send(Buffer.from(response.data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'TTS failed', details: err.message });
  }
});

// -------- Audio STT Route (Whisper) --------
app.post('/audio/transcriptions', async (req, res) => {
  try {
    if (!req.body.file) return res.status(400).json({ error: 'Audio file required' });

    const formData = new FormData();
    formData.append('file', req.body.file);
    formData.append('model', req.body.model || 'whisper-1');

    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'STT failed', details: err.message });
  }
});

// -------- Start Server --------
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
