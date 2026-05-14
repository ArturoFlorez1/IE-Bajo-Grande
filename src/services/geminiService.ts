/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from "@google/genai";

// Use the system-injected GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateExam(
  subject: string,
  topic: string,
  numQuestions: number,
  teacherName: string,
  questionType: 'multiple-choice' | 'open' | 'mixed',
  grade: string,
  period: string,
  difficulty: string
) {
  try {
    const prompt = `
      Eres un experto en diseño curricular, evaluación educativa y creación de preguntas tipo ICFES/Saber para instituciones educativas colombianas.
      Tu objetivo es generar un examen de alta calidad para el área de ${subject}.
      
      Datos del examen:
      - Grado: ${grade}
      - Período: ${period}
      - Tema: ${topic}
      - Docente: ${teacherName}
      - Cantidad de preguntas: ${numQuestions}
      - Nivel de dificultad: ${difficulty}
      - Tipo de preguntas: ${questionType}

      Directrices pedagógicas:
      - Alineado con: Estándares básicos de competencias, DBA, matrices de referencia del ICFES, procesos cognitivos.
      - Enfoque: Pensamiento crítico, análisis, inferencia, argumentación.
      - Las preguntas NO deben ser memorísticas.
      - Contextualizadas y claras.
      - JSON de salida estricto:
      {
        "examTitle": "Examen de ${subject} - Grado ${grade} - Período ${period}",
        "questions": [
          {
            "grado": "${grade}",
            "periodo": "${period}",
            "tema": "${topic}",
            "competencia": "Competencia evaluada",
            "componente": "Componente evaluado",
            "DBA": "DBA relacionado",
            "evidencia_aprendizaje": "Evidencia",
            "nivel_cognitivo": "Nivel cognitivo",
            "tipo_pregunta": "Selección múltiple o abierta",
            "pregunta": "Texto de la pregunta",
            "texto_base": "Contexto o texto base (opcional)",
            "opciones": {
               "A": "Opcion A",
               "B": "Opcion B",
               "C": "Opcion C",
               "D": "Opcion D"
            },
            "respuesta_correcta": "A | B | C | D",
            "explicacion": "Explicación detallada"
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    // Clean up response just in case
    if (!response.text) {
      throw new Error("No text response from Gemini.");
    }
    const text = response.text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function editQuestion(
  question: any,
  instruction: string
) {
  try {
    const prompt = `
      Eres un asistente pedagógico experto. Tienes la pregunta original: 
      "${question.text}" 
      (Tipo: ${question.type})
      (Respuesta actual: "${question.answer}")
      
      Instrucción de edición: "${instruction}"
      
      Genera la pregunta actualizada manteniendo el mismo formato JSON.
      JSON:
      {
        "id": "${question.id}",
        "type": "${question.type}",
        "text": "Nuevo texto de la pregunta",
        ${question.type === 'multiple-choice' ? '"options": ["A", "B", "C", "D"],' : ''}
        "answer": "Nueva respuesta o explicación"
      }
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    if (!response.text) {
      throw new Error("No text response from Gemini.");
    }
    const text = response.text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
