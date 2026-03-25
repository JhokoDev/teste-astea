import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Shield, Layout, ChevronRight, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { fairsService } from '../services/supabaseService';

type CreationStep = 'Identidade' | 'Datas' | 'Estrutura' | 'Regras';

export function FairsView() {
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState<CreationStep>('Identidade');
  const [fairs, setFairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = fairsService.subscribeToFairs((data) => {
      setFairs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const steps: CreationStep[] = ['Identidade', 'Datas', 'Estrutura', 'Regras'];

  const handleFinish = async () => {
    // Basic implementation for SaaS functionality
    await fairsService.createFair({
      name: "Nova Feira Científica",
      status: "rascunho",
      institutionId: "default-inst",
      dates: {
        registrationStart: new Date().toISOString(),
      }
    });
    setIsCreating(false);
  };

  if (isCreating) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6 lg:mb-8">
          <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-primary transition-colors">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Configurar Nova Feira</h2>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8 lg:mb-12 relative overflow-x-auto pb-4">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 -z-10" />
          {steps.map((step, idx) => (
            <div key={step} className="flex flex-col items-center gap-2 bg-[#FBFDF9] px-2 lg:px-4 min-w-[80px]">
              <div className={cn(
                "w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-sm lg:text-base font-bold transition-all",
                currentStep === step ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
              )}>
                {idx + 1}
              </div>
              <span className={cn("text-[10px] lg:text-xs font-bold", currentStep === step ? "text-primary" : "text-slate-400")}>
                {step}
              </span>
            </div>
          ))}
        </div>

        <motion.div 
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white elevation-1 rounded-2xl p-4 lg:p-8 space-y-6"
        >
          {currentStep === 'Identidade' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Identidade da Feira</h3>
              <div className="grid gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome da Feira</label>
                  <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: Feira de Inovação Bio-Tech 2026" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Descrição</label>
                  <textarea className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 h-32" placeholder="Descreva os objetivos da feira..." />
                </div>
              </div>
            </div>
          )}

          {currentStep === 'Datas' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Cronograma (RF02)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Início Inscrições</label>
                  <input type="date" className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Fim Inscrições</label>
                  <input type="date" className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Início Avaliação</label>
                  <input type="date" className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Resultado Final</label>
                  <input type="date" className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <p className="text-[10px] text-amber-600 font-medium">* O sistema valida automaticamente se as datas são sequenciais.</p>
            </div>
          )}

          <div className="flex justify-between pt-6">
            <button 
              onClick={() => {
                const idx = steps.indexOf(currentStep);
                if (idx > 0) setCurrentStep(steps[idx - 1]);
              }}
              className="px-4 lg:px-6 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
            >
              Anterior
            </button>
            <button 
              onClick={() => {
                const idx = steps.indexOf(currentStep);
                if (idx < steps.length - 1) setCurrentStep(steps[idx + 1]);
                else handleFinish();
              }}
              className="px-4 lg:px-6 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-md"
            >
              {currentStep === 'Regras' ? 'Finalizar' : 'Próximo'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Gestão de Feiras</h2>
        <button 
          onClick={() => setIsCreating(true)}
          className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Feira</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {fairs.map((fair) => (
            <div key={fair.id} className={cn(
              "bg-white elevation-1 rounded-2xl p-6 border-l-4",
              fair.status === 'publicado' ? "border-primary" : "border-slate-300"
            )}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold">{fair.name}</h3>
                  <p className="text-xs text-slate-400">ID: {fair.id}</p>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                  fair.status === 'publicado' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                )}>
                  {fair.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-2 bg-slate-50 rounded-xl">
                  <p className="text-lg font-bold">0</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Projetos</p>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-xl">
                  <p className="text-lg font-bold">0</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Juízes</p>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-xl">
                  <p className="text-lg font-bold">-</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Restante</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20">Gerenciar</button>
                <button className="px-3 py-2 rounded-xl border border-slate-100 text-slate-400 hover:text-slate-600"><Layout className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {fairs.length === 0 && (
            <div className="col-span-2 py-20 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
              Nenhuma feira cadastrada. Clique em "Nova Feira" para começar.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
