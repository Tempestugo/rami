import React, { useState } from 'react';
import useStore from './store/useStore';

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ef4444;color:white;z-index:99999;padding:12px;font-family:monospace;font-size:12px;word-break:break-all;border-bottom:2px solid #b91c1c;box-shadow:0 4px 12px rgba(0,0,0,0.5);';
    errDiv.innerText = `[RAMI DEBUG ERROR] ${e.message} (${e.filename}:${e.lineno})`;
    document.body.appendChild(errDiv);
  });
}
import Auth from './features/Auth.jsx';
import LandingPage from './features/LandingPage.jsx';
import Home from './features/Home.jsx';
import SidebarFilters from './features/SidebarFilters';
import GraphCanvas from './features/GraphCanvas';
import DetailsPanel from './features/DetailsPanel';
import PhraseModal from './features/PhraseModal';
import PhraseSelectionBar from './components/PhraseSelectionBar';
import LearningTrail from './features/LearningTrail';
import LumiWarfare from './features/LumiWarfare';
import SiegeMode from './features/SiegeMode';
import CardCollection from './features/CardCollection.jsx';
import FraseCook from './features/FraseCook';
import UserProfile from './features/UserProfile.jsx';
import AdminPanel from './features/AdminPanel.jsx';
import ConversationModule from './features/ConversationModule.jsx';

const MODES = {
  HOME:         'home',
  LEARN:        'learn',
  STUDY:        'study',
  FRASE:        'frase',
  SIEGE:        'siege',
  CARDS:        'cards',
  WARFARE:      'warfare',
  CONVERSATION: 'conversation',
  USER:         'user',
  ADMIN:        'admin',
};

const NAV = [
  { key: MODES.HOME,         label: 'Início',        icon: '' },
  { key: MODES.LEARN,        label: 'Aprender',       icon: '️' },
  { key: MODES.CARDS,        label: 'Cartas',          icon: '' },
  { key: MODES.CONVERSATION, label: 'Conversação',    icon: '💬' },
  { key: MODES.STUDY,        label: 'Explorer',       icon: '️' },
  { key: MODES.FRASE,        label: 'Frases',         icon: '' },
  { key: MODES.SIEGE,        label: 'Cerco',          icon: '' },
  { key: MODES.WARFARE,      label: 'Arena',          icon: '️' },
  { key: MODES.USER,         label: 'Usuário',         icon: '' },
];

