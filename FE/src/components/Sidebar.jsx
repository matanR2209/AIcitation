import { useStore, PROMPTS, CATEGORIES, AIS } from '../store';

export default function Sidebar() {
  const activeIdx  = useStore(s => s.activeIdx);
  const responses  = useStore(s => s.responses);
  const setActive  = useStore(s => s.setActive);
  const runState   = useStore(s => s.runState);

  function hasData(i) {
    return AIS.some(ai => responses[i][ai].text.length > 0);
  }

  return (
    <div className="prompts-panel">
      <div className="prompts-header">20 Prompts</div>
      {CATEGORIES.map(cat => (
        <div key={cat.label}>
          <div className="category-label">{cat.label}</div>
          {cat.indices.map(i => (
            <div
              key={i}
              className={[
                'prompt-item',
                i === activeIdx ? 'active' : '',
                hasData(i) ? 'has-data' : '',
              ].join(' ')}
              onClick={() => setActive(i)}
            >
              <span className="prompt-num">
                {hasData(i) ? '✓' : (i % 5 + 1)}
              </span>
              <span className="prompt-text">{PROMPTS[i]}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
