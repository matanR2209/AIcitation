import { useState, useEffect } from 'react';
import { useStore } from './store';
import Sidebar from './components/Sidebar';
import RunPanel from './components/RunPanel';
import ResponseTabs from './components/ResponseTabs';
import CitationMatrix from './components/CitationMatrix';
import StatusBar from './components/StatusBar';
import LoginModal from './components/LoginModal';

function MobileBlock() {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mobile-block">
      <div className="mobile-block-content">
        <div className="mobile-robot">🤖</div>
        <h1>Citation Not Found</h1>
        <p className="mobile-error-code">Error 403: Insufficient Screen Width</p>
        <p className="mobile-message">
          I've analyzed your device with 99.7% confidence and concluded it is
          too narrow to render citations properly. This application is trained
          exclusively on desktop environments — where serious AI research happens.
        </p>
        <p className="mobile-footer">
          Copy this link and open it on your desktop browser.<br />
          <em>Mobile support is not in my training data.</em>
        </p>
        <div className="mobile-copy-row">
          <span className="mobile-url">{url}</span>
          <button className="mobile-copy-btn" onClick={copyLink}>
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const auth = useStore(s => s.auth);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (isMobile) return <MobileBlock />;
  if (!auth.done) return <LoginModal />;

  return (
    <div className="app">
      {/* HEADER */}
      <div className="header">
        <div>
          <h1>AI Citation Tracker</h1>
          <div className="header-sub">ChatGPT · Gemini · Claude · Tavily</div>
        </div>
      </div>

      {/* STATUS BAR */}
      <StatusBar />

      {/* MAIN LAYOUT */}
      <div className="main">
        <Sidebar />
        <div className="right-panel">
          <RunPanel />
          <ResponseTabs />
          <CitationMatrix />
        </div>
      </div>
    </div>
  );
}
