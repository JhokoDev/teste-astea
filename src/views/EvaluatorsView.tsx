import React, { useState, useEffect } from 'react';
import { UserSearch, ShieldCheck, ShieldAlert, EyeOff, Eye, UserPlus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../supabase';

export function EvaluatorsView() {
  const [isBlindMode, setIsBlindMode] = useState(true);
  const [evaluators, setEvaluators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    supabase.from('evaluators').select('*').then(({ data, error }) => {
      if (error) console.error('Supabase Error:', error);
      if (data) setEvaluators(data);
      setLoading(false);
    });

    // Real-time subscription
    const subscription = supabase
      .channel('evaluators_changes')
      .on('postgres_changes' as any, { event: '*', table: 'evaluators' }, async () => {
        const { data, error } = await supabase.from('evaluators').select('*');
        if (error) console.error('Supabase Error:', error);
        if (data) setEvaluators(data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Corpo de Avaliadores</h2>
          <p className="text-xs lg:text-sm text-slate-500">Gerencie juízes e atribuições de projetos.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setIsBlindMode(!isBlindMode)}
            className={cn(
              "px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all",
              isBlindMode ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-600 border border-slate-200"
            )}
          >
            {isBlindMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="whitespace-nowrap">Avaliação Cega: {isBlindMode ? 'ON' : 'OFF'}</span>
          </button>
          <button className="bg-primary text-white px-6 py-2 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md">
            <UserPlus className="w-5 h-5" />
            <span className="whitespace-nowrap">Convidar Juiz</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 bg-white elevation-1 rounded-2xl overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-400 uppercase">Avaliador</th>
                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-400 uppercase">Especialidade</th>
                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-400 uppercase">Projetos</th>
                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-400 uppercase">Conflito (RF09)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {evaluators.length > 0 ? evaluators.map((judge) => (
                <tr key={judge.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-4 lg:px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{judge.name}</p>
                    <p className="text-[10px] text-slate-400">{judge.institution}</p>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-slate-600">{judge.specialty}</td>
                  <td className="px-4 lg:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(judge.projectCount / 15) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-900">{judge.projectCount}</span>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    {judge.hasConflict ? (
                      <div className="flex items-center gap-1 text-amber-600">
                        <ShieldAlert className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Verificar</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Validado</span>
                      </div>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-4 lg:px-6 py-8 text-center text-slate-400 text-sm">
                    Nenhum avaliador cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 lg:space-y-6">
          <div className="bg-white elevation-1 rounded-2xl p-4 lg:p-6 space-y-4">
            <h3 className="text-lg font-bold">Distribuição de Carga</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Bioquímica</span>
                  <span className="text-primary">85%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '85%' }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Engenharia</span>
                  <span className="text-primary">40%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '40%' }} />
                </div>
              </div>
            </div>
            <button className="w-full py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20">
              Otimizar Distribuição
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 lg:p-6 space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-bold text-sm">Atenção: Conflitos (RF09)</h4>
            </div>
            <p className="text-xs text-amber-600 leading-relaxed">
              O sistema monitora automaticamente vínculos institucionais para garantir a integridade das avaliações.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
