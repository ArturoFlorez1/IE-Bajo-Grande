import { Info, BookOpen, Target, Sparkles, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

export default function AcademicGuide() {
  const [isOpen, setIsOpen] = useState(false);

  const sections = [
    {
      title: "Metodología de Generación",
      icon: <Sparkles className="text-indigo-600" size={20} />,
      content: "Nuestra IA no solo redacta preguntas; actúa como un experto en diseño curricular. Se basa en las matrices de referencia del ICFES y los Derechos Básicos de Aprendizaje (DBA) colombianos para asegurar validez pedagógica."
    },
    {
      title: "Pensamiento Crítico",
      icon: <Target className="text-emerald-600" size={20} />,
      content: "Buscamos evaluar la inferencia y la argumentación. Cada reactivo incluye un 'Texto Base' o estímulo para que el estudiante aplique conocimiento en situaciones reales."
    },
    {
      title: "Malla y Estándares",
      icon: <BookOpen className="text-indigo-600" size={20} />,
      content: "Integración automática con estándares MEN. Cobertura total para Básica Secundaria y Media en todas las dimensiones del conocimiento."
    },
    {
      title: "Optimización del Resultado",
      icon: <Info className="text-amber-600" size={20} />,
      content: "Proporcione temas específicos en lugar de generales. La IA detectará automáticamente si ha subido un PDF para priorizar ese material como fuente de verdad."
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
