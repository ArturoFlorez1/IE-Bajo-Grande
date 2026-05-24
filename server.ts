import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { generateExam, editQuestion } from "./services/gemini";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API routes
  app.post("/api/generate-exam", async (req, res) => {
    try {
      const { subject, topic, numQuestions, teacherName, numMultipleChoice, numOpenEnded, grade, period, difficulty, taxonomyBloom, generationMode, sourceMaterial } = req.body;
      const data = await generateExam(subject, topic, numQuestions, teacherName, numMultipleChoice, numOpenEnded, grade, period, difficulty, taxonomyBloom, generationMode, sourceMaterial);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/edit-question", async (req, res) => {
    try {
      const { question, instruction } = req.body;
      const data = await editQuestion(question, instruction);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
