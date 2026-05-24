/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Type } from "@google/genai";

// Use the system-injected GEMINI_API_KEY
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Gemini API key missing. Ensure GEMINI_API_KEY is set in your environment.");
}

const ai = new GoogleGenAI({ 
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function generateExam(
  subject: string,
  topic: string,
  numQuestions: number,
  teacherName: string,
  numMultipleChoice: number,
  numOpenEnded: number,
  grade: string,
  period: string,
  difficulty: string,
  taxonomyBloom: string,
  generationMode: 'evaluacion' | 'taller' = 'evaluacion',
  sourceMaterial?: string
) {
  try {
    const isWorkshop = generationMode === 'taller';
    
    const prompt = `
      Eres un consultor pedagógico de élite especializado en currículo colombiano (MEN) y evaluación por competencias.
      Tu tarea es diseñar un ${isWorkshop ? 'TALLER DE REFUERZO PEDAGÓGICO' : 'EXAMEN DE VANGUARDIA'} para la IE Bajo Grande.
      
      CONTEXTO TÉCNICO:
      - Asignatura: ${subject}
      - Grado: ${grade}
      - Período: ${period}
      - Tema/Núcleo: ${topic}
      - Docente: ${teacherName}
      - Nivel de Dificultad: ${difficulty}
      - Enfoque Taxonómico (Bloom): ${taxonomyBloom}
      - Distribución de Preguntas: ${numMultipleChoice} de selección múltiple (única respuesta) y ${numOpenEnded} abiertas (desarrollo).

      ${sourceMaterial ? `MATERIAL DE REFERENCIA (EXTRAÍDO DE PDF):
      """
      ${sourceMaterial}
      """
      Usa este material como base empírica para el contenido.` : ''}

      DIRECTRICES DE CALIDAD:
      1. EXACTAMENTE ${numQuestions} ${isWorkshop ? 'EJERCICIOS/PREGUNTAS' : 'PREGUNTAS'} en total (${numMultipleChoice} de opción múltiple, ${numOpenEnded} abiertas).
      2. Alineación con Derechos Básicos de Aprendizaje (DBA) y Matrices de Referencia del ICFES.
      ${isWorkshop ? '3. Incluye una sección de "FUNDAMENTACIÓN TEÓRICA" (theoreticalSummary) que explique los conceptos clave de forma clara y didáctica (mínimo 3 párrafos).' : '3. Lenguaje académico, profesional y preciso.'}
      4. Si es selección múltiple, las opciones deben ser plausibles.
      5. El 'texto_base' debe ser un estímulo rico.
      ${isWorkshop ? '6. Enfoque del taller: Refuerzo, nivelación y aplicación práctica paso a paso.' : ''}
      7. (Adicional) Calcula un tiempo estimado realista para completar la prueba/taller (estimatedTimeMinutes).
      8. (Adicional) Proporciona una 'rubrica_evaluacion' específica para calificar cada pregunta (muy útil para preguntas abiertas o de desarrollo).
      9. ¡NUEVO! Diseñador de Rúbricas: Crea una "rúbrica global de evaluación" (globalRubric) en formato Markdown estructurada en niveles (Bajo, Básico, Alto, Superior) para calificar todo el instrumento.
      10. ¡NUEVO! Analizador de Cobertura DBA: Analiza qué porcentaje aproximado del estándar se cubre en este instrumento y devuelve 'dbaCoveragePercentage' (0-100) y 'dbaCoverageExplanation' (Breve diagnóstico de 1-2 oraciones).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `Eres un experto pedagógico. Tu tarea es generar un ${isWorkshop ? 'taller' : 'examen'} de EXACTAMENTE ${numQuestions} reactivos con rúbricas de evaluación y tiempo estimado. El formato de salida debe ser JSON estricto.`,
        responseMimeType: "application/json",
        responseSchema: {
           type: Type.OBJECT,
           properties: {
             examTitle: { type: Type.STRING },
             estimatedTimeMinutes: { type: Type.INTEGER, description: "Tiempo estimado en minutos para resolver todo el recurso" },
             theoreticalSummary: { type: Type.STRING, description: "Solo para talleres: Resumen pedagógico del tema." },
             globalRubric: { type: Type.STRING, description: "Rúbrica general en Markdown para la prueba." },
             dbaCoveragePercentage: { type: Type.INTEGER, description: "Porcentaje de cobertura de los DBA (0-100)" },
             dbaCoverageExplanation: { type: Type.STRING, description: "Justificación de la cobertura." },
             questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  grado: { type: Type.STRING },
                  periodo: { type: Type.STRING },
                  tema: { type: Type.STRING },
                  competencia: { type: Type.STRING },
                  componente: { type: Type.STRING },
                  DBA: { type: Type.STRING },
                  evidencia_aprendizaje: { type: Type.STRING },
                  nivel_cognitivo: { type: Type.STRING },
                  tipo_pregunta: { type: Type.STRING },
                  pregunta: { type: Type.STRING },
                  texto_base: { type: Type.STRING },
                  opciones: {
                    type: Type.OBJECT,
                    properties: {
                      A: { type: Type.STRING },
                      B: { type: Type.STRING },
                      C: { type: Type.STRING },
                      D: { type: Type.STRING }
                    }
                  },
                  respuesta_correcta: { type: Type.STRING },
                  explicacion: { type: Type.STRING },
                  rubrica_evaluacion: { type: Type.STRING, description: "Criterio de puntuación o rúbrica breve" }
                },
                required: ["pregunta", "respuesta_correcta", "explicacion", "rubrica_evaluacion"]
              }
            }
          },
          required: ["examTitle", "estimatedTimeMinutes", "globalRubric", "dbaCoveragePercentage", "dbaCoverageExplanation", "questions"]
        }
      }
    });
    
    if (!response.text) {
      throw new Error("No response from Gemini.");
    }
    
    let data = JSON.parse(response.text);
    
    // Safety check for user count request - slice if there are too many
    if (data.questions && data.questions.length > numQuestions) {
       console.warn(`Discrepancy: Requested ${numQuestions}, got ${data.questions.length}. Slicing extra questions.`);
       data.questions = data.questions.slice(0, numQuestions);
    } else if (data.questions && data.questions.length < numQuestions) {
       console.warn(`Discrepancy: Requested ${numQuestions}, got ${data.questions.length}. Under-generation detected.`);
    }
    
    return data;
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
      Eres un asistente pedagógico experto. Tienes la pregunta original (en formato JSON): 
      ${JSON.stringify(question)}
      
      Instrucción de edición del docente: "${instruction}"
      
      Genera la pregunta actualizada manteniendo EXACTAMENTE el mismo formato JSON que recibiste.
      Asegúrate de que los campos sean: pregunta, texto_base, opciones (si aplica), respuesta_correcta, explicacion, competencia, componente, DBA, evidencia_aprendizaje, nivel_cognitivo.
      
      IMPORTANTE: Devuelve SOLO el objeto JSON de la pregunta, sin explicaciones ni bloques de código.
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            grado: { type: Type.STRING },
            periodo: { type: Type.STRING },
            tema: { type: Type.STRING },
            competencia: { type: Type.STRING },
            componente: { type: Type.STRING },
            DBA: { type: Type.STRING },
            evidencia_aprendizaje: { type: Type.STRING },
            nivel_cognitivo: { type: Type.STRING },
            tipo_pregunta: { type: Type.STRING },
            pregunta: { type: Type.STRING },
            texto_base: { type: Type.STRING },
            opciones: {
              type: Type.OBJECT,
              properties: {
                A: { type: Type.STRING },
                B: { type: Type.STRING },
                C: { type: Type.STRING },
                D: { type: Type.STRING }
              }
            },
            respuesta_correcta: { type: Type.STRING },
            explicacion: { type: Type.STRING }
          },
          required: ["pregunta", "respuesta_correcta", "explicacion"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response from Gemini.");
    }
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
