import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2, Save, Loader2, Edit2 } from 'lucide-react';
import { Fair, EvaluationCriteria } from '../types';
import { fairsService } from '../services/supabaseService';
import { toast } from 'sonner';

interface CriteriaManagerModalProps {
  fair: Fair;
  onClose: () => void;
}

export function CriteriaManagerModal({ fair, onClose }: CriteriaManagerModalProps) {
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [weight, setWeight] = useState(1);
  const [scaleType, setScaleType] = useState<'numeric' | 'rubric'>('numeric');
  const [maxScore, setMaxScore] = useState(10);
  const [rubrics, setRubrics] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchCriteria();
  }, [fair.id]);

  const fetchCriteria = async () => {
    setLoading(true);
    const { data, error } = await fairsService.getEvaluationCriteria(fair.id);
    if (error) {
      toast.error('Erro ao carregar critérios: ' + error.message);
    } else if (data) {
      setCriteria(data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('');
    setWeight(1);
    setScaleType('numeric');
    setMaxScore(10);
    setRubrics({});
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (c: EvaluationCriteria) => {
    setName(c.name);
    setDescription(c.description || '');
    setCategory(c.category || '');
    setWeight(c.weight);
    setScaleType(c.scaletype);
    setMaxScore(c.maxscore);
    setRubrics(c.rubrics || {});
    setEditingId(c.id);
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('O nome do critério é obrigatório.');
      return;
    }
    if (weight <= 0) {
      toast.error('O peso deve ser maior que zero.');
      return;
    }
    if (maxScore <= 0) {
      toast.error('A nota máxima deve ser maior que zero.');
      return;
    }

    const criteriaData: Partial<EvaluationCriteria> = {
      fairid: fair.id,
      name,
      description,
      category: category || undefined,
      weight,
      scaletype: scaleType,
      maxscore: maxScore,
      rubrics: scaleType === 'rubric' ? rubrics : undefined
    };

    const toastId = toast.loading(editingId ? 'Atualizando critério...' : 'Salvando critério...');

    if (editingId) {
      const { error } = await fairsService.updateEvaluationCriteria(editingId, criteriaData);
      if (error) {
        toast.error('Erro ao atualizar: ' + error.message, { id: toastId });
      } else {
        toast.success('Critério atualizado com sucesso!', { id: toastId });
        fetchCriteria();
        resetForm();
      }
    } else {
      const { error } = await fairsService.createEvaluationCriteria(criteriaData);
      if (error) {
        toast.error('Erro ao salvar: ' + error.message, { id: toastId });
      } else {
        toast.success('Critério salvo com sucesso!', { id: toastId });
        fetchCriteria();
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const toastId = toast.loading('Excluindo critério...');
    const { error } = await fairsService.deleteEvaluationCriteria(id);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message, { id: toastId });
    } else {
      toast.success('Critério excluído com sucesso!', { id: toastId });
      fetchCriteria();
    }
  };

  const handleRubricChange = (score: number, text: string) => {
    setRubrics(prev => ({
      ...prev,
      [score]: text
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-app-card w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden border border-slate-100 dark:border-app-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-app-border bg-slate-50 dark:bg-app-surface">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-app-fg">Critérios de Avaliação</h2>
            <p className="text-sm text-slate-500 dark:text-app-muted">{fair.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-app-border text-slate-500 dark:text-app-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          
          {/* List of Criteria */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-app-fg">Critérios Cadastrados</h3>
              {!isAdding && (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Novo Critério
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : criteria.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-app-border rounded-xl text-slate-500 dark:text-app-muted">
                Nenhum critério cadastrado ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {criteria.map(c => (
                  <div key={c.id} className="p-4 border border-slate-200 dark:border-app-border rounded-xl bg-slate-50 dark:bg-app-surface flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-app-fg">{c.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-app-muted">{c.description || 'Sem descrição'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-1 bg-white dark:bg-app-card border border-slate-200 dark:border-app-border rounded text-[10px] font-bold text-slate-600 dark:text-app-muted uppercase">
                        Peso: {c.weight}
                      </span>
                      <span className="px-2 py-1 bg-white dark:bg-app-card border border-slate-200 dark:border-app-border rounded text-[10px] font-bold text-slate-600 dark:text-app-muted uppercase">
                        Máx: {c.maxscore} pts
                      </span>
                      <span className="px-2 py-1 bg-white dark:bg-app-card border border-slate-200 dark:border-app-border rounded text-[10px] font-bold text-slate-600 dark:text-app-muted uppercase">
                        Tipo: {c.scaletype === 'numeric' ? 'Numérico' : 'Rúbrica'}
                      </span>
                      {c.category && (
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase">
                          Cat: {c.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          {isAdding && (
            <div className="flex-1 bg-slate-50 dark:bg-app-surface border border-slate-200 dark:border-app-border rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-800 dark:text-app-fg">
                  {editingId ? 'Editar Critério' : 'Novo Critério'}
                </h3>
                <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-app-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-app-muted uppercase mb-1">Nome do Critério</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Inovação, Apresentação..."
                    className="w-full p-2.5 bg-white dark:bg-app-card border border-slate-200 dark:border-app-border rounded-lg text-sm outline-none focus:border-primary dark:text-app-fg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-app-muted uppercase mb-1">Descrição</label>
                  <textarea 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="O que será avaliado neste critério?"
                    rows={2}
                    className="w-full p-2.5 bg-white dark:bg-app-card border border-slate-200 dark:border-app-border rounded-lg text-sm outline-none focus:border-primary dark:text-app-fg resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-app-muted uppercase mb-1">Categoria Específica</label>
                    <select 
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-app-card border border-slate-200 dark:border-app-border rounded-lg text-sm outline-none focus:border-primary dark:text-app-fg"
                    >
                      <option value="">Todas as categorias</option>
                      {fair.structure?.categories?.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-app-muted uppercase mb-1">Peso</label>
                    <input 
                      type="number" 
                      min="0.1"
                      step="0.1"
                      value={weight}
                      onChange={e => setWeight(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 bg-white dark:bg-app-card border border-slate-200 dark:border-app-border rounded-lg text-sm outline-none focus:border-primary dark:text-app-fg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-app-muted uppercase mb-1">Tipo de Escala</label>
                    <select 
                      value={scaleType}
                      onChange={e => setScaleType(e.target.value as 'numeric' | 'rubric')}
                      className="w-full p-2.5 bg-white dark:bg-app-card border border-slate-200 dark:border-app-border rounded-lg text-sm outline-none focus:border-primary dark:text-app-fg"
                    >
                      <option value="numeric">Numérica (Ex: 0 a 10)</option>
                      <option value="rubric">Rúbrica (Descritiva)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-app-muted uppercase mb-1">Nota Máxima</label>
                    <input 
                      type="number" 
                      min="1"
                      value={maxScore}
                      onChange={e => setMaxScore(parseInt(e.target.value) || 0)}
                      className="w-full p-2.5 bg-white dark:bg-app-card border border-slate-200 dark:border-app-border rounded-lg text-sm outline-none focus:border-primary dark:text-app-fg"
                    />
                  </div>
                </div>

                {scaleType === 'rubric' && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-app-border">
                    <label className="block text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Definição das Rúbricas</label>
                    <p className="text-xs text-slate-400 dark:text-app-muted mb-2">Descreva o que significa cada nota (de 1 até {maxScore}).</p>
                    
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {Array.from({ length: maxScore }).map((_, i) => {
                        const score = i + 1;
                        return (
                          <div key={score} className="flex gap-2 items-start">
                            <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-slate-200 dark:bg-app-border rounded-lg text-xs font-bold text-slate-700 dark:text-app-fg">
                              {score}
                            </span>
                            <input 
                              type="text"
                              value={rubrics[score] || ''}
                              onChange={e => handleRubricChange(score, e.target.value)}
                              placeholder={`Descrição para nota ${score}`}
                              className="flex-1 p-2 bg-white dark:bg-app-card border border-slate-200 dark:border-app-border rounded-lg text-xs outline-none focus:border-primary dark:text-app-fg"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleSave}
                  className="w-full py-2.5 mt-4 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? 'Atualizar Critério' : 'Salvar Critério'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
