import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Users, ChevronRight, Loader2, Info, ExternalLink, ShieldCheck, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { fairsService } from '../services/supabaseService';
import { Fair, User } from '../types';
import { toast } from 'sonner';
import { supabase } from '../supabase';

interface ExploreFairsViewProps {
  profile?: User | null;
}

export function ExploreFairsView({ profile }: ExploreFairsViewProps) {
  const [fairs, setFairs] = useState<Fair[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFair, setSelectedFair] = useState<Fair | null>(null);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchFairsAndCounts = async () => {
      const unsubscribe = fairsService.subscribeToFairs(async (data) => {
        const publishedFairs = data.filter(f => f.status === 'publicado');
        setFairs(publishedFairs);

        // Fetch project counts for each published fair
        const { data: counts, error } = await supabase
          .from('projects')
          .select('fairId');
        
        if (!error && counts) {
          const countMap: Record<string, number> = {};
          counts.forEach(p => {
            countMap[p.fairId] = (countMap[p.fairId] || 0) + 1;
          });
          setProjectCounts(countMap);
        }
        
        setLoading(false);
      });
      return unsubscribe;
    };

    const unsubPromise = fetchFairsAndCounts();
    return () => {
      unsubPromise.then(unsub => unsub());
    };
  }, []);

  const getFairStatus = (fair: Fair) => {
    const now = new Date();
    const regStart = fair.dates.registration_start ? new Date(fair.dates.registration_start) : null;
    const regEnd = fair.dates.registration_end ? new Date(fair.dates.registration_end) : null;
    const evalStart = fair.dates.evaluation_start ? new Date(fair.dates.evaluation_start) : null;
    const evalEnd = fair.dates.evaluation_end ? new Date(fair.dates.evaluation_end) : null;

    if (regStart && regEnd && now >= regStart && now <= regEnd) {
      return { label: 'Inscrições Abertas', color: 'text-primary bg-primary/10' };
    }
    if (regEnd && evalStart && now > regEnd && now < evalStart) {
      return { label: 'Aguardando Avaliação', color: 'text-amber-600 bg-amber-100' };
    }
    if (evalStart && evalEnd && now >= evalStart && now <= evalEnd) {
      return { label: 'Em Avaliação', color: 'text-blue-600 bg-blue-100' };
    }
    if (evalEnd && now > evalEnd) {
      return { label: 'Encerrada', color: 'text-slate-500 bg-slate-100' };
    }
    return { label: 'Em Breve', color: 'text-slate-400 bg-slate-50' };
  };

  useEffect(() => {
    const checkApplication = async () => {
      if (!selectedFair || !profile) return;
      
      const { data } = await supabase
        .from('evaluator_applications')
        .select('id')
        .eq('fairId', selectedFair.id)
        .eq('userId', profile.uid)
        .maybeSingle();
      
      setHasApplied(!!data);
    };
    
    checkApplication();
  }, [selectedFair, profile]);

  const handleApplyEvaluator = async () => {
    if (!selectedFair) return;
    
    try {
      setApplying(true);
      await fairsService.applyAsEvaluator(selectedFair.id);
      toast.success('Candidatura enviada com sucesso! Aguarde a revisão do organizador.');
    } catch (error: any) {
      console.error('Erro ao candidatar-se:', error);
      toast.error('Erro ao enviar candidatura. Você pode já ter se candidatado.');
    } finally {
      setApplying(false);
    }
  };

  const filteredFairs = fairs.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedFair) {
    return (
      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8 bg-background-light dark:bg-app-bg min-h-full transition-colors duration-300">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedFair(null)} className="text-slate-400 dark:text-app-muted hover:text-primary transition-colors">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-app-fg">{selectedFair.name}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-primary dark:text-primary-light">
                <Info className="w-5 h-5" />
                Sobre a Feira
              </h3>
              <p className="text-slate-600 dark:text-app-muted leading-relaxed whitespace-pre-wrap">
                {selectedFair.description || "Esta feira ainda não possui uma descrição detalhada."}
              </p>
            </div>

            <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-primary dark:text-primary-light">
                <Calendar className="w-5 h-5" />
                Cronograma
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-app-surface rounded-xl">
                  <p className="text-[10px] text-slate-400 dark:text-app-muted/60 uppercase font-bold mb-1">Inscrições</p>
                  <p className="text-sm font-bold dark:text-app-fg">
                    {selectedFair.dates?.registration_start ? new Date(selectedFair.dates.registration_start).toLocaleDateString() : '-'} até {selectedFair.dates?.registration_end ? new Date(selectedFair.dates.registration_end).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-app-surface rounded-xl">
                  <p className="text-[10px] text-slate-400 dark:text-app-muted/60 uppercase font-bold mb-1">Avaliação</p>
                  <p className="text-sm font-bold dark:text-app-fg">
                    {selectedFair.dates?.evaluation_start ? new Date(selectedFair.dates.evaluation_start).toLocaleDateString() : '-'} até {selectedFair.dates?.evaluation_end ? new Date(selectedFair.dates.evaluation_end).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div className="p-4 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-xl sm:col-span-2">
                  <p className="text-[10px] text-primary dark:text-primary-light uppercase font-bold mb-1">Resultado Final</p>
                  <p className="text-sm font-bold text-primary dark:text-primary-light">
                    {selectedFair.dates?.results_date ? new Date(selectedFair.dates.results_date).toLocaleDateString() : 'A definir'}
                  </p>
                </div>
              </div>
            </div>

            {selectedFair.structure?.custom_form && selectedFair.structure.custom_form.length > 0 && (
              <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-primary dark:text-primary-light">
                  <FileText className="w-5 h-5" />
                  Campos do Formulário
                </h3>
                <p className="text-xs text-slate-500 dark:text-app-muted">
                  Além das informações básicas, esta feira solicita os seguintes campos para a submissão do projeto:
                </p>
                <div className="space-y-3">
                  {selectedFair.structure.custom_form.map(field => (
                    <div key={field.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-app-surface rounded-xl border border-slate-100 dark:border-app-border">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold dark:text-app-fg">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-app-muted uppercase font-medium">{field.type}</span>
                      </div>
                      {field.helpText && (
                        <div className="group relative">
                          <Info className="w-4 h-4 text-slate-300 dark:text-app-muted/40 cursor-help" />
                          <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {field.helpText}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold dark:text-app-fg">Participar</h3>
              <p className="text-xs text-slate-500 dark:text-app-muted">
                Interessado nesta feira? Você pode submeter seu projeto diretamente se as inscrições estiverem abertas.
              </p>
              <button 
                className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2"
                onClick={() => {
                  toast.info("Vá para a aba 'Projetos' para iniciar sua submissão nesta feira.");
                }}
              >
                Submeter Projeto
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold dark:text-app-fg">Avaliador</h3>
              <p className="text-xs text-slate-500 dark:text-app-muted">
                Tem experiência na área? Candidate-se para ser um avaliador nesta feira.
              </p>
              <button 
                disabled={applying || hasApplied || profile?.role === 'evaluator' || profile?.role === 'admin' || profile?.role === 'manager'}
                className={cn(
                  "w-full py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50",
                  hasApplied ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40" : "bg-white dark:bg-app-surface border border-primary text-primary dark:text-primary-light hover:bg-primary/5 dark:hover:bg-primary/10"
                )}
                onClick={handleApplyEvaluator}
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : (hasApplied ? <ShieldCheck className="w-4 h-4" /> : <Users className="w-4 h-4" />)}
                {hasApplied ? 'Candidatura Enviada' : 'Candidatar-se'}
              </button>
              {profile?.role === 'evaluator' && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 text-center font-bold">Você já é um avaliador.</p>}
              {(profile?.role === 'admin' || profile?.role === 'manager') && <p className="text-[10px] text-slate-400 dark:text-app-muted text-center font-bold">Organizadores não podem se candidatar.</p>}
            </div>

            <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold dark:text-app-fg">Categorias</h3>
              <div className="flex flex-wrap gap-2">
                {selectedFair.structure?.categories.map(cat => (
                  <span key={cat} className="px-3 py-1 bg-slate-100 dark:bg-app-surface text-slate-600 dark:text-app-muted rounded-full text-[10px] font-bold uppercase">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 bg-background-light dark:bg-app-bg min-h-full transition-colors duration-300">
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-app-fg tracking-tight">
          Descubra sua próxima <span className="text-primary dark:text-primary-light italic">oportunidade</span>
        </h2>
        <p className="text-slate-500 dark:text-app-muted max-w-2xl mx-auto">
          Explore todas as feiras científicas publicadas na plataforma. Encontre o desafio perfeito para o seu projeto e conecte-se com a comunidade.
        </p>
        
        <div className="relative max-w-xl mx-auto mt-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-app-muted w-5 h-5" />
          <input 
            type="text"
            placeholder="Buscar por nome, tema ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-app-card dark:text-app-fg elevation-1 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFairs.map((fair) => (
            <motion.div
              layout
              key={fair.id}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedFair(fair)}
              className="bg-white dark:bg-app-card elevation-1 rounded-3xl overflow-hidden cursor-pointer group border border-transparent hover:border-primary/10 transition-all"
            >
              <div className="h-32 bg-primary/5 dark:bg-primary/10 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                <Calendar className="w-12 h-12 text-primary/20 dark:text-primary/40" />
                <div className={cn(
                  "absolute top-4 right-4 px-3 py-1 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase",
                  getFairStatus(fair).color
                )}>
                  {getFairStatus(fair).label}
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-app-fg group-hover:text-primary transition-colors line-clamp-1">
                    {fair.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-app-muted line-clamp-2 mt-1">
                    {fair.description || "Explore os desafios desta feira científica."}
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-slate-50 dark:border-app-border">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-app-muted">
                    <Users className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">
                      {Array.isArray(fair.structure?.target_audience) 
                        ? (fair.structure.target_audience.length > 0 ? fair.structure.target_audience.join(', ') : 'Público Geral')
                        : (fair.structure?.target_audience || 'Público Geral')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-app-muted">
                    <MapPin className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">{fair.structure?.location_type || 'Híbrido'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[...Array(Math.min(projectCounts[fair.id] || 0, 3))].map((_, i) => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-app-card bg-slate-100 dark:bg-app-surface flex items-center justify-center text-[8px] font-bold text-slate-400 dark:text-app-muted">
                          {i + 1}
                        </div>
                      ))}
                      {(projectCounts[fair.id] || 0) > 3 && (
                        <div className="w-6 h-6 rounded-full border-2 border-white dark:border-app-card bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                          +{(projectCounts[fair.id] || 0) - 3}
                        </div>
                      )}
                      {(projectCounts[fair.id] || 0) === 0 && (
                        <div className="text-[10px] text-slate-400 dark:text-app-muted font-medium italic">Nenhum projeto ainda</div>
                      )}
                    </div>
                    {(projectCounts[fair.id] || 0) > 0 && (
                      <span className="text-[10px] font-bold text-slate-400 dark:text-app-muted ml-1">
                        {projectCounts[fair.id]} {projectCounts[fair.id] === 1 ? 'projeto' : 'projetos'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    Ver detalhes
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}

          {filteredFairs.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 dark:bg-app-surface rounded-full flex items-center justify-center mx-auto">
                <Search className="w-8 h-8 text-slate-300 dark:text-app-muted/40" />
              </div>
              <p className="text-slate-400 dark:text-app-muted font-medium">Nenhuma feira encontrada para sua busca.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
