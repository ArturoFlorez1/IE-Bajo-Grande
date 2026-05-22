import { Info, BookOpen, Target, Sparkles, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

export default function AcademicGuide() {
  const [isOpen, setIsOpen] = useState(false);

  const sections = [
    {
      title: "Metodología de Vanguardia",
      icon: <Sparkles className="text-indigo-600" size={20} />,
      content: "Nuestra IA actúa como un consultor curricular de élite, alineando cada reactivo con las matrices del ICFES y los Derechos Básicos de Aprendizaje (DBA) para garantizar rigor institucional."
    },
    {
      title: "Taxonomía de Bloom",
      icon: <Target className="text-rose-600" size={20} />,
      content: "Permite graduar la complejidad cognitiva: desde 'Recordar' datos hasta 'Crear' nuevas síntesis. Esto asegura que la evaluación no sea solo memorística, sino que fomente el pensamiento superior."
    },
    {
      title: "Talleres de Refuerzo",
      icon: <BookOpen className="text-emerald-600" size={20} />,
      content: "A diferencia de la evaluación sumativa, el modo 'Taller' incluye una Fundamentación Teórica previa, ideal para procesos de nivelación, refuerzo escolar o guías de autoestudio."
    },
    {
      title: "Pensamiento Crítico",
      icon: <Target className="text-indigo-600" size={20} />,
      content: "Buscamos evaluar la inferencia y la argumentación. Cada reactivo incluye un 'Texto Base' o estímulo para que el estudiante aplique conocimiento en situaciones reales."
    },
    {
      title: "Material de Referencia",
      icon: <Sparkles className="text-amber-600" size={20} />,
      content: "La extracción inteligente de PDF prioriza la malla curricular propia del docente, permitiendo que la IA genere contenido basado en la realidad específica del aula y no solo en bases generales."
    },
    {
      title: "Diseño Basado en Evidencias",
      icon: <Info className="text-slate-600" size={20} />,
      content: "Cada pregunta incluye su explicación pedagógica y alineación temática, facilitando al docente la retroalimentación inmediata y el seguimiento por competencias."
    }
  ];

  return (
    <div className="mb-10">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-3 text-indigo-900 font-black text-xs uppercase tracking-widest hover:text-indigo-600 transition-all bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40"
      >
        <HelpCircle size={20} className="text-indigo-500" />
        {isOpen ? 'Cerrar Protocolo Académico' : 'Protocolo de Diseño & Guía de Uso'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-indigo-100/50">
              {sections.map((sec, i) => (
                <div key={i} className="flex gap-6 p-6 rounded-[2rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                  <div className="mt-1 bg-white p-3 rounded-2xl shadow-sm border border-slate-50">{sec.icon}</div>
                  <div>
                    <h4 className="font-serif font-black text-slate-800 mb-2 text-lg">{sec.title}</h4>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">{sec.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
