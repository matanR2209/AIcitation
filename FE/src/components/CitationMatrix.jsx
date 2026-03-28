import { useState, useMemo, useEffect } from 'react';
import { useStore, AIS, PROMPTS, LLM_ENGINES, WEB_SEARCH_ENGINES } from '../store';

const AI_LABELS = {
  chatgpt:    '🤖 ChatGPT',
  gemini:     '✦ Gemini',
  claude:     '◆ Claude',
  tavily:     '🔍 Tavily',
  perplexity: '⊕ Perplexity',
};

const HALLUCINATION_MODAL_TEXT = `
LLMs (Claude, ChatGPT, Gemini) do not have live web access.

When asked for sources, they predict which publications would typically cover a topic — based on patterns in their training data, not actual web searches.

This means:
  • Source names (ESPN, NBA.com, etc.) are generally reliable — the AI correctly identifies which publishers cover the topic.
  • Specific URLs may be hallucinated — the AI knows the URL format (e.g. espn.com/nba/story/_/id/...) but invents the article ID.

To verify a claim, search the source name + topic directly on the publisher's site.

Tavily (🔍) is different — it searches the web in real time and returns actual URLs from pages it read.
`.trim();

function HallucinationModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">⚠️ About LLM Source Citations</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <pre className="modal-body">{HALLUCINATION_MODAL_TEXT}</pre>
      </div>
    </div>
  );
}

function exportCSV(responses) {
  const allSources = new Set();
  responses.forEach(row => AIS.forEach(ai => row[ai].sources.forEach(s => allSources.add(s))));
  const sources = [...allSources].sort();
  const header = ['Source', ...AIS, 'Total', 'Coverage (prompts)'].join(',');
  const rows = sources.map(src => {
    const counts = AIS.map(ai => responses.filter(row => row[ai].sources.has(src)).length);
    const total = counts.reduce((a, b) => a + b, 0);
    const coverage = responses.filter(row => AIS.some(ai => row[ai].sources.has(src))).length;
    return [src, ...counts, total, coverage].join(',');
  });
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'citation_matrix.csv'; a.click();
  URL.revokeObjectURL(url);
}

function cellClass(n) {
  if (n === 0) return 'c0';
  if (n === 1) return 'c1';
  if (n === 2) return 'c2';
  return 'c3';
}

function SortIcon({ col, sortConfig }) {
  if (sortConfig.key !== col) return <span className="sort-icon inactive">↕</span>;
  return <span className="sort-icon active">{sortConfig.dir === 'desc' ? '↓' : '↑'}</span>;
}

const PINNED_SOURCES = ['Sports Illustrated'];

// ─── Highlight source name inside response text ───────────────────────────────
function HighlightedText({ text, highlight }) {
  if (!text) return <em className="dd-no-response">No response recorded</em>;
  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase()
          ? <mark key={i} className="dd-highlight">{part}</mark>
          : part
      )}
    </span>
  );
}

