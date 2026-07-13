import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';

export default function AdminPanel() {
  const user = useStore(state => state.user);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/users', {
        headers: {
          'X-Admin-User': user?.username || ''
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsersList(data.data || []);
      } else {
        setError(data.error || 'Falha ao buscar dados');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.username === 'Rami') {
      fetchUsers();
    }
  }, [user]);

  if (user?.username !== 'Rami') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-ink-950 text-ink-300">
        <div className="bg-ink-900 border border-vermillion-500/30 rounded-2xl p-6 text-center max-w-md shadow-xl">
          <span className="text-4xl">🚫</span>
          <h2 className="text-white font-display font-bold text-xl mt-3">Acesso Negado</h2>
          <p className="text-ink-400 text-sm mt-2">
            Apenas usuários administradores têm permissão para acessar esta área.
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = usersList.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = usersList.length;
  const activeStreaks = usersList.filter(u => u.streak_count > 0).length;
  const averageCards = totalUsers > 0 
    ? Math.round(usersList.reduce((acc, u) => acc + u.cards_count, 0) / totalUsers) 
    : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-ink-950 p-4 md:p-8 flex flex-col gap-6 md:gap-8 scrollbar-thin">
      
      {/* ── Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Users */}
        <div className="bg-ink-900 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-1.5 shadow-lg shadow-black/10 relative overflow-hidden group hover:border-azure-500/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-azure-500/5 rounded-full blur-2xl group-hover:bg-azure-500/10 transition-all" />
          <span className="text-[10px] text-azure-400 font-mono uppercase tracking-widest">Total de Usuários</span>
          <span className="text-3xl font-display font-black text-white mt-1">{totalUsers}</span>
          <span className="text-[10px] text-ink-500 font-mono mt-1">Contas registradas no banco</span>
        </div>

        {/* Active Streaks */}
        <div className="bg-ink-900 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-1.5 shadow-lg shadow-black/10 relative overflow-hidden group hover:border-vermillion-500/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-vermillion-500/5 rounded-full blur-2xl group-hover:bg-vermillion-500/10 transition-all" />
          <span className="text-[10px] text-vermillion-400 font-mono uppercase tracking-widest">Com Ofensivas Ativas</span>
          <span className="text-3xl font-display font-black text-white mt-1 flex items-center gap-1.5">
            {activeStreaks} <span className="text-xl">🔥</span>
          </span>
          <span className="text-[10px] text-ink-500 font-mono mt-1">Estudantes activos hoje</span>
        </div>

        {/* Avg Cards Studied */}
        <div className="bg-ink-900 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-1.5 shadow-lg shadow-black/10 relative overflow-hidden group hover:border-gold-500/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500/5 rounded-full blur-2xl group-hover:bg-gold-500/10 transition-all" />
          <span className="text-[10px] text-gold-400 font-mono uppercase tracking-widest">Média de Ideogramas</span>
          <span className="text-3xl font-display font-black text-white mt-1 flex items-center gap-1.5">
            {averageCards} <span className="text-xl">🎴</span>
          </span>
          <span className="text-[10px] text-ink-500 font-mono mt-1">Média por usuário cadastrado</span>
        </div>

      </div>

      {/* ── Users Table Panel ── */}
      <div className="bg-ink-900 border border-white/[0.06] rounded-2xl shadow-xl flex flex-col overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/20">
          <div>
            <h3 className="text-white font-display font-bold text-base">Controle de Usuários</h3>
            <p className="text-ink-400 text-xs mt-0.5">Visualize a lista de estudantes e seu respectivo progresso de caracteres e lições.</p>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              placeholder="Buscar estudante..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-ink-500 focus:outline-none focus:border-azure-500/50 w-full sm:w-48 transition"
            />
            <button 
              onClick={fetchUsers}
              className="bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded-xl text-xs text-ink-300 hover:text-white transition flex items-center justify-center shrink-0"
              title="Atualizar dados"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="p-12 text-center text-ink-400 text-sm font-mono flex flex-col items-center justify-center gap-2">
            <span className="animate-spin text-xl">⏳</span>
            <span>Carregando estudantes do banco remoto...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-vermillion-400 text-sm font-mono border border-vermillion-500/10 m-6 rounded-xl bg-vermillion-500/5">
            <span>⚠️ Erro: {error}</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-ink-500 text-sm font-mono">
            <span>Nenhum estudante encontrado.</span>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.04] text-[10px] text-ink-500 font-mono uppercase tracking-wider bg-black/10">
                  <th className="py-3.5 px-6">ID</th>
                  <th className="py-3.5 px-4">Estudante</th>
                  <th className="py-3.5 px-4 text-center">🔥 Streak</th>
                  <th className="py-3.5 px-4 text-center">🏆 Arena</th>
                  <th className="py-3.5 px-4 text-center">🎴 Cartas</th>
                  <th className="py-3.5 px-4 text-center">⚡ Deck</th>
                  <th className="py-3.5 px-4 text-center">📖 Lições</th>
                  <th className="py-3.5 px-6 text-right">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr 
                    key={u.id}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-all text-xs font-body text-ink-300"
                  >
                    <td className="py-4 px-6 font-mono text-ink-500">#{u.id}</td>
                    <td className="py-4 px-4 font-display font-bold text-white text-sm">{u.username}</td>
                    <td className="py-4 px-4 text-center font-mono">
                      {u.streak_count > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-vermillion-500/15 border border-vermillion-500/30 text-vermillion-400 font-bold">
                          {u.streak_count}d
                        </span>
                      ) : (
                        <span className="text-ink-500">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-gold-300 font-bold">
                      {u.arena_score > 0 ? u.arena_score : <span className="text-ink-500">—</span>}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-jade-300">
                      {u.cards_count}
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-azure-300 font-bold">
                      {u.deck_count}
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-indigo-300">
                      {u.progress_count}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-[10px] text-ink-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
