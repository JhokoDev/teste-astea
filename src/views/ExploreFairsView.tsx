import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Users, ChevronRight, Loader2, Info, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { fairsService } from '../services/supabaseService';
import { Fair, User } from '../types';
import { toast } from 'sonner';

interface ExploreFairsViewProps {
  profile?: User | null;
}

export function ExploreFairsView({ profile }: ExploreFairsViewProps) {
  const [fairs, setFairs] = useState<Fair[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFair, setSelectedFair] = useState<Fair | null>(null);

  useEffect(() => {
    const unsubscribe = fairsService.subscribeToFairs((data) => {
      // Show ALL published fairs for discovery
      const publishedFairs = data.filter(f => f.status === 'publicado');
      setFairs(publishedFairs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredFairs = fairs.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedFair) {
    return (
      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedFair(null)} className="text-slate-400 hover:text-primary transition-colors">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">{selectedFair.name}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white elevation-1 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                <Info className="w-5 h-5" />
                Sobre a Feira
              </h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {selectedFair.description || "Esta feira ainda não possui uma descrição detalhada."}
              </p>
            </div>

            <div className="bg-white elevation-1 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                <Calendar className="w-5 h-5" />
                Cronograma
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Inscrições</p>
                  <p className="text-sm font-bold">
                    {selectedFair.dates?.registration_start ? new Date(selectedFair.dates.registration_start).toLocaleDateString() : '-'} até {selectedFair.dates?.registration_end ? new Date(selectedFair.dates.registration_end).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Avaliação</p>
                  <p className="text-sm font-bold">
                    {selectedFair.dates?.evaluation_start ? new Date(selectedFair.dates.evaluation_start).toLocaleDateString() : '-'} até {selectedFair.dates?.evaluation_end ? new Date(selectedFair.dates.evaluation_end).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl sm:col-span-2">
                  <p className="text-[10px] text-primary uppercase font-bold mb-1">Resultado Final</p>
                  <p className="text-sm font-bold text-primary">
                    {selectedFair.dates?.results_date ? new Date(selectedFair.dates.results_date).toLocaleDateString() : 'A definir'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white elevation-1 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold">Participar</h3>
              <p className="text-xs text-slate-500">
                Interessado nesta feira? Você pode submeter seu projeto diretamente se as inscrições estiverem abertas.
              </p>
              <button 
                className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2"
                onClick={() => {
                  // In a real app, this would redirect to the Projects tab with the fair selected
                  toast.info("Vá para a aba 'Projetos' para iniciar sua submissão nesta feira.");
                }}
              >
                Submeter Projeto
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white elevation-1 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold">Categorias</h3>
              <div className="flex flex-wrap gap-2">
                {selectedFair.structure?.categories.map(cat => (
                  <span key={cat} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase">
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
    <div className="p-4 lg:p-8 space-y-8">
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
          Descubra sua próxima <span className="text-primary italic">oportunidade</span>
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Explore todas as feiras científicas publicadas na plataforma. Encontre o desafio perfeito para o seu projeto e conecte-se com a comunidade.
        </p>
        
        <div className="relative max-w-xl mx-auto mt-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Buscar por nome, tema ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white elevation-1 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
              className="bg-white elevation-1 rounded-3xl overflow-hidden cursor-pointer group border border-transparent hover:border-primary/10 transition-all"
            >
              <div className="h-32 bg-primary/5 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                <Calendar className="w-12 h-12 text-primary/20" />
                <div className="absolute top-4 right-4 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full text-[10px] font-bold text-primary uppercase">
                  Inscrições Abertas
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                    {fair.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {fair.description || "Explore os desafios desta feira científica."}
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Users className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">Aberto a todos</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">Online / Presencial</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">
                        {i}
                      </div>
                    ))}
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">
                      +
                    </div>
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
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-400 font-medium">Nenhuma feira encontrada para sua busca.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