// ─── Drilldown modal ──────────────────────────────────────────────────────────
function DrilldownModal({ source, engine, responses, onClose }) {
  // If engine provided → single-engine view. Otherwise → all engines with tabs.
  const engines = engine
    ? [engine]
    : AIS.filter(ai => responses.some(r => r[ai]?.sources.has(source)));

  const [activeTab, setActiveTab] = useState(engines[0] ?? AIS[0]);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const items = responses
    .map((row, idx) => ({ idx, row }))
    .filter(({ row }) => row[activeTab]?.sources.has(source));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="dd-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="dd-header">
          <div className="dd-header-left">
            <span className="dd-source-name">{source}</span>
            {engine && <span className="dd-engine-label">{AI_LABELS[engine] ?? engine}</span>}
            <span className="dd-count-badge">{items.length} citation{items.length !== 1 ? 's' : ''}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Engine tabs — only when viewing all engines */}
        {!engine && engines.length > 0 && (
          <div className="dd-tabs">
            {engines.map(ai => {
              const count = responses.filter(r => r[ai]?.sources.has(source)).length;
              return (
                <button
                  key={ai}
                  className={`dd-tab${activeTab === ai ? ' active' : ''}`}
                  data-ai={ai}
                  onClick={() => setActiveTab(ai)}
                >
                  {AI_LABELS[ai] ?? ai}
                  <span className="dd-tab-count">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Cards */}
        <div className="dd-body">
          {items.length === 0 ? (
            <div className="dd-empty">No responses cited <strong>{source}</strong> for this engine.</div>
          ) : (
            items.map(({ idx, row }) => (
              <div key={idx} className="dd-card">
                <div className="dd-card-header">
                  <span className="dd-card-num">Prompt #{idx + 1}</span>
                  <span className="dd-card-q">{PROMPTS[idx]}</span>
                </div>
                <div className="dd-card-response">
                  <HighlightedText text={row[activeTab]?.text} highlight={source} />
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Reusable table sub-component ────────────────────────────────────────────
function MatrixTable({ visibleSources, counts, llmAIS, searchAIS, sortConfig, toggleSort, responses, totalResponses, setShowHallucinationModal, onDrilldown }) {
  return (
    <table className="matrix">
      <thead>
        <tr className="matrix-group-row">
          <th />
          {llmAIS.length > 0 && (
            <th colSpan={llmAIS.length} className="matrix-group-llm">
              LLM Engines
              <button className="info-icon-btn" title="Why LLM sources may vary" onClick={() => setShowHallucinationModal(true)}>ℹ</button>
            </th>
          )}
          {searchAIS.length > 0 && (
            <th colSpan={searchAIS.length} className="matrix-group-search">Web Search ✓</th>
          )}
          <th />
          <th />
        </tr>
        <tr>
          <th>Source / Publisher</th>
          {llmAIS.map(ai => (
            <th key={ai} className="sortable-th" onClick={() => toggleSort(ai)}>
              {AI_LABELS[ai] ?? ai} <SortIcon col={ai} sortConfig={sortConfig} />
            </th>
          ))}
          {searchAIS.map(ai => (
            <th key={ai} className="sortable-th" onClick={() => toggleSort(ai)}>
              {AI_LABELS[ai] ?? ai} <SortIcon col={ai} sortConfig={sortConfig} />
            </th>
          ))}
          <th className="sortable-th" onClick={() => toggleSort('total')}>
            Total <SortIcon col="total" sortConfig={sortConfig} />
          </th>
          <th>Coverage</th>
        </tr>
      </thead>
      <tbody>
        {visibleSources.map(src => {
          const row      = counts[src];
          const total    = AIS.reduce((s, ai) => s + row[ai], 0);
          const coverage = responses.filter(r => AIS.some(ai => r[ai].sources.has(src))).length;
          const isPinned  = PINNED_SOURCES.includes(src);
          const isUncited = isPinned && total === 0 && totalResponses > 0;
          const hasCitations = total > 0;
          return (
            <tr key={src} className={isUncited ? 'row-uncited' : ''}>
              <td
                className={hasCitations ? 'cell-source-clickable' : ''}
                onClick={hasCitations ? () => onDrilldown(src, null) : undefined}
                title={hasCitations ? `View all ${total} citations for ${src}` : undefined}
              >
                {src}
                {isUncited && <span className="uncited-badge">NOT CITED</span>}
              </td>
              {llmAIS.map(ai => (
                <td
                  key={ai}
                  className={`${cellClass(row[ai])}${row[ai] > 0 ? ' cell-clickable' : ''}`}
                  onClick={row[ai] > 0 ? () => onDrilldown(src, ai) : undefined}
                  title={row[ai] > 0 ? `View ${row[ai]} ${AI_LABELS[ai]} response${row[ai] !== 1 ? 's' : ''} citing ${src}` : undefined}
                >
                  {row[ai] || '·'}
                </td>
              ))}
              {searchAIS.map(ai => (
                <td
                  key={ai}
                  className={`${cellClass(row[ai])}${row[ai] > 0 ? ' cell-clickable' : ''}`}
                  onClick={row[ai] > 0 ? () => onDrilldown(src, ai) : undefined}
                  title={row[ai] > 0 ? `View ${row[ai]} ${AI_LABELS[ai]} response${row[ai] !== 1 ? 's' : ''} citing ${src}` : undefined}
                >
                  {row[ai] || '·'}
                </td>
              ))}
              <td className={cellClass(total)}>{total || (isUncited ? '0' : '·')}</td>
              <td style={{ color: '#64748b' }}>{totalResponses > 0 ? `${coverage}/${PROMPTS.length}` : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function CitationMatrix() {
  const responses     = useStore(s => s.responses);
  const clearAll      = useStore(s => s.clearAll);
  const [showModal,     setShowModal]     = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [drilldown,     setDrilldown]     = useState(null); // { source, engine|null }
  const [sortConfig, setSortConfig]   = useState({ key: 'total', dir: 'desc' });
  const [selectedPublishers, setSelectedPublishers] = useState([]); // [] = show all

  // Close full modal on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') setShowFullModal(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Build aggregate counts
  const counts = useMemo(() => {
    const c = {};
    PINNED_SOURCES.forEach(src => { c[src] = Object.fromEntries(AIS.map(a => [a, 0])); });
    responses.forEach(row => {
      AIS.forEach(ai => {
        row[ai].sources.forEach(src => {
          if (!c[src]) c[src] = Object.fromEntries(AIS.map(a => [a, 0]));
          c[src][ai]++;
        });
      });
    });
    return c;
  }, [responses]);

  const totalResponses = responses.reduce((n, row) => n + AIS.filter(ai => row[ai].text).length, 0);
  const allPublishers  = Object.keys(counts).sort();

  function toggleSort(key) {
    setSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  }

  function togglePublisher(pub) {
    setSelectedPublishers(prev =>
      prev.includes(pub) ? prev.filter(p => p !== pub) : [...prev, pub]
    );
  }

  // Sort sources
  const sortedSources = useMemo(() => {
    return [...allPublishers].sort((a, b) => {
      const isPinnedA = PINNED_SOURCES.includes(a);
      const isPinnedB = PINNED_SOURCES.includes(b);
      const totalA    = AIS.reduce((s, ai) => s + counts[a][ai], 0);
      const totalB    = AIS.reduce((s, ai) => s + counts[b][ai], 0);

      // Pinned + uncited always sink to bottom
      if (isPinnedA && totalA === 0 && totalResponses > 0) return 1;
      if (isPinnedB && totalB === 0 && totalResponses > 0) return -1;

      let valA, valB;
      if (sortConfig.key === 'total') {
        valA = totalA; valB = totalB;
      } else {
        valA = counts[a][sortConfig.key] ?? 0;
        valB = counts[b][sortConfig.key] ?? 0;
      }
      return sortConfig.dir === 'desc' ? valB - valA : valA - valB;
    });
  }, [allPublishers, counts, sortConfig, totalResponses]);

  // Apply filters
  const visibleSources = sortedSources.filter(src =>
    selectedPublishers.length === 0 || selectedPublishers.includes(src)
  );

  const llmAIS    = AIS.filter(ai => LLM_ENGINES.includes(ai));
  const searchAIS = AIS.filter(ai => WEB_SEARCH_ENGINES.includes(ai));

  const tableProps = { visibleSources, counts, llmAIS, searchAIS, sortConfig, toggleSort, responses, totalResponses, setShowHallucinationModal: setShowModal, onDrilldown: (src, eng) => setDrilldown({ source: src, engine: eng }) };

  const filterBar = allPublishers.length > 0 && (
    <div className="matrix-filter-bar">
      <div className="matrix-filter-chips">
        {allPublishers.map(pub => (
          <button
            key={pub}
            className={`filter-chip${selectedPublishers.includes(pub) ? ' selected' : ''}`}
            onClick={() => togglePublisher(pub)}
          >
            {pub}
          </button>
        ))}
        {selectedPublishers.length > 0 && (
          <button className="filter-chip clear-chips" onClick={() => setSelectedPublishers([])}>
            ✕ Clear
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="matrix-section">
      {showModal && <HallucinationModal onClose={() => setShowModal(false)} />}
      {drilldown && (
        <DrilldownModal
          source={drilldown.source}
          engine={drilldown.engine}
          responses={responses}
          onClose={() => setDrilldown(null)}
        />
      )}

      {/* Full-screen modal */}
      {showFullModal && (
        <div className="matrix-full-overlay" onClick={() => setShowFullModal(false)}>
          <div className="matrix-full-box" onClick={e => e.stopPropagation()}>
            <div className="matrix-full-header">
              <span className="matrix-title">📊 Citation Matrix</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="matrix-meta">{totalResponses} responses collected</span>
                <button className="modal-close" onClick={() => setShowFullModal(false)}>✕</button>
              </div>
            </div>
            <div className="matrix-full-body">
              {filterBar}
              {sortedSources.length === 0
                ? <div className="matrix-empty">No sources detected yet — run a prompt to start building the matrix</div>
                : <MatrixTable {...tableProps} />
              }
            </div>
          </div>
        </div>
      )}

      <div className="matrix-header">
        <span className="matrix-title">
          📊 Citation Matrix{' '}
          <span style={{ fontSize: 10, color: '#374151', fontWeight: 400 }}>(auto-built from responses)</span>
        </span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="matrix-meta">{totalResponses} responses collected</span>
          <button className="open-table-btn" onClick={() => setShowFullModal(true)}>⛶ Open Table</button>
          <button className="export-btn" onClick={() => exportCSV(responses)}>⬇ Export CSV</button>
          <button className="clear-btn" onClick={clearAll}>✕ Clear</button>
        </div>
      </div>

      {filterBar}

      <div id="matrix-wrap">
        {sortedSources.length === 0 ? (
          <div className="matrix-empty">No sources detected yet — run a prompt to start building the matrix</div>
        ) : (
          <MatrixTable {...tableProps} />
        )}
      </div>
    </div>
  );
}
