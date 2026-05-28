import express from "express";
import { generateExam, editQuestion } from "./services/gemini";

const app = express();
app.use(express.json({ limit: "50mb" }));

app.post("/api/generate-exam", async (req, res) => {
  try {
    const apiKey = req.headers["x-gemini-api-key"] as string;
    if (!apiKey) {
      return res.status(401).json({ error: "No se proporcionó una clave API de Gemini." });
    }
    const { subject, topic, numQuestions, teacherName, numMultipleChoice, numOpenEnded, grade, period, difficulty, taxonomyBloom, generationMode, sourceMaterial } = req.body;
    const data = await generateExam(apiKey, subject, topic, numQuestions, teacherName, numMultipleChoice, numOpenEnded, grade, period, difficulty, taxonomyBloom, generationMode, sourceMaterial);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/edit-question", async (req, res) => {
  try {
    const apiKey = req.headers["x-gemini-api-key"] as string;
    if (!apiKey) {
      return res.status(401).json({ error: "No se proporcionó una clave API de Gemini." });
    }
    const { question, instruction } = req.body;
    const data = await editQuestion(apiKey, question, instruction);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
