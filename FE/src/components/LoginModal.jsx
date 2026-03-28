import { useState } from 'react';
import { useStore } from '../store';

export default function LoginModal() {
  const setAuth  = useStore(s => s.setAuth);
  const [tab, setTab]         = useState('magic');
  const [password, setPassword] = useState('');
  const [keys, setKeys]       = useState({ anthropic: '', gemini: '', tavily: '', github: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  function switchTab(t) { setTab(t); setError(''); }

  async function handleMagic() {
    if (!password) { setError('Enter the magic password.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('http://localhost:3001/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        setAuth({ done: true, mode: 'magic', keys: null });
      } else {
        setError('Wrong password. Try again.');
      }
    } catch {
      setError('Cannot reach backend. Is the server running on localhost:3001?');
    }
    setLoading(false);
  }

  function handleKeys() {
    const filled = Object.values(keys).filter(Boolean);
    if (!filled.length) { setError('Enter at least one API key.'); return; }
    setAuth({ done: true, mode: 'keys', keys });
  }

  return (
    <div className="login-overlay">
      <div className="login-modal">
        <div className="login-header">
          <h2>AI Citation Tracker</h2>
          <p className="login-sub">ChatGPT · Gemini · Claude · Tavily</p>
        </div>

        <div className="login-tabs">
          <button className={`login-tab ${tab === 'magic' ? 'active' : ''}`} onClick={() => switchTab('magic')}>
            🔑 Magic Password
          </button>
          <button className={`login-tab ${tab === 'keys' ? 'active' : ''}`} onClick={() => switchTab('keys')}>
            🗝️ My API Keys
          </button>
        </div>

        {tab === 'magic' && (
          <div className="login-body">
            <p className="login-hint">Enter the magic password to use the built-in API keys.</p>
            <input
              className="login-input"
              type="password"
              placeholder="Magic password..."
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMagic()}
              autoFocus
            />
            <button className="login-btn" onClick={handleMagic} disabled={loading}>
              {loading ? 'Verifying...' : 'Enter'}
            </button>
          </div>
        )}

        {tab === 'keys' && (
          <div className="login-body">
            <p className="login-hint">Use your own API keys. They are sent only to your local backend and never stored.</p>
            <input className="login-input" placeholder="Anthropic API Key" value={keys.anthropic} onChange={e => setKeys({ ...keys, anthropic: e.target.value })} />
            <input className="login-input" placeholder="Gemini API Key" value={keys.gemini} onChange={e => setKeys({ ...keys, gemini: e.target.value })} />
            <input className="login-input" placeholder="Tavily API Key" value={keys.tavily} onChange={e => setKeys({ ...keys, tavily: e.target.value })} />
            <input className="login-input" placeholder="GitHub Token (for ChatGPT)" value={keys.github} onChange={e => setKeys({ ...keys, github: e.target.value })} />
            <button className="login-btn" onClick={handleKeys}>Start</button>
          </div>
        )}

        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  );
}
