/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, ChangeEvent, useEffect } from 'react';
import { Trash, Edit, Download, X, GraduationCap, ChevronLeft, Calendar, User, FileText, BarChart, Info, BookOpen, FileUp, Sparkles, Settings2, Target, Layers, History, Copy, Check, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import * as pdfjs from 'pdfjs-dist';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import AcademicGuide from './components/AcademicGuide';

// Client-side API wrappers
const api = {
  generateExam: async (payload: any) => {
    const res = await fetch('/api/generate-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  editQuestion: async (payload: any) => {
    const res = await fetch('/api/edit-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};

// Setup PDF.js worker using URL constructor for compatibility and types
const pdfWorkerUrl = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const shuffleArray = (array: any[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const SUBJECTS = [
  "Ciencias Naturales y Educación Ambiental",
  "C. Sociales, Hist. Geo. Const. y Demo",
  "Educación Artística y Cultural",
  "Educación Ética y en Valores Humanos",
  "Educación Física, Recreación y Deporte",
  "Educación Religiosa",
  "Humanidades (Lengua Castellana)",
  "Humanidades (Inglés)",
  "Matemáticas",
  "Tecnología e Informática",
  "Primeros Auxilios",
  "Prácticas Agropecuarias",
  "Física"
];

export default function App() {
  const [examState, setExamState] = useState({
    subject: '',
    topic: '',
    teacherName: '',
    grade: '',
    period: '',
    difficulty: 'Media',
    numQuestions: 5,
    taxonomyBloom: 'Crear',
    generationMode: 'evaluacion' as 'evaluacion' | 'taller',
    numMultipleChoice: 5,
    numOpenEnded: 0,
    attemptedSubmit: false,
    examGenerated: false,
    examData: { examTitle: '', theoreticalSummary: '', globalRubric: '', dbaCoveragePercentage: 0, dbaCoverageExplanation: '', estimatedTimeMinutes: 0, questions: [] as any[] },
    loading: false,
    error: null as string | null
  });
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);

  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  const [savedExams, setSavedExams] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loaded = localStorage.getItem('school_exam_history');
    if (loaded) {
      try {
        setSavedExams(JSON.parse(loaded));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const saveToHistory = (examData: any, config: any) => {
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      config,
      examData
    };
    const updated = [newEntry, ...savedExams].slice(0, 50); // Keep last 50
    setSavedExams(updated);
    localStorage.setItem('school_exam_history', JSON.stringify(updated));
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setIsExtracting(true);
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const typedarray = new Uint8Array(reader.result as ArrayBuffer);
          const pdf = await pdfjs.getDocument(typedarray).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
          }
          setPdfText(fullText);
          setIsExtracting(false);
          // Auto-fill topic if empty
          if (!examState.topic) {
            setExamState(prev => ({ ...prev, topic: `Evaluación basada en: ${file.name}` }));
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (error) {
        console.error("Error extraction PDF:", error);
        setExamState(prev => ({ ...prev, error: "No se pudo leer el PDF. Intente con otro archivo." }));
        setIsExtracting(false);
      }
    }
  };

  const handleGenerate = async () => {
    setExamState(prev => ({ ...prev, attemptedSubmit: true }));
    if (!examState.subject || !examState.topic || !examState.grade || !examState.teacherName || !examState.period) {
      setExamState(prev => ({ ...prev, error: 'Por favor complete todos los campos obligatorios.' }));
      return;
    }
    if ((examState.numMultipleChoice + examState.numOpenEnded) !== examState.numQuestions) {
      setExamState(prev => ({ ...prev, error: 'La suma de las preguntas de selección múltiple y abiertas debe ser igual al Total de Preguntas.' }));
      return;
    }
    setExamState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await api.generateExam({
        ...examState,
        sourceMaterial: pdfText
      });
      setExamState(prev => ({ ...prev, loading: false, examGenerated: true, examData: data }));
      saveToHistory(data, examState);
    } catch (error: any) {
      console.error(error);
      let errorMsg = 'Hubo un error al generar el examen. Por favor, intenta de nuevo.';
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        errorMsg = 'Se ha agotado la cuota de la API (Error 429). Por favor, intenta de nuevo en unos minutos.';
      }
      setExamState(prev => ({ ...prev, loading: false, error: errorMsg }));
    }
  };

  const handleEditQuestion = async () => {
    if (!editingQuestion || !editInstruction) return;
    setIsEditing(true);
    try {
      const updatedQuestion = await api.editQuestion({
        question: editingQuestion, 
        instruction: editInstruction
      });
      setExamState(prev => ({
        ...prev,
        examData: {
          ...prev.examData,
          questions: prev.examData.questions.map((q: any) => q.id === (editingQuestion.id || q.id) ? { ...updatedQuestion, id: q.id } : q)
        }
      }));
      setEditingQuestion(null);
      setEditInstruction('');
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert('Error editando pregunta');
      setIsEditing(false);
    }
  };

  const deleteQuestion = (id: string) => {
    setExamState(prev => ({
      ...prev,
      examData: {
        ...prev.examData,
        questions: prev.examData.questions.filter((q: any) => (q.id || q.idx) !== id)
      }
    }));
  };

  const downloadPDF = (includeAnswers: boolean, version: 'A' | 'B' = 'A') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 20;
    const marginRight = 20;
    const textWidth = pageWidth - marginLeft - marginRight;
    let y = 20;

    const addText = (text: string, size: number, style: string = 'normal', color: string = 'black', align: 'left' | 'center' = 'left') => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.setTextColor(color);
      const splitText = doc.splitTextToSize(text, textWidth);
      
      splitText.forEach((line: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        if (align === 'center') {
          doc.text(line, pageWidth / 2, y, { align: 'center' });
        } else {
          doc.text(line, marginLeft, y);
        }
        y += size / 2 + 3;
      });
      y += 2;
    };

    const isWorkshop = examState.generationMode === 'taller';
    let baseTitle = examState.examData.examTitle || (isWorkshop ? 'Guía de Refuerzo Pedagógico' : 'Evaluación Académica');
    if (version === 'B') baseTitle += ' - Versión B';
    else baseTitle += ' - Versión A';
    
    // Header Academic Look
    doc.setFillColor(30, 58, 138); // blue-900
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    addText(baseTitle, 18, 'bold', 'white', 'center'); y = 45;
    
    addText(`Institución Educativa: IE Bajo Grande`, 12, 'bold', '#1e3a8a');
    addText(`Docente: ${examState.teacherName}`, 11, 'normal');
    addText(`Asignatura: ${examState.subject}  |  Periodo: ${examState.period}`, 11, 'normal');
    addText(`Tema/Núcleo: ${examState.topic}`, 11, 'normal');
    addText(`Grado: ${examState.grade}  |  Recurso: ${isWorkshop ? 'Taller de Refuerzo' : 'Evaluación'}  |  Bloom: ${examState.taxonomyBloom}`, 11, 'normal');
    addText(`Fecha: _________________  |  Estudiante: __________________________________________`, 11, 'normal');
    y += 10;
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 15;

    if (isWorkshop && examState.examData.theoreticalSummary) {
      addText('FUNDAMENTACIÓN TEÓRICA', 13, 'bold', '#1e3a8a');
      doc.setFillColor(241, 245, 249);
      const summaryText = examState.examData.theoreticalSummary;
      const splitSummary = doc.splitTextToSize(summaryText, textWidth);
      doc.rect(marginLeft - 2, y - 4, textWidth + 4, (splitSummary.length * 6), 'F');
      addText(summaryText, 10, 'normal', '#334155');
      y += 10;
      addText('ACTIVIDADES PRÁCTICAS', 13, 'bold', '#1e3a8a');
      y += 5;
    }

    let questionsToPrint = [...examState.examData.questions];
    if (version === 'B') {
      questionsToPrint = shuffleArray(questionsToPrint).map(q => {
        if (q.opciones && Object.keys(q.opciones).length > 0) {
           const opts = Object.entries(q.opciones);
           const correctValue = q.opciones[q.respuesta_correcta as keyof typeof q.opciones];
           const shuffledVals = shuffleArray(opts.map(o => o[1]));
           const keys = ['A', 'B', 'C', 'D'].slice(0, shuffledVals.length);
           const newOpciones: Record<string, string> = {};
           let newCorrect = q.respuesta_correcta;
           keys.forEach((k, i) => {
             newOpciones[k] = shuffledVals[i] as string;
             if (shuffledVals[i] === correctValue) {
               newCorrect = k;
             }
           });
           return { ...q, opciones: newOpciones, respuesta_correcta: newCorrect };
        }
        return q;
      });
    }

    questionsToPrint.forEach((q: any, idx: number) => {
      if (y > 250) { doc.addPage(); y = 20; }
      
      addText(`${idx + 1}. ${q.pregunta}`, 12, 'bold');
      
      if (q.texto_base) {
        doc.setFillColor(248, 250, 252);
        const splitBase = doc.splitTextToSize(`Contexto: ${q.texto_base}`, textWidth);
        doc.rect(marginLeft - 2, y - 4, textWidth + 4, (splitBase.length * 6), 'F'); 
        addText(`Contexto: ${q.texto_base}`, 10, 'italic', '#475569');
      }

      if (q.opciones) {
        Object.entries(q.opciones).forEach(([key, val]) => {
          addText(`   ${key}) ${val}`, 10, 'normal');
        });
      }

      if (includeAnswers) {
        y += 2;
        addText(`Respuesta: ${q.respuesta_correcta}`, 10, 'bold', '#0f766e');
        addText(`Explicación: ${q.explicacion}`, 9, 'normal', '#334155');
        y += 4;
      }
      y += 8;
    });
    
    
    doc.save(`Examen_${examState.subject.replace(/ /g, '_')}_${version}_${includeAnswers ? 'docente' : 'estudiante'}.pdf`);
  };

  const copyToClipboard = () => {
    if (!examState.examData.questions) return;
    
    const isWorkshop = examState.generationMode === 'taller';
    let textOut = `${examState.examData.examTitle || (isWorkshop ? 'Guía de Refuerzo' : 'Evaluación')}\n`;
    textOut += `Docente: ${examState.teacherName} | Asignatura: ${examState.subject}\n`;
    textOut += `Tema: ${examState.topic} | Grado: ${examState.grade} | Periodo: ${examState.period}\n`;
    textOut += `Tiempo Estimado: ${examState.examData.estimatedTimeMinutes || '--'} min\n\n`;

    if (isWorkshop && examState.examData.theoreticalSummary) {
      textOut += `FUNDAMENTACIÓN TEÓRICA\n${examState.examData.theoreticalSummary}\n\n`;
    }

    textOut += `PREGUNTAS\n\n`;

    examState.examData.questions.forEach((q: any, idx: number) => {
      textOut += `${idx + 1}. ${q.pregunta}\n`;
      if (q.texto_base) textOut += `[Contexto]: ${q.texto_base}\n`;
      if (q.opciones) {
        Object.entries(q.opciones).forEach(([k, v]) => {
          textOut += `   ${k}) ${v}\n`;
        });
      }
      textOut += `\n`;
    });

    navigator.clipboard.writeText(textOut);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <header className="mb-12 text-center max-w-5xl mx-auto relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-200/20 blur-3xl -z-10 rounded-full"></div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-6"
        >
          <div className="bg-indigo-600 p-4 rounded-3xl shadow-2xl shadow-indigo-200 ring-8 ring-indigo-50">
            <GraduationCap className="text-white" size={48} />
          </div>
        </motion.div>
        <h1 className="text-5xl md:text-6xl font-serif font-extrabold tracking-tight text-slate-900">
          IE Bajo Grande
        </h1>
        <div className="flex items-center justify-center gap-4 mt-6">
          <span className="h-px w-16 bg-slate-200"></span>
          <p className="text-xl font-serif font-medium text-slate-500 uppercase tracking-widest">
            Vanguardia Educativa & IA
          </p>
          <span className="h-px w-16 bg-slate-200"></span>
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer group" onClick={() => setShowHistory(true)}>
          <div className="bg-white px-5 py-3 rounded-full shadow-lg shadow-indigo-100 border border-slate-100 flex items-center gap-3 hover:border-indigo-300 hover:shadow-indigo-200 transition-all">
            <History size={20} className="text-indigo-500 group-hover:-rotate-45 transition-transform" />
            <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Historial ({savedExams.length})</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl">
        <AcademicGuide />

        <main className="relative">
          <AnimatePresence mode="wait">
            {!examState.examGenerated ? (
              <motion.div 
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid gap-8 lg:grid-cols-12"
              >
                {/* Section 1: Institutional Context */}
                <section className="lg:col-span-12 xl:col-span-4 space-y-6">
                  <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 h-full">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                        <GraduationCap size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Contexto Institucional</h2>
                        <p className="text-sm text-slate-500 font-medium tracking-tight">Identidad y grado escolar</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200">
                        <button 
                          onClick={() => setExamState({ ...examState, generationMode: 'evaluacion' })}
                          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${examState.generationMode === 'evaluacion' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Evaluación
                        </button>
                        <button 
                          onClick={() => setExamState({ ...examState, generationMode: 'taller' })}
                          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${examState.generationMode === 'taller' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Taller
                        </button>
                      </div>

                      <div className="group">
                        <label className={`text-[11px] font-bold uppercase tracking-[0.2em] mb-2 block pl-1 ${examState.attemptedSubmit && !examState.teacherName ? 'text-rose-500' : 'text-slate-400'}`}>Docente Responsable (Requerido)</label>
                        <div className="relative group-focus-within:scale-[1.01] transition-transform">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                          <input type="text" className={`w-full rounded-2xl border p-4 pl-12 transition-all outline-none font-medium ${examState.attemptedSubmit && !examState.teacherName ? 'border-rose-300 bg-rose-50 focus:border-rose-500 ring-4 ring-rose-100 placeholder:text-rose-300' : 'border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300'}`} value={examState.teacherName} placeholder="Nombre completo" onChange={(e) => setExamState({ ...examState, teacherName: e.target.value })} />
                        </div>
                      </div>

                      <div className="group">
                        <label className={`text-[11px] font-bold uppercase tracking-[0.2em] mb-2 block pl-1 ${examState.attemptedSubmit && !examState.subject ? 'text-rose-500' : 'text-slate-400'}`}>Asignatura (Requerido)</label>
                        <select className={`w-full rounded-2xl border p-4 transition-all outline-none font-medium appearance-none cursor-pointer ${examState.attemptedSubmit && !examState.subject ? 'border-rose-300 bg-rose-50 focus:border-rose-500 ring-4 ring-rose-100 text-rose-700' : 'border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300'}`} value={examState.subject} onChange={(e) => setExamState({ ...examState, subject: e.target.value })}>
                          <option value="">Seleccione asignatura...</option>
                          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                          <label className={`text-[11px] font-bold uppercase tracking-[0.2em] mb-2 block pl-1 ${examState.attemptedSubmit && !examState.grade ? 'text-rose-500' : 'text-slate-400'}`}>Grado (Requerido)</label>
                          <select className={`w-full rounded-2xl border p-4 transition-all outline-none font-medium appearance-none cursor-pointer ${examState.attemptedSubmit && !examState.grade ? 'border-rose-300 bg-rose-50 focus:border-rose-500 ring-4 ring-rose-100 text-rose-700' : 'border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300'}`} value={examState.grade} onChange={(e) => setExamState({ ...examState, grade: e.target.value })}>
                            <option value="">Grado...</option>
                            {[5,6,7,8,9,10,11].map((g) => <option key={g} value={`${g}º`}>{g}º Prim/Sec</option>)}
                          </select>
                        </div>
                        <div className="group">
                          <label className={`text-[11px] font-bold uppercase tracking-[0.2em] mb-2 block pl-1 ${examState.attemptedSubmit && !examState.period ? 'text-rose-500' : 'text-slate-400'}`}>Periodo (Requerido)</label>
                          <select className={`w-full rounded-2xl border p-4 transition-all outline-none font-medium appearance-none cursor-pointer ${examState.attemptedSubmit && !examState.period ? 'border-rose-300 bg-rose-50 focus:border-rose-500 ring-4 ring-rose-100 text-rose-700' : 'border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300'}`} value={examState.period} onChange={(e) => setExamState({ ...examState, period: e.target.value })}>
                            <option value="">Periodo...</option>
                            {[1,2,3,4].map((p) => <option key={p} value={`Período ${p}`}>{p}º Trimestre</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 2: Pedagogical Settings */}
                <section className="lg:col-span-12 xl:col-span-8 space-y-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                          <Settings2 size={24} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">Configuración Pedagógica</h2>
                          <p className="text-sm text-slate-500 font-medium tracking-tight">Complejidad y estructura</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="group">
                            <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 block pl-1">Taxonomía Bloom</label>
                            <select className="w-full rounded-2xl border border-slate-200 p-4 bg-slate-50/50 focus:bg-white transition-all outline-none font-medium appearance-none cursor-pointer" value={examState.taxonomyBloom} onChange={(e) => setExamState({ ...examState, taxonomyBloom: e.target.value as any })}>
                              <option value="Recordar">Recordar</option>
                              <option value="Comprender">Comprender</option>
                              <option value="Aplicar">Aplicar</option>
                              <option value="Analizar">Analizar</option>
                              <option value="Evaluar">Evaluar</option>
                              <option value="Crear">Crear (Síntesis)</option>
                            </select>
                          </div>
                          <div className="group">
                            <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 block pl-1">Dificultad</label>
                            <select className="w-full rounded-2xl border border-slate-200 p-4 bg-slate-50/50 focus:bg-white transition-all outline-none font-medium appearance-none cursor-pointer" value={examState.difficulty} onChange={(e) => setExamState({ ...examState, difficulty: e.target.value })}>
                              <option value="Baja">Baja (Refuerzo)</option>
                              <option value="Media">Media (Estándar)</option>
                              <option value="Alta">Alta (Excelencia)</option>
                            </select>
                          </div>
                        </div>

                        <div className={`p-5 rounded-3xl border transition-all ${examState.attemptedSubmit && (examState.numQuestions !== (examState.numMultipleChoice + examState.numOpenEnded)) ? 'border-rose-300 bg-rose-50/30 ring-4 ring-rose-50' : 'border-slate-100 bg-slate-50/50'}`}>
                          <div className="group mb-5">
                            <label className={`text-[11px] font-bold uppercase tracking-[0.2em] mb-2 block pl-1 ${examState.attemptedSubmit && (examState.numQuestions !== (examState.numMultipleChoice + examState.numOpenEnded)) ? 'text-rose-500' : 'text-slate-900'}`}>Total Preguntas (Requerido)</label>
                            <input type="number" min="1" max="25" className={`w-full rounded-2xl border p-4 bg-white transition-all outline-none font-black text-center text-lg ${examState.attemptedSubmit && (examState.numQuestions !== (examState.numMultipleChoice + examState.numOpenEnded)) ? 'border-rose-300 focus:border-rose-500 text-rose-700' : 'border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100'}`} value={examState.numQuestions} onChange={(e) => setExamState({ ...examState, numQuestions: parseInt(e.target.value) || 1, numMultipleChoice: parseInt(e.target.value) || 1, numOpenEnded: 0 })} />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="group">
                              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2 block pl-1">Múltiple</label>
                              <input type="number" min="0" max={examState.numQuestions} className="w-full rounded-2xl border border-slate-200 p-3 bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 transition-all outline-none font-bold text-center" value={examState.numMultipleChoice} onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setExamState(prev => ({ 
                                  ...prev, 
                                  numMultipleChoice: val > prev.numQuestions ? prev.numQuestions : val,
                                  numOpenEnded: prev.numQuestions - (val > prev.numQuestions ? prev.numQuestions : val)
                                }));
                              }} />
                            </div>
                            <div className="group">
                              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2 block pl-1">Abiertas</label>
                              <input type="number" min="0" max={examState.numQuestions} className="w-full rounded-2xl border border-slate-200 p-3 bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 transition-all outline-none font-bold text-center" value={examState.numOpenEnded} onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setExamState(prev => ({ 
                                  ...prev, 
                                  numOpenEnded: val > prev.numQuestions ? prev.numQuestions : val,
                                  numMultipleChoice: prev.numQuestions - (val > prev.numQuestions ? prev.numQuestions : val)
                                }));
                              }} />
                            </div>
                          </div>
                          {examState.attemptedSubmit && (examState.numQuestions !== (examState.numMultipleChoice + examState.numOpenEnded)) && (
                            <p className="text-xs font-bold text-rose-500 text-center mt-4">⚠️ La suma debe ser exactamente {examState.numQuestions}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                          <BookOpen size={24} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">Material de Referencia</h2>
                          <p className="text-sm text-slate-500 font-medium tracking-tight">Contexto real (PDF)</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex-grow relative group">
                        <div className={`relative border-2 border-dashed rounded-[1.5rem] p-6 transition-all flex flex-col items-center justify-center text-center h-full group-hover:scale-[1.02] ${pdfFile ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-400'}`}>
                          <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                          {isExtracting ? (
                            <div className="flex flex-col items-center gap-3">
                              <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full shadow-lg shadow-indigo-100"></div>
                              <p className="text-sm font-bold text-indigo-900">Extrayendo Conocimiento...</p>
                            </div>
                          ) : pdfFile ? (
                            <div className="flex flex-col items-center gap-3">
                               <div className="p-4 bg-emerald-100 rounded-2xl text-emerald-700 shadow-sm"><FileUp size={32} /></div>
                               <p className="text-sm font-bold text-emerald-900 max-w-[200px] truncate">{pdfFile.name}</p>
                               <button onClick={(e) => { e.stopPropagation(); setPdfFile(null); setPdfText(''); }} className="text-xs text-red-500 font-black tracking-widest uppercase hover:underline">Remover</button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-4">
                               <div className="p-4 bg-indigo-100 rounded-2xl text-indigo-600 shadow-sm"><FileUp size={32} /></div>
                               <div>
                                 <p className="text-sm font-bold text-slate-700">Explorar Malla Curricular</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 px-4">PDF Máx. 10MB • Analizado para generar preguntas reales</p>
                               </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Topic (Large) */}
                  <div className="bg-white rounded-[2rem] p-8 shadow-2xl shadow-indigo-100/50 border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/50 rounded-bl-[10rem] -mr-16 -mt-16 pointer-events-none"></div>
                    
                    <div className="flex items-center gap-4 mb-6 relative">
                      <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                        <Target size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900">Núcleo Temático Principal</h2>
                        <p className={`text-sm font-medium tracking-tight italic ${examState.attemptedSubmit && !examState.topic ? 'text-rose-500' : 'text-slate-500'}`}>Especifique el tema, competencia o DBA a evaluar (Requerido)</p>
                      </div>
                    </div>

                    <div className="relative">
                      <textarea 
                        className={`w-full rounded-2xl border p-6 transition-all outline-none min-h-[160px] text-lg font-serif leading-relaxed ${examState.attemptedSubmit && !examState.topic ? 'border-rose-300 bg-rose-50 focus:border-rose-500 ring-4 ring-rose-100 placeholder:text-rose-300' : 'border-slate-200 bg-slate-50/30 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 placeholder:text-slate-300'}`} 
                        placeholder="Ej: Análisis de la biodiversidad en ecosistemas tropicales y su relación con el desarrollo sostenible..." 
                        value={examState.topic} 
                        onChange={(e) => setExamState({ ...examState, topic: e.target.value })} 
                      />
                    </div>

                    {examState.error && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 rounded-2xl bg-rose-50 p-4 text-rose-700 text-sm font-bold border border-rose-100 flex gap-3 items-center">
                        <Info size={20} /> {examState.error}
                      </motion.div>
                    )}

                    <button 
                      className="w-full mt-8 rounded-[2rem] bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-900 px-8 py-7 font-black text-white hover:shadow-2xl hover:shadow-indigo-500/40 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-70 text-xl flex items-center justify-center gap-4 transform hover:-translate-y-1 active:scale-[0.98] border border-white/10" 
                      onClick={handleGenerate} 
                      disabled={examState.loading || isExtracting}
                    >
                      {examState.loading ? (
                        <>
                          <div className="animate-spin h-6 w-6 border-3 border-white border-t-transparent rounded-full"></div>
                          <span>Tejiendo Evaluación Pedagógica...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={24} className="animate-pulse" />
                          <span>Generar Evaluación Académica de Vanguardia</span>
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div 
                key="results"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid gap-10"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200 border border-slate-100">
                  <div>
                    <button className="flex items-center gap-2 text-xs text-slate-400 hover:text-indigo-600 mb-3 font-black uppercase tracking-[0.2em] transition-colors" onClick={() => setExamState(prev => ({ ...prev, examGenerated: false }))}>
                      <ChevronLeft size={16} /> Configuración Base
                    </button>
                    <h2 className="text-4xl font-serif font-black text-slate-900 leading-tight">
                      {examState.generationMode === 'taller' ? 'Guía de Refuerzo Diseñada' : 'Diseño Evaluativo Generado'}
                    </h2>
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <p className="text-indigo-600 font-bold flex items-center gap-2 italic text-sm">
                        <Layers size={18} /> {examState.examData.questions.length} {examState.generationMode === 'taller' ? 'Actividades' : 'Reactivos'}
                      </p>
                      {examState.examData.estimatedTimeMinutes && (
                        <>
                          <span className="hidden sm:block w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                          <p className="text-slate-500 font-bold flex items-center gap-2 italic text-sm">
                            <Clock size={18} className="text-amber-500" /> {examState.examData.estimatedTimeMinutes} min
                          </p>
                        </>
                      )}
                      {examState.examData.dbaCoveragePercentage && (
                         <>
                           <span className="hidden sm:block w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                           <div className="flex items-center gap-2 group/dba relative cursor-help">
                             <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-black">
                               <Target size={14} /> {examState.examData.dbaCoveragePercentage}% Cobertura DBA
                             </div>
                             <div className="absolute top-full mt-2 left-0 sm:left-1/2 sm:-translate-x-1/2 w-64 bg-slate-800 text-white text-xs p-3 rounded-xl opacity-0 group-hover/dba:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                               {examState.examData.dbaCoverageExplanation}
                             </div>
                           </div>
                         </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 w-full md:w-auto">
                    <div className="flex gap-2">
                       <button className="flex-1 md:flex-none justify-center items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-indigo-700 font-bold hover:bg-indigo-100 transition-all border border-indigo-100 text-sm flex" onClick={() => downloadPDF(false, 'A')}>
                         <Download size={16} /> Est. A
                       </button>
                       <button className="flex-1 md:flex-none justify-center items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-indigo-700 font-bold hover:bg-indigo-100 transition-all border border-indigo-100 text-sm flex" onClick={() => downloadPDF(false, 'B')}>
                         <Download size={16} /> Est. B
                       </button>
                    </div>
                    <div className="flex gap-2">
                       <button className="flex-1 md:flex-none justify-center items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white font-bold hover:bg-black transition-all text-sm flex" onClick={() => downloadPDF(true, 'A')}>
                         <Download size={16} className="text-indigo-300" /> Clave A
                       </button>
                       <button className="flex-1 md:flex-none justify-center items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white font-bold hover:bg-black transition-all text-sm flex" onClick={() => downloadPDF(true, 'B')}>
                         <Download size={16} className="text-indigo-300" /> Clave B
                       </button>
                       <button className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-3 text-slate-600 font-bold hover:bg-slate-50 hover:text-indigo-600 transition-all border border-slate-200 shadow-sm text-sm" title="Copiar Texto" onClick={copyToClipboard}>
                         {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                       </button>
                    </div>
                  </div>
                </div>

                {examState.examData.globalRubric && (
                  <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-10 shadow-xl shadow-slate-200 border-l-[12px] border-l-rose-500"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                        <Target size={24} />
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Rúbrica Global de Evaluación</h2>
                    </div>
                    <div className="prose prose-slate max-w-none text-slate-700 bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100/50 prose-tables:border-collapse prose-td:border prose-td:border-slate-200 prose-td:p-3 prose-th:border prose-th:border-slate-200 prose-th:p-3 prose-th:bg-slate-100 text-sm">
                      <Markdown>{examState.examData.globalRubric}</Markdown>
                    </div>
                  </motion.section>
                )}

                {examState.generationMode === 'taller' && examState.examData.theoreticalSummary && (
                  <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-xl shadow-slate-200 border-l-[12px] border-l-indigo-600"
                  >
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                        <Sparkles size={24} />
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Fundamentación Teórica de Refuerzo</h2>
                    </div>
                    <div className="prose prose-slate max-w-none">
                      <div className="whitespace-pre-wrap font-serif text-lg text-slate-700 leading-relaxed leading-extra">
                        {examState.examData.theoreticalSummary}
                      </div>
                    </div>
                  </motion.section>
                )}

                <div className="space-y-10">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="h-px flex-grow bg-slate-200"></div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] px-4">
                      {examState.generationMode === 'taller' ? 'Desarrollo Práctico & Aplicación' : 'Componentes Evaluativos'}
                    </span>
                    <div className="h-px flex-grow bg-slate-200"></div>
                  </div>
                  {examState.examData.questions.map((q: any, idx: number) => (
                    <motion.div 
                      key={q.id || idx} 
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                      className="group bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-2xl shadow-slate-100 hover:shadow-indigo-100/40 transition-all relative"
                    >
                      <div className="absolute top-10 right-10 flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                        <button className="p-3 bg-indigo-50 rounded-2xl text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Perfeccionar con IA" onClick={() => { setEditingQuestion(q); setEditInstruction(''); }}>
                          <Edit size={20}/>
                        </button>
                        <button className="p-3 bg-rose-50 rounded-2xl text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Descartar" onClick={() => deleteQuestion(q.id || idx)}>
                          <Trash size={20}/>
                        </button>
                      </div>

                      <div className="mb-8 flex items-center gap-4">
                        <span className="flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-lg shadow-indigo-200">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex gap-2">
                             <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{q.nivel_cognitivo}</span>
                             <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{q.tipo_pregunta}</span>
                          </div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Instrumento de Evaluación Académica</p>
                        </div>
                      </div>

                      {q.texto_base && (
                        <div className="mb-8 p-10 bg-slate-50/50 border border-slate-100 rounded-[2rem] relative overflow-hidden group/text">
                          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-400"></div>
                          <p className="font-serif font-black text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest text-[11px]">
                            <BookOpen size={16} className="text-indigo-400" /> Contextualización / Estímulo:
                          </p>
                          <div className="leading-relaxed font-serif text-lg text-slate-700">{q.texto_base}</div>
                        </div>
                      )}

                      <h3 className="font-serif font-bold text-2xl text-slate-900 mb-8 leading-[1.35] lg:text-3xl pr-16">{q.pregunta}</h3>
                      
                      {q.opciones && Object.keys(q.opciones).length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                          {Object.entries(q.opciones).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-6 bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all hover:translate-x-1 cursor-default group/opt">
                              <span className="font-black text-indigo-700 bg-white w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-slate-100 group-hover/opt:bg-indigo-600 group-hover/opt:text-white transition-colors">{key}</span> 
                              <span className="font-medium text-slate-700 text-lg">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <footer className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 border-t border-slate-100">
                        <article className="lg:col-span-12 xl:col-span-7 bg-emerald-50/30 p-8 rounded-[2rem] border border-emerald-100/50">
                          <div className="flex items-center gap-2 mb-4">
                            <Target className="text-emerald-600" size={18} />
                            <p className="text-[11px] font-black uppercase text-emerald-800 tracking-[0.2em]">Resolución de Reactivo</p>
                          </div>
                          <p className="font-black text-emerald-900 text-2xl mb-2 flex items-center gap-3">
                            Opción Correcta: <span className="text-indigo-600 bg-white px-4 py-1 rounded-xl shadow-sm border border-emerald-100">{q.respuesta_correcta}</span>
                          </p>
                          <p className="text-emerald-700/80 font-medium leading-relaxed italic border-l-4 border-emerald-200 pl-4 mt-4 select-none">
                            {q.explicacion}
                          </p>
                        </article>
                        
                        <aside className="lg:col-span-12 xl:col-span-5 grid grid-cols-2 gap-4">
                          {[
                            { label: 'Eje Temático', value: q.competencia, icon: Target },
                            { label: 'Componente', value: q.componente, icon: Layers },
                            { label: 'Derecho Básico', value: q.DBA, icon: Target },
                            { label: 'Grado/Per.', value: `${q.grado} | ${q.periodo}`, icon: Calendar }
                          ].map((item, i) => (
                            <div key={i} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group-hover:scale-[1.02] transition-transform">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <item.icon size={10} className="text-indigo-300" /> {item.label}
                              </p>
                              <p className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight" title={item.value}>{item.value}</p>
                            </div>
                          ))}
                        </aside>

                        {q.rubrica_evaluacion && (
                          <div className="lg:col-span-12 mt-2 pt-6 border-t border-slate-100 border-dashed">
                            <div className="bg-amber-50/50 rounded-[1.5rem] p-6 border border-amber-100/50">
                              <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest mb-3 flex items-center gap-2">
                                <Target size={14} /> Rúbrica Integradora Sugerida
                              </p>
                              <p className="font-medium text-amber-900 leading-relaxed text-sm">
                                {q.rubrica_evaluacion}
                              </p>
                            </div>
                          </div>
                        )}
                      </footer>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {editingQuestion && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-10 rounded-[40px] w-full max-w-2xl shadow-3xl border border-slate-100 relative"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-2xl text-blue-900"><Edit size={24} /></div>
                  <h3 className="font-serif font-black text-2xl text-slate-900">Perfeccionar Pregunta</h3>
                </div>
                <button onClick={() => setEditingQuestion(null)} className="text-slate-400 hover:text-slate-900 bg-slate-50 p-2 rounded-full transition"><X size={24}/></button>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                  <p className="text-xs font-black uppercase text-slate-400 mb-3 tracking-widest">Pregunta Actual</p>
                  <p className="text-lg font-serif text-slate-800 leading-relaxed font-bold italic">"{editingQuestion.pregunta}"</p>
                </div>
                
                <div className="grid gap-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Instrucciones para la IA</label>
                  <textarea 
                    className="w-full rounded-3xl border border-slate-200 p-6 bg-white shadow-inner focus:ring-4 focus:ring-blue-100 transition outline-none min-h-[160px]" 
                    placeholder="Ej: Haz la pregunta más compleja, cambia el enfoque hacia la pragmática, o corrige la opción B para que sea un distractor más difícil..."
                    value={editInstruction}
                    onChange={(e) => setEditInstruction(e.target.value)}
                  />
                </div>

                <button 
                  className="w-full bg-blue-900 text-white p-6 rounded-3xl font-black text-lg hover:bg-blue-950 transition shadow-2xl shadow-blue-900/30 transform hover:-translate-y-1 disabled:opacity-50"
                  onClick={handleEditQuestion}
                  disabled={isEditing}
                >
                  {isEditing ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                      Rediseñando Pregunta...
                    </span>
                  ) : 'Actualizar Pregunta Académica'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end z-[100] p-0"
            onClick={() => setShowHistory(false)}
          >
            <motion.aside 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col pt-8 pb-6 px-6 relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><History size={24} /></div>
                  <h3 className="font-serif font-black text-2xl text-slate-900">Historial Local</h3>
                </div>
                <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-900 bg-slate-50 p-2 rounded-full transition"><X size={24}/></button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {savedExams.length === 0 ? (
                  <div className="text-center text-slate-400 mt-10">
                    <History size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="font-bold">No hay evaluaciones guardadas</p>
                    <p className="text-sm mt-2">Los exámenes que generes se guardarán auto-mágicamente aquí.</p>
                  </div>
                ) : (
                  savedExams.map((entry) => (
                    <div key={entry.id} className="bg-slate-50 border border-slate-100 p-5 rounded-[1.5rem] hover:border-indigo-300 hover:shadow-lg transition-all group cursor-pointer" onClick={() => {
                      setExamState({
                        ...examState,
                        ...entry.config,
                        examData: entry.examData,
                        examGenerated: true,
                        loading: false
                      });
                      setShowHistory(false);
                    }}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">
                        {new Date(entry.date).toLocaleDateString()} • {new Date(entry.date).toLocaleTimeString()}
                      </p>
                      <h4 className="font-bold text-slate-800 line-clamp-1 mb-1">{entry.examData.examTitle || 'Evaluación Generada'}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{entry.config.topic}</p>
                      <div className="mt-4 flex gap-2">
                        <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500">{entry.config.grade}</span>
                        <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500">{entry.config.subject}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-16 pb-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
         <p>© 2026 Institución Educativa Bajo Grande • Sistema de Inteligencia Pedagógica</p>
         <p className="mt-3 flex items-center justify-center gap-4 text-slate-300">
           <span className="h-px w-10 bg-slate-100"></span>
           Ciencia • Sabiduría • Innovación
           <span className="h-px w-10 bg-slate-100"></span>
         </p>
      </footer>
    </div>
  );
}