export default function App() {
  const user = useStore(state => state.user);
  const [mode, setMode] = useState(MODES.HOME);
  const [showAuth, setShowAuth] = useState(false);

  if (!user && !showAuth) {
    return <LandingPage onLogin={() => setShowAuth(true)} />;
  }

  if (!user && showAuth) {
    return <Auth />;
  }

  const headerTitle = {
    [MODES.HOME]:         ['Rami',            ' Painel de Estudos'],
    [MODES.LEARN]:        ['Aprender',        '️ Prática com Frases'],
    [MODES.CONVERSATION]: ['Conversação',    ' Prática de Conversação'],
    [MODES.STUDY]:        ['Rami',            '漢字 Graph Explorer'],
    [MODES.FRASE]:        ['文 FraseCook',    'Monte frases em chinês'],
    [MODES.SIEGE]:        ['Modo Cerco',      ' Defenda desenhando'],
    [MODES.CARDS]:        ['Minhas Cartas',    ' Coleção de Ideogramas'],
    [MODES.WARFARE]:      ['Lumi Warfare',    '️ Campo de Batalha'],
    [MODES.USER]:         ['Usuário',         ' Perfil e Configurações'],
    [MODES.ADMIN]:        ['Admin',           ' Painel de Controle'],
  };

  const [title, subtitle] = headerTitle[mode] || ['Rami', ''];

  return (
    <div className="app-container flex flex-col h-screen overflow-hidden bg-ink-950">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-3 border-b border-white/[0.08] bg-ink-900 z-20 shrink-0 gap-3 md:gap-0">
        <div className="flex items-center gap-3">
          <span className="font-display text-vermillion-500 text-xl font-bold tracking-wide shrink-0">
            {title}
          </span>
          <span className="text-ink-400 text-sm font-body hidden sm:block shrink-0">
            {subtitle}
          </span>
        </div>

        <nav className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 md:pb-0 scrollbar-thin scrollbar-thumb-white/10 w-full md:w-auto">
          {(user?.username === 'Rami' ? [...NAV, { key: MODES.ADMIN, label: 'Admin', icon: '⚙️' }] : NAV).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                mode === key
                  ? key === MODES.HOME         ? 'bg-vermillion-500/15 border-vermillion-500/60 text-vermillion-300'
                  : key === MODES.CARDS        ? 'bg-jade-500/15 border-jade-400 text-jade-300'
                  : key === MODES.LEARN        ? 'bg-azure-500/15 border-azure-400 text-azure-300'
                  : key === MODES.CONVERSATION ? 'bg-pink-500/15 border-pink-400 text-pink-300'
                  : key === MODES.STUDY        ? 'bg-white/10 border-white/30 text-white'
                  : key === MODES.FRASE        ? 'bg-gold-500/10 border-gold-400 text-gold-300'
                  : key === MODES.SIEGE        ? 'bg-gold-500/10 border-gold-400 text-gold-300'
                  : key === MODES.USER         ? 'bg-vermillion-500/15 border-vermillion-500/60 text-vermillion-300'
                  : key === MODES.ADMIN        ? 'bg-azure-500/15 border-azure-400 text-azure-300'
                  :                              'bg-vermillion-500/10 border-vermillion-500 text-vermillion-400'
                  : 'bg-white/5 border-white/10 text-ink-400 hover:bg-white/8 hover:text-ink-200'
              }`}
            >
              <span className="mr-1">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
          <span className="text-xs text-ink-400 font-mono border border-white/10 px-2 py-0.5 rounded ml-2 shrink-0">v1.2.0</span>
        </nav>
      </header>

      {/* ── Conteúdo ──────────────────────────────────────────────────────── */}
      {mode === MODES.HOME && (
        <Home onNavigate={(dest) => setMode(dest === 'learn' ? MODES.LEARN : dest === 'study' ? MODES.STUDY : MODES.HOME)} />
      )}

      {mode === MODES.USER && (
        <UserProfile />
      )}

      {mode === MODES.ADMIN && user?.username === 'Rami' && (
        <AdminPanel />
      )}

      {mode === MODES.LEARN && (
        <div className="flex-1 overflow-hidden">
          <LearningTrail />
        </div>
      )}

      {mode === MODES.STUDY && (
        <>
          <div className="flex flex-1 overflow-hidden relative">
            <SidebarFilters /><GraphCanvas /><DetailsPanel />
          </div>
          <PhraseSelectionBar />
          <PhraseModal />
        </>
      )}

      {mode === MODES.CARDS && (
        <CardCollection />
      )}

      {mode === MODES.FRASE && (
        <div className="flex-1 relative overflow-hidden bg-ink-950">
          <FraseCook initialHsk={1} initialContext={null} />
        </div>
      )}

      {mode === MODES.SIEGE && (
        <div className="flex-1 relative overflow-hidden bg-ink-950 p-6">
          <SiegeMode hskLevel={1} waveSize={5} onWaveComplete={() => console.log('Onda completa!')} />
        </div>
      )}

      {mode === MODES.WARFARE && (
        <div className="flex-1 relative overflow-hidden bg-ink-950 flex items-center justify-center p-8">
          <LumiWarfare />
        </div>
      )}

      {mode === MODES.CONVERSATION && (
        <div className="flex-1 overflow-hidden">
          <ConversationModule />
        </div>
      )}
    </div>
  );
}