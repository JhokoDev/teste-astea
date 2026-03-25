import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Shield, Layout, ChevronRight, CheckCircle2, Clock, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { fairsService } from '../services/supabaseService';
import { Fair, EvaluationCriteria } from '../types';
import { toast } from 'sonner';

type CreationStep = 'Identidade' | 'Datas' | 'Estrutura' | 'Regras' | 'Revisão';

export function FairsView() {
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState<CreationStep>('Identidade');
  const [fairs, setFairs] = useState<Fair[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState<Partial<Fair>>({
    name: '',
    description: '',
    status: 'rascunho',
    dates: {
      registration_start: '',
      registration_end: '',
      evaluation_start: '',
      evaluation_end: '',
      results_date: ''
    },
    structure: {
      categories: [],
      modalities: []
    },
    rules: {
      blind_evaluation: false,
      min_evaluators_per_project: 3,
      tie_breaker_hierarchy: []
    }
  });

  const [criteria, setCriteria] = useState<Partial<EvaluationCriteria>[]>([]);

  useEffect(() => {
    const unsubscribe = fairsService.subscribeToFairs((data) => {
      setFairs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const steps: CreationStep[] = ['Identidade', 'Datas', 'Estrutura', 'Regras', 'Revisão'];

  const validateDates = () => {
    const d = formData.dates;
    if (!d?.registration_start || !d?.registration_end || !d?.evaluation_start || !d?.evaluation_end || !d?.results_date) {
      return "Todas as datas são obrigatórias.";
    }
    if (new Date(d.registration_start) >= new Date(d.registration_end)) return "Fim das inscrições deve ser após o início.";
    if (new Date(d.registration_end) >= new Date(d.evaluation_start)) return "Avaliação deve começar após o fim das inscrições.";
    if (new Date(d.evaluation_start) >= new Date(d.evaluation_end)) return "Fim da avaliação deve ser após o início.";
    if (new Date(d.evaluation_end) >= new Date(d.results_date)) return "Resultado deve ser após o fim da avaliação.";
    return null;
  };

  const canGoNext = () => {
    if (currentStep === 'Identidade') {
      return formData.name && formData.name.length > 3;
    }
    if (currentStep === 'Datas') {
      const d = formData.dates;
      return d?.registration_start && d?.registration_end && d?.evaluation_start && d?.evaluation_end && d?.results_date;
    }
    if (currentStep === 'Estrutura') {
      return formData.structure?.categories && formData.structure.categories.length > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (!canGoNext()) {
      if (currentStep === 'Identidade') toast.error('Nome da feira é obrigatório (mín. 4 caracteres).');
      else if (currentStep === 'Datas') toast.error('Todas as datas são obrigatórias.');
      else if (currentStep === 'Estrutura') toast.error('Adicione pelo menos uma categoria.');
      return;
    }

    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) {
      setCurrentStep(steps[idx + 1]);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    const dateError = validateDates();
    if (dateError) {
      toast.error(dateError);
      setCurrentStep('Datas');
      return;
    }

    try {
      setLoading(true);
      console.log('FairsView: Iniciando criação de feira:', formData);
      const toastId = toast.loading('Criando feira no banco de dados...');
      
      const result = await fairsService.createFair(formData);
      console.log('FairsView: Resultado da criação:', result);
      
      toast.dismiss(toastId);
      toast.success('Feira criada com sucesso!');
      setIsCreating(false);
      setFormData({
        name: '',
        description: '',
        status: 'rascunho',
        dates: { registration_start: '', registration_end: '', evaluation_start: '', evaluation_end: '', results_date: '' },
        structure: { categories: [], modalities: [] },
        rules: { blind_evaluation: false, min_evaluators_per_project: 3, tie_breaker_hierarchy: [] }
      });
    } catch (error: any) {
      console.error('FairsView: Erro detalhado ao criar feira:', error);
      let errorMessage = 'Erro ao criar feira.';
      try {
        const parsedError = JSON.parse(error.message);
        errorMessage = `Erro: ${parsedError.error || errorMessage}`;
      } catch (e) {
        errorMessage = error.message || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = (cat: string) => {
    if (!cat) return;
    setFormData(prev => ({
      ...prev,
      structure: {
        ...prev.structure!,
        categories: [...(prev.structure?.categories || []), cat]
      }
    }));
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
              <h3 className="text-lg font-bold">Identidade da Feira (RF01)</h3>
              <div className="grid gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome da Feira</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" 
                    placeholder="Ex: Feira de Inovação Bio-Tech 2026" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Descrição</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 h-32" 
                    placeholder="Descreva os objetivos da feira..." 
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 'Datas' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Cronograma (RF02)</h3>
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Início Inscrições</label>
                  <input 
                    type="date" 
                    value={formData.dates?.registration_start || ''}
                    onChange={e => setFormData({...formData, dates: {...formData.dates!, registration_start: e.target.value}})}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Fim Inscrições</label>
                  <input 
                    type="date" 
                    value={formData.dates?.registration_end || ''}
                    onChange={e => setFormData({...formData, dates: {...formData.dates!, registration_end: e.target.value}})}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Início Avaliação</label>
                  <input 
                    type="date" 
                    value={formData.dates?.evaluation_start || ''}
                    onChange={e => setFormData({...formData, dates: {...formData.dates!, evaluation_start: e.target.value}})}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Fim Avaliação</label>
                  <input 
                    type="date" 
                    value={formData.dates?.evaluation_end || ''}
                    onChange={e => setFormData({...formData, dates: {...formData.dates!, evaluation_end: e.target.value}})}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Resultado Final</label>
                  <input 
                    type="date" 
                    value={formData.dates?.results_date || ''}
                    onChange={e => setFormData({...formData, dates: {...formData.dates!, results_date: e.target.value}})}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
              </div>
              <p className="text-[10px] text-amber-600 font-medium">* O sistema valida automaticamente se as datas são sequenciais.</p>
            </div>
          )}

          {currentStep === 'Estrutura' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold">Categorias e Modalidades</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Categorias (ex: Bioquímica, Engenharia)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      id="catInput"
                      className="flex-1 bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" 
                      placeholder="Nova categoria..." 
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          addCategory((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('catInput') as HTMLInputElement;
                        addCategory(input.value);
                        input.value = '';
                      }}
                      className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.structure?.categories.map(cat => (
                      <span key={cat} className="px-3 py-1 bg-primary/5 text-primary rounded-full text-xs font-bold flex items-center gap-2">
                        {cat}
                        <button onClick={() => setFormData(prev => ({...prev, structure: {...prev.structure!, categories: prev.structure!.categories.filter(c => c !== cat)}}))}>
                          <Plus className="w-3 h-3 rotate-45" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'Regras' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold">Regras de Avaliação (RF04, RF10)</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-bold">Avaliação Cega (RF10)</p>
                    <p className="text-xs text-slate-500">Anonimizar autores e instituições para avaliadores.</p>
                  </div>
                  <button 
                    onClick={() => setFormData(prev => ({...prev, rules: {...prev.rules!, blind_evaluation: !prev.rules!.blind_evaluation}}))}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-colors",
                      formData.rules?.blind_evaluation ? "bg-primary" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      formData.rules?.blind_evaluation ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Mínimo de Avaliadores por Projeto</label>
                  <input 
                    type="number" 
                    min="1"
                    value={formData.rules?.min_evaluators_per_project}
                    onChange={e => setFormData({...formData, rules: {...formData.rules!, min_evaluators_per_project: parseInt(e.target.value)}})}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 'Revisão' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold">Revisão Final (RF03)</h3>
              <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Nome</p>
                    <p className="font-bold">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Status Inicial</p>
                    <p className="font-bold text-amber-600 uppercase">{formData.status}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">Categorias</p>
                    <p className="font-bold">{formData.structure?.categories.join(', ') || 'Nenhuma'}</p>
                  </div>
                </div>
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="text-xs text-primary font-medium">
                    Ao finalizar, a feira será salva como rascunho. Você poderá publicá-la após revisar todos os critérios.
                  </p>
                </div>
              </div>
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
              onClick={handleNext}
              disabled={loading}
              className="px-4 lg:px-6 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {currentStep === 'Revisão' ? 'Finalizar' : 'Próximo'}
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
                  fair.status === 'publicado' ? "bg-emerald-100 text-emerald-700" : 
                  fair.status === 'rascunho' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
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
