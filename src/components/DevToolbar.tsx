import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  User, 
  Users, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Shield, 
  GraduationCap, 
  UserCheck, 
  Briefcase,
  X,
  RefreshCw,
  Search,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserRole } from '../types';
import { supabase } from '../supabase';
import { toast } from 'sonner';

interface DevToolbarProps {
  currentRole: UserRole | null;
  onRoleChange: (role: UserRole | null) => void;
  onUserImpersonate: (user: any) => void;
  simulatedTimeOffset: number; // in days
  onTimeOffsetChange: (offset: number) => void;
}

export function DevToolbar({ 
  currentRole, 
  onRoleChange, 
  onUserImpersonate,
  simulatedTimeOffset,
  onTimeOffsetChange
}: DevToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'time' | 'bulk'>('roles');
  const [users, setUsers] = useState<any[]>([]);
  const [virtualUsers, setVirtualUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Generation State
  const [bulkRole, setBulkRole] = useState<UserRole>('student');
  const [startIndex, setStartIndex] = useState(1);
  const [quantity, setQuantity] = useState(5);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('dev_virtual_users');
    if (saved) {
      try {
        setVirtualUsers(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing virtual users:', e);
      }
    }
  }, []);

  const roles: { id: UserRole; label: string; icon: any; color: string }[] = [
    { id: 'admin', label: 'Administrador', icon: Shield, color: 'text-red-500' },
    { id: 'manager', label: 'Organizador', icon: Briefcase, color: 'text-blue-500' },
    { id: 'advisor', label: 'Orientador', icon: UserCheck, color: 'text-purple-500' },
    { id: 'evaluator', label: 'Avaliador', icon: Users, color: 'text-green-500' },
    { id: 'student', label: 'Aluno', icon: GraduationCap, color: 'text-amber-500' },
  ];

  useEffect(() => {
    if (activeTab === 'users' && isOpen) {
      fetchUsers();
    }
  }, [activeTab, isOpen]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(20);
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users for dev toolbar:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleBulkGenerate = async () => {
    setGenerating(true);
    const toastId = toast.loading(`Gerando ${quantity} usuários reais...`);
    
    try {
      // Call the server API for real user creation
      const response = await fetch('/api/dev/bulk-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: bulkRole,
          startIndex,
          quantity
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao gerar usuários reais');
      }

      toast.success(`${result.count} usuários REAIS gerados com sucesso!`, { id: toastId });
      
      // Refresh the users list to show the new real users
      if (activeTab === 'users') fetchUsers();
    } catch (error: any) {
      console.error('Error generating real users:', error);
      toast.error('Erro ao gerar usuários reais: ' + error.message, { 
        id: toastId,
        description: 'Certifique-se de que a SUPABASE_SERVICE_ROLE_KEY está configurada.'
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleVirtualGenerate = () => {
    const newVirtuals = [];
    for (let i = startIndex; i < startIndex + quantity; i++) {
      const name = `${bulkRole}_${i}`;
      const email = `${bulkRole}_${i}@astea.test`;
      const uid = crypto.randomUUID();
      
      newVirtuals.push({
        uid,
        email,
        displayname: name,
        role: bulkRole,
        institutionid: 'default-inst',
        photourl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        isVirtual: true
      });
    }

    const updatedVirtuals = [...virtualUsers, ...newVirtuals];
    setVirtualUsers(updatedVirtuals);
    localStorage.setItem('dev_virtual_users', JSON.stringify(updatedVirtuals));
    toast.success(`${quantity} usuários VIRTUAIS gerados localmente.`);
  };

  const clearVirtualUsers = () => {
    if (confirm('Deseja remover todos os usuários virtuais locais?')) {
      setVirtualUsers([]);
      localStorage.removeItem('dev_virtual_users');
      toast.info('Usuários virtuais removidos.');
    }
  };

  const copySqlToClipboard = () => {
    if (virtualUsers.length === 0) {
      toast.error('Gere usuários virtuais primeiro!');
      return;
    }

    const sql = virtualUsers.map(u => 
      `-- Usuário: ${u.displayname}\n` +
      `INSERT INTO auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token) \n` +
      `VALUES ('${u.uid}', '${u.email}', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"${u.displayname}"}', now(), now(), 'authenticated', 'authenticated', '');\n` +
      `INSERT INTO public.users (uid, email, displayname, photourl, role, institutionid) \n` +
      `VALUES ('${u.uid}', '${u.email}', '${u.displayname}', '${u.photourl}', '${u.role}', 'default-inst');\n`
    ).join('\n');

    navigator.clipboard.writeText(sql);
    toast.success('SQL copiado para a área de transferência!');
  };

  const allUsers = [...virtualUsers, ...users];
  const filteredUsers = allUsers.filter(u => 
    u.displayname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-slate-900 text-white p-2 rounded-l-xl shadow-2xl border border-slate-700 transition-all duration-300",
          isOpen ? "right-[320px]" : "right-0"
        )}
        title="Ferramentas de Desenvolvedor"
      >
        {isOpen ? <ChevronRight size={20} /> : <Settings size={20} className="animate-spin-slow" />}
      </button>

      {/* Toolbar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-[320px] bg-slate-900 border-l border-slate-700 z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-bottom border-slate-700 flex items-center justify-between bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-amber-500" />
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Dev Tools</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setActiveTab('roles')}
                className={cn(
                  "flex-1 p-3 text-xs font-medium transition-colors",
                  activeTab === 'roles' ? "text-amber-500 border-b-2 border-amber-500 bg-slate-800" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Papéis
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={cn(
                  "flex-1 p-3 text-xs font-medium transition-colors",
                  activeTab === 'users' ? "text-amber-500 border-b-2 border-amber-500 bg-slate-800" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Usuários
              </button>
              <button
                onClick={() => setActiveTab('time')}
                className={cn(
                  "flex-1 p-3 text-xs font-medium transition-colors",
                  activeTab === 'time' ? "text-amber-500 border-b-2 border-amber-500 bg-slate-800" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Tempo
              </button>
              <button
                onClick={() => setActiveTab('bulk')}
                className={cn(
                  "flex-1 p-3 text-xs font-medium transition-colors",
                  activeTab === 'bulk' ? "text-amber-500 border-b-2 border-amber-500 bg-slate-800" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Gerador
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'roles' && (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-3">Simular Permissões</p>
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => onRoleChange(currentRole === role.id ? null : role.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                        currentRole === role.id 
                          ? "bg-amber-500/10 border-amber-500 text-amber-500" 
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      )}
                    >
                      <role.icon size={18} className={currentRole === role.id ? "text-amber-500" : role.color} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{role.label}</div>
                        <div className="text-[10px] opacity-60">Ver como {role.id}</div>
                      </div>
                      {currentRole === role.id && <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
                    </button>
                  ))}
                  
                  {currentRole && (
                    <button
                      onClick={() => onRoleChange(null)}
                      className="w-full mt-4 p-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={14} />
                      Resetar para Real
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input
                      type="text"
                      placeholder="Buscar usuário..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-2">
                    {loadingUsers ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                        <RefreshCw size={24} className="animate-spin mb-2" />
                        <span className="text-xs">Carregando usuários...</span>
                      </div>
                    ) : filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <button
                          key={user.uid}
                          onClick={() => onUserImpersonate(user)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors text-left group"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-amber-500 border border-slate-600 overflow-hidden">
                            {user.photourl ? (
                              <img src={user.photourl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              user.displayname?.charAt(0) || 'U'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-xs font-medium text-white truncate">{user.displayname}</div>
                              {user.isVirtual && (
                                <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1 rounded border border-amber-500/30 font-bold uppercase">Virtual</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{user.role} • {user.email}</div>
                          </div>
                          <ChevronRight size={14} className="text-slate-600 group-hover:text-amber-500 transition-colors" />
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        Nenhum usuário encontrado.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'time' && (
                <div className="space-y-6">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-500 mb-2">
                      <Clock size={16} />
                      <span className="text-xs font-bold uppercase">Máquina do Tempo</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Ajuste o tempo do sistema para testar prazos de inscrição, avaliação e resultados.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                        <span>Offset Atual:</span>
                        <span className="text-amber-500 font-bold">{simulatedTimeOffset} dias</span>
                      </div>
                      <input
                        type="range"
                        min="-30"
                        max="30"
                        step="1"
                        value={simulatedTimeOffset}
                        onChange={(e) => onTimeOffsetChange(parseInt(e.target.value))}
                        className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[8px] text-slate-600 mt-1">
                        <span>-30 dias</span>
                        <span>Hoje</span>
                        <span>+30 dias</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onTimeOffsetChange(0)}
                        className="p-2 bg-slate-800 border border-slate-700 rounded text-[10px] text-white hover:bg-slate-700"
                      >
                        Resetar para Hoje
                      </button>
                      <button
                        onClick={() => onTimeOffsetChange(simulatedTimeOffset + 7)}
                        className="p-2 bg-slate-800 border border-slate-700 rounded text-[10px] text-white hover:bg-slate-700"
                      >
                        +1 Semana
                      </button>
                    </div>

                    <div className="pt-4 border-t border-slate-700">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-3">Atalhos de Fluxo</p>
                      <div className="space-y-2">
                        <button 
                          onClick={() => onTimeOffsetChange(15)}
                          className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 hover:text-white hover:border-amber-500/50 transition-all text-left flex items-center justify-between"
                        >
                          <span>Simular Inscrições Encerradas</span>
                          <ChevronRight size={12} />
                        </button>
                        <button 
                          onClick={() => onTimeOffsetChange(25)}
                          className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 hover:text-white hover:border-amber-500/50 transition-all text-left flex items-center justify-between"
                        >
                          <span>Simular Período de Avaliação</span>
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'bulk' && (
                <div className="space-y-6">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-500 mb-2">
                      <RefreshCw size={16} />
                      <span className="text-xs font-bold uppercase">Gerador em Massa</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Crie usuários de teste locais. Eles existem apenas no seu navegador para simular a interface e permissões.
                    </p>
                  </div>

                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                    <p className="text-[9px] text-red-400 leading-tight">
                      <strong>Aviso:</strong> Usuários virtuais não podem salvar dados no banco (violação de FK). Use o botão de SQL abaixo para torná-los reais se necessário.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Cargo (Role)</label>
                      <select 
                        value={bulkRole}
                        onChange={(e) => setBulkRole(e.target.value as UserRole)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500"
                      >
                        {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Índice Inicial</label>
                        <input 
                          type="number"
                          value={startIndex}
                          onChange={(e) => setStartIndex(parseInt(e.target.value) || 1)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Quantidade</label>
                        <input 
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Exemplo de Saída:</p>
                      <div className="text-[10px] text-slate-400 font-mono space-y-1">
                        <div>Nome: {bulkRole}_{startIndex}</div>
                        <div>Email: {bulkRole}_{startIndex}@astea.test</div>
                        <div>Senha: mudar123</div>
                      </div>
                    </div>

                    <button
                      onClick={handleBulkGenerate}
                      disabled={generating}
                      className="w-full py-3 bg-amber-500 text-slate-900 rounded-xl font-bold hover:bg-amber-400 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {generating ? <RefreshCw size={16} className="animate-spin" /> : <Shield size={16} />}
                      Gerar Usuários REAIS (Banco)
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleVirtualGenerate}
                        className="p-2 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 hover:text-white flex items-center justify-center gap-2"
                      >
                        <Users size={12} />
                        Gerar Virtuais
                      </button>
                      <button
                        onClick={clearVirtualUsers}
                        className="p-2 bg-slate-800 border border-red-500/30 rounded text-[10px] text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2"
                      >
                        <X size={12} />
                        Limpar Virtuais
                      </button>
                    </div>

                    <button
                      onClick={copySqlToClipboard}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 hover:text-white flex items-center justify-center gap-2"
                    >
                      <FileText size={12} />
                      Exportar SQL (Backup)
                    </button>

                    <p className="text-[9px] text-slate-500 italic text-center">
                      * Usuários gerados via mock para impersonação rápida.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-800/80 border-t border-slate-700">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500">Status:</span>
                <span className="text-green-500 font-bold flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Modo Debug Ativo
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
