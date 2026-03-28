import { useState } from 'react';
import { useStore, AIS } from '../store';
import { highlightSources } from '../lib/citationDetector';

const AI_META = {
  chatgpt:    { label: '🤖 ChatGPT',   color: 'chatgpt' },
  gemini:     { label: '✦ Gemini',     color: 'gemini' },
  claude:     { label: '◆ Claude',     color: 'claude' },
  tavily:     { label: '🔍 Tavily',    color: 'tavily' },
  perplexity: { label: '⊕ Perplexity', color: 'perplexity' },
};

export default function ResponseTabs() {
  const [activeTab, setActiveTab] = useState('claude');
  const activeIdx = useStore(s => s.activeIdx);
  const responses = useStore(s => s.responses);
  const runState  = useStore(s => s.runState);
  const currentAI = useStore(s => s.currentAI);

  const row = responses[activeIdx];

  function tabStatus(ai) {
    const text = row[ai].text;
    if (text) return 'done';
    if (runState === 'running' && currentAI === ai) return 'loading';
    return null;
  }

  return (
    <div className="response-area">
      {/* Tabs */}
      <div className="tabs-bar">
        {AIS.map(ai => {
          const status = tabStatus(ai);
          return (
            <div
              key={ai}
              className={`ai-tab${activeTab === ai ? ' active' : ''}`}
              data-ai={ai}
              onClick={() => setActiveTab(ai)}
            >
              {AI_META[ai].label}
              {status && (
                <span className={`tab-status ${status}`}>
                  {status === 'loading' ? '…' : '✓'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Panels */}
      <div className="response-panels">
        {AIS.map(ai => {
          const { text, sources } = row[ai];
          const isActive = activeTab === ai;
          const isLoading = runState === 'running' && currentAI === ai && !text;

          return (
            <div
              key={ai}
              className={`response-panel${isActive ? ' active' : ''}`}
            >
              <div className="response-content">
                {isLoading ? (
                  <div className="loading-state">
                    <div className="spinner" />
                    <span>Waiting for response…</span>
                  </div>
                ) : text ? (
                  <div
                    className="response-text"
                    dangerouslySetInnerHTML={{ __html: highlightSources(text) }}
                  />
                ) : (
                  <div className="empty-state">
                    Run a prompt to see the {AI_META[ai].label} response here
                  </div>
                )}
              </div>

              {/* Sources strip */}
              <div className="panel-sources">
                <span className="panel-sources-label">📎 Sources in this response:</span>
                {sources && sources.size > 0
                  ? [...sources].map(s => <span key={s} className="badge hit">{s}</span>)
                  : <span className="badge none">—</span>
                }
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
