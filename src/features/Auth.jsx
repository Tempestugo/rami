import React, { useState } from 'react';
import useStore from '../store/useStore';

export default function Auth() {
  const login = useStore(state => state.login);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro na autenticação');
      }

      if (data.success) {
        login(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0908',
      backgroundImage: 'radial-gradient(ellipse at 20% 30%, rgba(220,38,38,0.06) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(5,150,105,0.04) 0%, transparent 55%)',
      fontFamily: '"DM Sans", sans-serif',
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Decorative background glows */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '20%', left: '15%',
          width: 240, height: 240,
          background: 'rgba(220,38,38,0.06)', borderRadius: '50%', filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', right: '10%',
          width: 300, height: 300,
          background: 'rgba(5,150,105,0.05)', borderRadius: '50%', filter: 'blur(100px)',
        }} />
      </div>

      {/* Decorative hanzi characters */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60,
        opacity: 0.03, userSelect: 'none',
      }}>
        {['學', '習', '字', '人', '水', '火', '木'].map((c, i) => (
          <span key={i} style={{ fontSize: '6rem', fontFamily: 'serif', color: '#f5f5f4' }}>{c}</span>
        ))}
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'rgba(28,25,23,0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '36px 32px 32px',
        boxShadow: '0 0 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        position: 'relative',
        zIndex: 10,
      }}>

        {/* Top glow line */}
        <div style={{
          position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(220,38,38,0.6), transparent)',
          borderRadius: 1,
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            marginBottom: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: '#12100e',
              border: '1px solid rgba(220,38,38,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 20, fontFamily: 'serif', color: '#dc2626' }}>木</span>
            </div>
            <span style={{
              fontSize: 22, fontWeight: 800, letterSpacing: '0.04em',
              background: 'linear-gradient(135deg, #f5f5f4, #78716c)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Rami</span>
          </div>
          <p style={{ fontSize: 13, color: '#78716c', margin: 0 }}>
            {isLogin ? 'Continue seus estudos' : 'Crie sua conta para começar'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            marginBottom: 18, padding: '10px 14px',
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.25)',
            borderRadius: 10, fontSize: 13,
            color: '#fca5a5', textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#78716c', marginBottom: 6, fontWeight: 500, letterSpacing: '0.04em' }}>
              USUÁRIO
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Seu nome de usuário"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 10, padding: '11px 14px',
                fontSize: 14, color: '#f5f5f4',
                outline: 'none', transition: 'border-color 0.2s',
                fontFamily: '"DM Sans", sans-serif',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(220,38,38,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#78716c', marginBottom: 6, fontWeight: 500, letterSpacing: '0.04em' }}>
              SENHA
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Sua senha"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 10, padding: '11px 14px',
                fontSize: 14, color: '#f5f5f4',
                outline: 'none', transition: 'border-color 0.2s',
                fontFamily: '"DM Sans", sans-serif',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(220,38,38,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              width: '100%', padding: '12px',
              background: loading
                ? 'rgba(220,38,38,0.3)'
                : 'linear-gradient(135deg, #dc2626, #b91c1c)',
              border: 'none',
              borderRadius: 10, fontSize: 14, fontWeight: 700,
              color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 0 24px rgba(220,38,38,0.25)',
              transition: 'all 0.2s',
              fontFamily: '"DM Sans", sans-serif',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {loading ? 'Aguarde...' : (isLogin ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>

        {/* Switch mode */}
        <div style={{ marginTop: 22, textAlign: 'center', fontSize: 13, color: '#57534e' }}>
          {isLogin ? 'Ainda não tem uma conta? ' : 'Já possui uma conta? '}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 13, fontWeight: 600, color: '#dc2626',
              fontFamily: '"DM Sans", sans-serif',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#dc2626'}
          >
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </button>
        </div>

        {/* Divider / version */}
        <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14, textAlign: 'center' }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#292524', letterSpacing: '0.08em' }}>
            RAMI · 木 · v1.2.0
          </span>
        </div>
      </div>
    </div>
  );
}
