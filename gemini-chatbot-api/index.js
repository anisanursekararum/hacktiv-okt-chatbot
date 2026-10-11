import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = process.env.GEMINI_MODEL;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  const { conversation } = req.body;
  try {
      if (!Array.isArray(conversation)) throw new Error("Conversation must be an array of messages.");
      
      const contents = conversation.map(({ role, text }) => ({
        role,
        parts: [{ text }]
      }));

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          temperature: 0.7,
          maxOutputTokens: 500,
          systemInstructions: "Jawab dengan bahasa indonesia, gunakan bahasa yang santai dan mudah dimengerti. Jangan menulis jawaban yang terlalu panjang, cukup 1-2 paragraf saja.",
        },
      });
    res.status(200).json({result: response.text});
  } catch (error) {
    console.log(error);
    res.status(500).json({message: error.message});
  }
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => 
  {console.log(`Server is running on port ${PORT}`)});
    