/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { generateExam, editQuestion } from './services/geminiService';
import { Trash, Edit, Download, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    questionType: 'mixed' as 'multiple-choice' | 'open' | 'mixed',
    examGenerated: false,
    examData: { examTitle: '', questions: [] },
    loading: false,
    error: null as string | null
  });
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleGenerate = async () => {
    setExamState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await generateExam(
        examState.subject, 
        examState.topic, 
        examState.numQuestions, 
        examState.teacherName, 
        examState.questionType, 
        examState.grade,
        examState.period,
        examState.difficulty
      );
      setExamState(prev => ({ ...prev, loading: false, examGenerated: true, examData: data }));
    } catch (error) {
      console.error(error);
      setExamState(prev => ({ ...prev, loading: false, error: 'Hubo un error al generar el examen. Por favor, intenta de nuevo.' }));
    }
  };

  const handleEditQuestion = async () => {
    if (!editingQuestion || !editInstruction) return;
    setIsEditing(true);
    try {
      const updatedQuestion = await editQuestion(editingQuestion, editInstruction);
      setExamState(prev => ({
        ...prev,
        examData: {
          ...prev.examData,
          questions: prev.examData.questions.map((q: any) => q.id === updatedQuestion.id ? updatedQuestion : q)
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
        questions: prev.examData.questions.filter((q: any) => q.id !== id)
      }
    }));
  };

  const downloadPDF = (includeAnswers: boolean) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 20; // 2.5cm is 20mm
    const marginRight = 20; // 2.5cm is 20mm
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

    // Header
    addText(examState.examData.examTitle || 'Examen', 18, 'bold', '#1e3a8a', 'center');
    y += 5;
    addText(`Docente: ${examState.teacherName}`, 12, 'bold');
    addText(`Tema: ${examState.topic}`, 12, 'normal');
    addText(`Grado: ${examState.grade}  |  Periodo: ${examState.period}`, 12, 'normal');
    addText(`Nombre del Estudiante: __________________________`, 12, 'normal');
    y += 10;
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 10;

    examState.examData.questions.forEach((q: any, idx: number) => {
      if (y > 260) { doc.addPage(); y = 20; }
      
      addText(`${idx + 1}. ${q.pregunta}`, 13, 'bold');
      
      if (q.texto_base) {
        addText(q.texto_base, 11, 'italic', '#475569');
      }

      if (q.opciones) {
        Object.entries(q.opciones).forEach(([key, val]) => {
          addText(`   ${key}) ${val}`, 11, 'normal');
        });
      }

      if (includeAnswers) {
        y += 5;
        addText(`Respuesta: ${q.respuesta_correcta}`, 11, 'bold', '#0f766e');
        addText(`Explicación: ${q.explicacion}`, 11, 'normal', '#334155');
        y += 5;
      }
      y += 10;
    });
    
    doc.save(`Examen_${examState.subject.replace(/ /g, '_')}_${includeAnswers ? 'docente' : 'estudiante'}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-blue-900">
          IE Bajo Grande
        </h1>
        <p className="mt-2 text-xl text-slate-600">Generador de Evaluaciones Inteligentes</p>
        <p className="mt-1 text-sm text-slate-500 italic">Enfoque: Humanista Desarrollista</p>
      </header>

      <main className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/50 md:p-10 border border-slate-100">
        {!examState.examGenerated ? (
          <div className="grid gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-700">Asignatura</label>
                <select className="w-full rounded-xl border border-slate-200 p-4 bg-slate-50 focus:ring-2 focus:ring-blue-500 transition" onChange={(e) => setExamState({ ...examState, subject: e.target.value })}>
                  <option value="">Seleccione asignatura</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-700">Grado</label>
                <select className="w-full rounded-xl border border-slate-200 p-4 bg-slate-50 focus:ring-2 focus:ring-blue-500 transition" onChange={(e) => setExamState({ ...examState, grade: e.target.value })}>
                  <option value="">Seleccione grado</option>
                  {[5,6,7,8,9,10,11].map((g) => <option key={g} value={`${g}º`}>{g}º Grado</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-700">Nombre del Docente</label>
                <input type="text" className="w-full rounded-xl border border-slate-200 p-4 bg-slate-50 focus:ring-2 focus:ring-blue-500 transition" placeholder="Ej: Juan Pérez" onChange={(e) => setExamState({ ...examState, teacherName: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-700">Tipo de Preguntas</label>
                <select className="w-full rounded-xl border border-slate-200 p-4 bg-slate-50 focus:ring-2 focus:ring-blue-500 transition" onChange={(e) => setExamState({ ...examState, questionType: e.target.value as any })}>
                  <option value="mixed">Mixto</option>
                  <option value="multiple-choice">Selección Múltiple (ICFES)</option>
                  <option value="open">Abiertas</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-700">Periodo</label>
                <select className="w-full rounded-xl border border-slate-200 p-4 bg-slate-50 focus:ring-2 focus:ring-blue-500 transition" onChange={(e) => setExamState({ ...examState, period: e.target.value })}>
                  <option value="">Seleccione periodo</option>
                  {[1,2,3,4].map((p) => <option key={p} value={`Período ${p}`}>{p}º Período</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-700">Dificultad</label>
                <select className="w-full rounded-xl border border-slate-200 p-4 bg-slate-50 focus:ring-2 focus:ring-blue-500 transition" value={examState.difficulty} onChange={(e) => setExamState({ ...examState, difficulty: e.target.value })}>
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-700">Número de Preguntas</label>
                <input type="number" min="1" max="20" className="w-full rounded-xl border border-slate-200 p-4 bg-slate-50 focus:ring-2 focus:ring-blue-500 transition" value={examState.numQuestions} onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setExamState({ ...examState, numQuestions: isNaN(val) ? 1 : val });
                }} />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-bold text-slate-700">Tema a evaluar</label>
              <textarea className="w-full rounded-xl border border-slate-200 p-4 bg-slate-50 focus:ring-2 focus:ring-blue-500 transition" placeholder="Ej: La célula eucariota y procariota..." rows={4} onChange={(e) => setExamState({ ...examState, topic: e.target.value })} />
            </div>

            {examState.error && (
              <div className="rounded-xl bg-red-50 p-4 text-red-700 text-sm font-medium border border-red-200">{examState.error}</div>
            )}

            <button className="w-full rounded-xl bg-blue-900 px-8 py-4 font-bold text-white hover:bg-blue-950 transition shadow-lg shadow-blue-900/20 disabled:opacity-50 text-lg" onClick={handleGenerate} disabled={examState.loading}>
              {examState.loading ? 'Generando examen con IA...' : 'Generar Examen'}
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            <h2 className="text-2xl font-bold text-blue-900 border-b pb-4">Examen: {examState.topic}</h2>
            <div className="space-y-4">
              {examState.examData.questions.map((q: any, idx: number) => (
                <div key={q.id || idx} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  {q.texto_base && (
                    <div className="mb-4 p-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 italic border-l-4 border-slate-300">
                      <p className="font-bold text-slate-800 mb-1">Texto de apoyo:</p>
                      {q.texto_base}
                    </div>
                  )}
                  <p className="font-bold text-lg text-slate-900 mb-4">{idx + 1}. {q.pregunta}</p>
                  
                  {q.opciones && Object.keys(q.opciones).length > 0 && (
                    <ul className="mt-2 space-y-2 mb-4">
                      {Object.entries(q.opciones).map(([key, val]) => (
                        <li key={key} className="flex gap-2 text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <span className="font-bold text-blue-700">{key})</span> {String(val)}
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  <div className="mt-4 p-4 bg-sky-50 border border-sky-100 rounded-xl">
                    <p className="flex justify-between font-bold text-sky-900 mb-2">
                       <span>Respuesta correcta: {q.respuesta_correcta}</span>
                    </p>
                    <p className="text-sm font-bold text-sky-900 mb-1">Explicación:</p>
                    <p className="text-sm text-sky-800">{q.explicacion}</p>
                  </div>
                  
                  <div className="mt-4 text-xs text-slate-500 grid grid-cols-2 gap-2">
                    <p><strong>Competencia:</strong> {q.competencia}</p>
                    <p><strong>Componente:</strong> {q.componente}</p>
                    <p><strong>DBA:</strong> {q.DBA}</p>
                    <p><strong>Nivel Cognitivo:</strong> {q.nivel_cognitivo}</p>
                  </div>
                  
                  <div className="mt-6 flex gap-4 pt-4 border-t border-slate-100">
                    <button className="flex items-center gap-2 text-sm text-blue-700 font-medium hover:text-blue-900" onClick={() => { setEditingQuestion(q); setEditInstruction(''); }}><Edit size={16}/> Editar</button>
                    <button className="flex items-center gap-2 text-sm text-red-600 font-medium hover:text-red-800" onClick={() => deleteQuestion(idx)}><Trash size={16}/> Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-4 mt-6">
              <button className="flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 hover:bg-slate-300" onClick={() => setExamState(prev => ({ ...prev, examGenerated: false }))}>Volver</button>
              <button className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700" onClick={() => downloadPDF(false)}><Download size={18}/> Descargar (Estudiante)</button>
              <button className="flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-white hover:bg-teal-800" onClick={() => downloadPDF(true)}><Download size={18}/> Descargar (Docente)</button>
            </div>
          </div>
        )}
      </main>
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-900">Editar Pregunta</h3>
              <button onClick={() => setEditingQuestion(null)} className="text-slate-500 hover:text-slate-800"><X size={20}/></button>
            </div>
            <p className="text-sm text-slate-600 mb-4 border-l-4 border-blue-500 pl-3">{editingQuestion.text}</p>
            <textarea 
              className="w-full rounded-xl border border-slate-200 p-4 bg-slate-50 mb-4 focus:ring-2 focus:ring-blue-500" 
              rows={3} 
              placeholder="Ej: Hazla más difícil, incluye más contexto sobre la célula..."
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
            />
            <button 
              className="w-full bg-blue-900 text-white p-3 rounded-lg font-bold hover:bg-blue-950 transition"
              onClick={handleEditQuestion}
              disabled={isEditing}
            >
              {isEditing ? 'Generando cambios con IA...' : 'Actualizar Pregunta'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
