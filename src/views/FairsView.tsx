import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Shield, Layout, ChevronRight, CheckCircle2, Clock, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { fairsService } from '../services/supabaseService';
import { Fair, EvaluationCriteria, User, FormField } from '../types';
import { toast } from 'sonner';
import { supabase } from '../supabase';

type CreationStep = 'Identidade' | 'Datas' | 'Estrutura' | 'Formulário' | 'Regras' | 'Revisão';

interface FairsViewProps {
  profile?: User | null;
}

export function FairsView({ profile }: FairsViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingFairId, setEditingFairId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<CreationStep>('Identidade');
  const [fairs, setFairs] = useState<Fair[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});
  const [evaluatorCounts, setEvaluatorCounts] = useState<Record<string, number>>({});
  const [pendingEvaluatorCounts, setPendingEvaluatorCounts] = useState<Record<string, number>>({});

  const [newField, setNewField] = useState<Partial<FormField>>({
    label: '',
    type: 'text',
    required: false,
    options: [],
    placeholder: '',
    helpText: ''
  });

  const userRole = profile?.role || 'student';
  const userId = profile?.uid;

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
      modalities: [],
      target_audience: [],
      location_type: 'Híbrido',
      custom_form: []
    },
    rules: {
      blind_evaluation: false,
      min_evaluators_per_project: 3,
      tie_breaker_hierarchy: []
    }
  });

  const [criteria, setCriteria] = useState<Partial<EvaluationCriteria>[]>([]);

  useEffect(() => {
    const fetchCounts = async (fairsData: Fair[]) => {
      const fairIds = fairsData.map(f => f.id);
      if (fairIds.length === 0) return;

      // Projects count
      const { data: pCounts } = await supabase
        .from('projects')
        .select('fair_id');
      
      if (pCounts) {
        const pMap: Record<string, number> = {};
        pCounts.forEach(p => {
          pMap[p.fair_id] = (pMap[p.fair_id] || 0) + 1;
        });
        setProjectCounts(pMap);
      }

      // Evaluators count (approved applications)
      const { data: eCounts } = await supabase
        .from('evaluator_applications')
        .select('fair_id')
        .eq('status', 'aprovado');
      
      if (eCounts) {
        const eMap: Record<string, number> = {};
        eCounts.forEach(e => {
          eMap[e.fair_id] = (eMap[e.fair_id] || 0) + 1;
        });
        setEvaluatorCounts(eMap);
      }

      // Pending Evaluators count
      const { data: peCounts } = await supabase
        .from('evaluator_applications')
        .select('fair_id')
        .eq('status', 'pendente');
      
      if (peCounts) {
        const peMap: Record<string, number> = {};
        peCounts.forEach(pe => {
          peMap[pe.fair_id] = (peMap[pe.fair_id] || 0) + 1;
        });
        setPendingEvaluatorCounts(peMap);
      }
    };

    const unsubscribe = fairsService.subscribeToFairs((event) => {
      const filterFair = (f: Fair) => {
        if (userRole === 'manager') {
          return f.organizer_id === userId || f.organizer_id === null;
        } else if (userRole === 'admin') {
          return true;
        } else {
          return f.status === 'publicado';
        }
      };

      if (event.type === 'INITIAL') {
        const filtered = event.data.filter(filterFair);
        setFairs(filtered);
        fetchCounts(filtered);
      } else if (event.type === 'INSERT') {
        if (filterFair(event.newItem)) {
          setFairs(prev => {
            const next = [...prev, event.newItem];
            fetchCounts(next);
            return next;
          });
        }
      } else if (event.type === 'UPDATE') {
        if (filterFair(event.newItem)) {
          setFairs(prev => {
            const exists = prev.some(f => f.id === event.newItem.id);
            const next = exists 
              ? prev.map(f => f.id === event.newItem.id ? event.newItem : f)
              : [...prev, event.newItem];
            fetchCounts(next);
            return next;
          });
        } else {
          setFairs(prev => {
            const next = prev.filter(f => f.id !== event.newItem.id);
            fetchCounts(next);
            return next;
          });
        }
      } else if (event.type === 'DELETE') {
        setFairs(prev => {
          const next = prev.filter(f => f.id !== event.oldItem.id);
          fetchCounts(next);
          return next;
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userRole, userId]);

  const steps: CreationStep[] = ['Identidade', 'Datas', 'Estrutura', 'Formulário', 'Regras', 'Revisão'];

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
      if (isEditing && editingFairId) {
        console.log('FairsView: Iniciando atualização de feira:', formData);
        const toastId = toast.loading('Atualizando feira no banco de dados...');
        
        const { error } = await fairsService.updateFair(editingFairId, formData);
        
        toast.dismiss(toastId);
        if (error) {
          toast.error(`Erro ao atualizar feira: ${error.message}`);
          return;
        }
        toast.success('Feira atualizada com sucesso!');
      } else {
        console.log('FairsView: Iniciando criação de feira:', formData);
        const toastId = toast.loading('Criando feira no banco de dados...');
        
        const { error } = await fairsService.createFair({
          ...formData,
          organizer_id: profile?.uid,
          institution_id: profile?.institution_id
        });
        
        toast.dismiss(toastId);
        if (error) {
          toast.error(`Erro ao criar feira: ${error.message}`);
          return;
        }
        toast.success('Feira criada com sucesso!');
      }
      
      setIsCreating(false);
      setIsEditing(false);
      setEditingFairId(null);
      setFormData({
        name: '',
        description: '',
        status: 'rascunho',
        dates: { registration_start: '', registration_end: '', evaluation_start: '', evaluation_end: '', results_date: '' },
        structure: { 
          categories: [], 
          modalities: [],
          target_audience: [],
          location_type: 'Híbrido',
          custom_form: []
        },
        rules: { blind_evaluation: false, min_evaluators_per_project: 3, tie_breaker_hierarchy: [] }
      });
    } catch (error: any) {
      console.error('FairsView: Erro detalhado ao criar feira:', error);
      toast.error('Erro inesperado ao processar feira.');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = (cat: string) => {
    if (!cat || formData.structure?.categories.includes(cat)) return;
    setFormData(prev => ({
      ...prev,
      structure: {
        ...prev.structure!,
        categories: [...(prev.structure?.categories || []), cat]
      }
    }));
  };

  const addModality = (mod: string) => {
    if (!mod || formData.structure?.modalities.includes(mod)) return;
    setFormData(prev => ({
      ...prev,
      structure: {
        ...prev.structure!,
        modalities: [...(prev.structure?.modalities || []), mod]
      }
    }));
  };

  const addFormField = () => {
    if (!newField.label) {
      toast.error('O rótulo do campo é obrigatório.');
      return;
    }
    const field: FormField = {
      id: Math.random().toString(36).substr(2, 9),
      label: newField.label,
      type: newField.type as any || 'text',
      required: !!newField.required,
      options: newField.options || [],
      placeholder: newField.placeholder || '',
      helpText: newField.helpText || ''
    };

    setFormData(prev => ({
      ...prev,
      structure: {
        ...prev.structure!,
        custom_form: [...(prev.structure?.custom_form || []), field]
      }
    }));

    setNewField({
      label: '',
      type: 'text',
      required: false,
      options: [],
      placeholder: '',
      helpText: ''
    });
  };

  const removeFormField = (id: string) => {
    setFormData(prev => ({
      ...prev,
      structure: {
        ...prev.structure!,
        custom_form: prev.structure?.custom_form?.filter(f => f.id !== id) || []
      }
    }));
  };

  const handleEdit = (fair: Fair) => {
    setFormData({
      name: fair.name,
      description: fair.description,
      status: fair.status,
      dates: fair.dates,
      structure: {
        ...fair.structure,
        target_audience: Array.isArray(fair.structure?.target_audience) ? fair.structure.target_audience : [],
        location_type: fair.structure?.location_type || 'Híbrido',
        custom_form: fair.structure?.custom_form || []
      },
      rules: fair.rules
    });
    setEditingFairId(fair.id);
    setIsEditing(true);
    setIsCreating(true);
    setCurrentStep('Identidade');
  };

  if (isCreating) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto bg-background-light dark:bg-app-bg transition-colors duration-300">
        <div className="flex items-center gap-4 mb-6 lg:mb-8">
          <button onClick={() => {
            setIsCreating(false);
            setIsEditing(false);
            setEditingFairId(null);
          }} className="text-slate-400 dark:text-app-muted hover:text-primary transition-colors">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-app-fg">
            {isEditing ? 'Editar Feira' : 'Configurar Nova Feira'}
          </h2>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8 lg:mb-12 relative overflow-x-auto pb-4">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-app-border -translate-y-1/2 -z-10" />
          {steps.map((step, idx) => (
            <div key={step} className="flex flex-col items-center gap-2 bg-[#FBFDF9] dark:bg-app-bg px-2 lg:px-4 min-w-[80px]">
              <div className={cn(
                "w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-sm lg:text-base font-bold transition-all",
                currentStep === step ? "bg-primary text-white" : "bg-slate-100 dark:bg-app-surface text-slate-400 dark:text-app-muted"
              )}>
                {idx + 1}
              </div>
              <span className={cn("text-[10px] lg:text-xs font-bold", currentStep === step ? "text-primary" : "text-slate-400 dark:text-app-muted")}>
                {step}
              </span>
            </div>
          ))}
        </div>

        <motion.div 
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-4 lg:p-8 space-y-6"
        >
          {currentStep === 'Identidade' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold dark:text-app-fg">Identidade da Feira (RF01)</h3>
              <div className="grid gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Nome da Feira</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg" 
                    placeholder="Ex: Feira de Inovação Bio-Tech 2026" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Descrição</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 h-32 dark:text-app-fg" 
                    placeholder="Descreva os objetivos da feira..." 
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Público-Alvo</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(() => {
                        const audiences = ['Ensino Fundamental', 'Ensino Médio', 'Ensino Técnico', 'Ensino Superior', 'Aberto a todos'];
                        const selectAllOption = 'Aberto a todos';
                        const otherOptions = audiences.filter(a => a !== selectAllOption);
                        
                        return audiences.map(audience => (
                          <label key={audience} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-app-surface rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-app-surface/80 transition-colors">
                            <input 
                              type="checkbox"
                              checked={formData.structure?.target_audience?.includes(audience)}
                              onChange={e => {
                                const isChecked = e.target.checked;
                                const current = formData.structure?.target_audience || [];
                                let next: string[] = [];

                                if (audience === selectAllOption) {
                                  next = isChecked ? [...audiences] : [];
                                } else {
                                  if (isChecked) {
                                    const tempNext = [...current, audience];
                                    const allOthersChecked = otherOptions.every(opt => tempNext.includes(opt));
                                    next = allOthersChecked ? [...audiences] : tempNext;
                                  } else {
                                    next = current.filter(a => a !== audience && a !== selectAllOption);
                                  }
                                }
                                setFormData({...formData, structure: {...formData.structure!, target_audience: next}});
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            <span className="text-xs font-medium dark:text-app-fg">{audience}</span>
                          </label>
                        ));
                      })()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Modalidade de Local</label>
                    <select 
                      value={formData.structure?.location_type}
                      onChange={e => setFormData({...formData, structure: {...formData.structure!, location_type: e.target.value}})}
                      className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg"
                    >
                      <option value="Híbrido">Híbrido</option>
                      <option value="Presencial">Presencial</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'Datas' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold dark:text-app-fg">Cronograma (RF02)</h3>
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Início Inscrições</label>
                  <input 
                    type="date" 
                    value={formData.dates?.registration_start || ''}
                    onChange={e => setFormData({...formData, dates: {...formData.dates!, registration_start: e.target.value}})}
                    className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Fim Inscrições</label>
                  <input 
                    type="date" 
                    value={formData.dates?.registration_end || ''}
                    onChange={e => setFormData({...formData, dates: {...formData.dates!, registration_end: e.target.value}})}
                    className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Início Avaliação</label>
                  <input 
                    type="date" 
                    value={formData.dates?.evaluation_start || ''}
                    onChange={e => setFormData({...formData, dates: {...formData.dates!, evaluation_start: e.target.value}})}
                    className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Fim Avaliação</label>
                  <input 
                    type="date" 
                    value={formData.dates?.evaluation_end || ''}
                    onChange={e => setFormData({...formData, dates: {...formData.dates!, evaluation_end: e.target.value}})}
                    className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg" 
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Resultado Final</label>
                  <input 
                    type="date" 
                    value={formData.dates?.results_date || ''}
                    onChange={e => setFormData({...formData, dates: {...formData.dates!, results_date: e.target.value}})}
                    className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg" 
                  />
                </div>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">* O sistema valida automaticamente se as datas são sequenciais.</p>
            </div>
          )}

          {currentStep === 'Estrutura' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold dark:text-app-fg">Categorias e Modalidades</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Categorias (ex: Bioquímica, Engenharia)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      id="catInput"
                      className="flex-1 bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg" 
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
                      className="p-3 bg-primary/10 text-primary dark:text-primary-light rounded-xl hover:bg-primary/20 dark:hover:bg-primary/30"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.structure?.categories.map(cat => (
                      <span key={cat} className="px-3 py-1 bg-primary/5 dark:bg-primary/20 text-primary dark:text-primary-light rounded-full text-xs font-bold flex items-center gap-2">
                        {cat}
                        <button onClick={() => setFormData(prev => ({...prev, structure: {...prev.structure!, categories: prev.structure!.categories.filter(c => c !== cat)}}))}>
                          <Plus className="w-3 h-3 rotate-45" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Modalidades (ex: Pesquisa Científica, Protótipo)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      id="modInput"
                      className="flex-1 bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg" 
                      placeholder="Nova modalidade..." 
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          addModality((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('modInput') as HTMLInputElement;
                        addModality(input.value);
                        input.value = '';
                      }}
                      className="p-3 bg-primary/10 text-primary dark:text-primary-light rounded-xl hover:bg-primary/20 dark:hover:bg-primary/30"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.structure?.modalities.map(mod => (
                      <span key={mod} className="px-3 py-1 bg-primary/5 dark:bg-primary/20 text-primary dark:text-primary-light rounded-full text-xs font-bold flex items-center gap-2">
                        {mod}
                        <button onClick={() => setFormData(prev => ({...prev, structure: {...prev.structure!, modalities: prev.structure!.modalities.filter(m => m !== mod)}}))}>
                          <Plus className="w-3 h-3 rotate-45" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'Formulário' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold dark:text-app-fg">Formulário de Inscrição Personalizado</h3>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold uppercase">Opcional</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-app-muted">
                Defina campos adicionais que os estudantes devem preencher ao submeter projetos para esta feira.
              </p>

              <div className="bg-slate-50 dark:bg-app-surface p-4 rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-app-muted uppercase">Rótulo do Campo</label>
                    <input 
                      type="text" 
                      value={newField.label}
                      onChange={e => setNewField({...newField, label: e.target.value})}
                      className="w-full bg-white dark:bg-app-card border-none rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg" 
                      placeholder="Ex: Link do Vídeo, Resumo Expandido..." 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-app-muted uppercase">Tipo de Campo</label>
                    <select 
                      value={newField.type}
                      onChange={e => setNewField({...newField, type: e.target.value as any})}
                      className="w-full bg-white dark:bg-app-card border-none rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg"
                    >
                      <option value="text">Texto Curto</option>
                      <option value="textarea">Texto Longo</option>
                      <option value="number">Número</option>
                      <option value="date">Data</option>
                      <option value="select">Seleção Única</option>
                      <option value="checkbox">Múltipla Escolha</option>
                      <option value="file">Upload de Arquivo</option>
                      <option value="link">Link Externo</option>
                    </select>
                  </div>
                  {(newField.type === 'select' || newField.type === 'checkbox') && (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-app-muted uppercase">Opções (separadas por vírgula)</label>
                      <input 
                        type="text" 
                        value={newField.options?.join(', ')}
                        onChange={e => setNewField({...newField, options: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                        className="w-full bg-white dark:bg-app-card border-none rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg" 
                        placeholder="Opção 1, Opção 2, Opção 3..." 
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox" 
                      id="fieldRequired"
                      checked={newField.required}
                      onChange={e => setNewField({...newField, required: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="fieldRequired" className="text-xs font-bold text-slate-600 dark:text-app-muted cursor-pointer">Obrigatório</label>
                  </div>
                </div>
                <button 
                  onClick={addFormField}
                  className="w-full py-2 bg-primary/10 text-primary dark:text-primary-light rounded-lg text-xs font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Campo ao Formulário
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 dark:text-app-muted uppercase">Campos do Formulário</h4>
                {formData.structure?.custom_form?.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-app-muted italic">Nenhum campo personalizado adicionado.</p>
                ) : (
                  <div className="grid gap-3">
                    {formData.structure?.custom_form?.map((field, idx) => (
                      <div key={field.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-app-surface rounded-xl border border-slate-100 dark:border-app-border">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-white dark:bg-app-card rounded flex items-center justify-center text-[10px] font-bold text-slate-400">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold dark:text-app-fg">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-app-muted uppercase font-bold">{field.type}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFormField(field.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'Regras' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold dark:text-app-fg">Regras de Avaliação (RF04, RF10)</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-app-surface rounded-xl">
                  <div>
                    <p className="text-sm font-bold dark:text-app-fg">Avaliação Cega (RF10)</p>
                    <p className="text-xs text-slate-500 dark:text-app-muted">Anonimizar autores e instituições para avaliadores.</p>
                  </div>
                  <button 
                    onClick={() => setFormData(prev => ({...prev, rules: {...prev.rules!, blind_evaluation: !prev.rules!.blind_evaluation}}))}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-colors",
                      formData.rules?.blind_evaluation ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      formData.rules?.blind_evaluation ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Mínimo de Avaliadores por Projeto</label>
                  <input 
                    type="number" 
                    min="1"
                    value={formData.rules?.min_evaluators_per_project}
                    onChange={e => setFormData({...formData, rules: {...formData.rules!, min_evaluators_per_project: parseInt(e.target.value)}})}
                    className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg" 
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 'Revisão' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold dark:text-app-fg">Revisão Final (RF03)</h3>
              <div className="bg-slate-50 dark:bg-app-surface rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-app-muted/60 uppercase">Nome</p>
                    <p className="font-bold dark:text-app-fg">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-app-muted/60 uppercase">Status Inicial</p>
                    <p className="font-bold text-amber-600 dark:text-amber-400 uppercase">{formData.status}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-slate-400 dark:text-app-muted/60 uppercase">Público e Local</p>
                    <p className="font-bold dark:text-app-fg">
                      {Array.isArray(formData.structure?.target_audience) ? formData.structure.target_audience.join(', ') : 'Nenhum'} | {formData.structure?.location_type}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-slate-400 dark:text-app-muted/60 uppercase">Categorias</p>
                    <p className="font-bold dark:text-app-fg">{formData.structure?.categories.join(', ') || 'Nenhuma'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-slate-400 dark:text-app-muted/60 uppercase">Modalidades</p>
                    <p className="font-bold dark:text-app-fg">{formData.structure?.modalities.join(', ') || 'Nenhuma'}</p>
                  </div>
                </div>
                <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10 dark:border-primary/20">
                  <p className="text-xs text-primary dark:text-primary-light font-medium">
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
              className="px-4 lg:px-6 py-2 rounded-xl border border-slate-200 dark:border-app-border text-slate-600 dark:text-app-muted font-bold text-sm hover:bg-slate-50 dark:hover:bg-app-surface"
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
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-background-light dark:bg-app-bg transition-colors duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-app-fg">Gestão de Feiras</h2>
        {(userRole === 'admin' || userRole === 'manager') && (
          <button 
            onClick={() => setIsCreating(true)}
            className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Nova Feira</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {fairs.map((fair) => (
            <div key={fair.id} className={cn(
              "bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 border-l-4 transition-colors duration-300",
              fair.status === 'publicado' ? "border-primary" : "border-slate-300 dark:border-app-muted"
            )}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-app-fg">{fair.name}</h3>
                  <p className="text-xs text-slate-400 dark:text-app-muted">ID: {fair.id}</p>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                  fair.status === 'publicado' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : 
                  fair.status === 'pausado' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                  fair.status === 'rascunho' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "bg-slate-100 dark:bg-app-surface text-slate-500 dark:text-app-muted"
                )}>
                  {fair.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-2 bg-slate-50 dark:bg-app-surface rounded-xl">
                  <p className="text-lg font-bold text-slate-900 dark:text-app-fg">{projectCounts[fair.id] || 0}</p>
                  <p className="text-[10px] text-slate-400 dark:text-app-muted uppercase font-bold">Projetos</p>
                </div>
                <div className="text-center p-2 bg-slate-50 dark:bg-app-surface rounded-xl">
                  <p className="text-lg font-bold text-slate-900 dark:text-app-fg">{evaluatorCounts[fair.id] || 0}</p>
                  <p className="text-[10px] text-slate-400 dark:text-app-muted uppercase font-bold">Juízes</p>
                </div>
                <div className="text-center p-2 bg-slate-50 dark:bg-app-surface rounded-xl">
                  <p className="text-lg font-bold text-slate-900 dark:text-app-fg">
                    {(() => {
                      const end = fair.dates.registration_end ? new Date(fair.dates.registration_end) : null;
                      if (!end) return '-';
                      const diff = end.getTime() - new Date().getTime();
                      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                      return days > 0 ? `${days}d` : 'Fim';
                    })()}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-app-muted uppercase font-bold">Restante</p>
                </div>
              </div>
              <div className="flex gap-2">
                {fair.status === 'rascunho' && (
                  <button 
                    onClick={async () => {
                      const { error } = await fairsService.updateFair(fair.id, { status: 'publicado' });
                      if (error) {
                        toast.error('Erro ao publicar feira: ' + error.message);
                      } else {
                        toast.success('Feira publicada com sucesso!');
                      }
                    }}
                    className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all"
                  >
                    Publicar Agora
                  </button>
                )}
                
                {fair.status === 'publicado' && (
                  <button 
                    onClick={async () => {
                      const { error } = await fairsService.updateFair(fair.id, { status: 'pausado' });
                      if (error) {
                        toast.error('Erro ao pausar feira: ' + error.message);
                      } else {
                        toast.success('Feira pausada com sucesso!');
                      }
                    }}
                    className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-all"
                  >
                    Pausar
                  </button>
                )}

                {fair.status === 'pausado' && (
                  <>
                    <button 
                      onClick={async () => {
                        const { error } = await fairsService.updateFair(fair.id, { status: 'publicado' });
                        if (error) {
                          toast.error('Erro ao retomar feira: ' + error.message);
                        } else {
                          toast.success('Feira retomada com sucesso!');
                        }
                      }}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all"
                    >
                      Retomar
                    </button>
                    <button 
                      onClick={async () => {
                        const { error } = await fairsService.updateFair(fair.id, { status: 'encerrado' });
                        if (error) {
                          toast.error('Erro ao encerrar feira: ' + error.message);
                        } else {
                          toast.success('Feira encerrada com sucesso!');
                        }
                      }}
                      className="flex-1 py-2 rounded-xl bg-slate-500 text-white text-xs font-bold hover:bg-slate-600 transition-all"
                    >
                      Encerrar
                    </button>
                  </>
                )}

                {fair.status === 'encerrado' && (
                  <div className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-app-surface text-slate-400 dark:text-app-muted text-xs font-bold text-center">
                    Feira Encerrada
                  </div>
                )}
                <button 
                  onClick={() => handleEdit(fair)}
                  className="px-3 py-2 rounded-xl border border-slate-100 dark:border-app-border text-slate-400 dark:text-app-muted hover:text-primary dark:hover:text-primary-light transition-colors"
                  title="Editar Feira"
                >
                  <Layout className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {fairs.length === 0 && (
            <div className="col-span-2 py-20 text-center text-slate-400 dark:text-app-muted border-2 border-dashed border-slate-100 dark:border-app-border rounded-2xl">
              Nenhuma feira cadastrada. Clique em "Nova Feira" para começar.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
