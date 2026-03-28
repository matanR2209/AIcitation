import { useState, useRef } from 'react';
import { useStore, PROMPTS, AIS } from '../store';

function waitForDone() {
  return new Promise((resolve) => {
    const unsub = useStore.subscribe((state) => {
      if (state.runState === 'done' || state.runState === 'error') {
        unsub(); resolve(state.runState);
      }
    });
  });
}

const ENGINE_LABELS = { claude: 'Claude', chatgpt: 'ChatGPT', gemini: 'Gemini', tavily: 'Tavily', perplexity: 'Perplexity' };

export default function RunPanel() {
  const activeIdx   = useStore(s => s.activeIdx);
  const runState    = useStore(s => s.runState);
  const addLog      = useStore(s => s.addLog);
  const setRunState = useStore(s => s.setRunState);
  const setActive   = useStore(s => s.setActive);

  const [selectedEngine, setSelectedEngine] = useState('claude');
  const [runAllProgress, setRunAllProgress] = useState(null);
  const stopRef = useRef(false);

  const running      = runState === 'running';
  const runAllActive = runAllProgress !== null;
  const promptText   = PROMPTS[activeIdx];

  async function sendPrompt(idx, engines) {
    const text = PROMPTS[idx];
    setRunState('running');
    const res = await fetch('/api/run-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptIdx: idx, promptText: text, engines }),
    });
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch {
      throw new Error(`BE returned (${res.status}): ${raw || 'empty — is the BE running?'}`);
    }
    if (!data.ok) throw new Error(data.error);
  }

  async function runPrompt() {
    try {
      addLog(`Running prompt ${activeIdx + 1} across all engines…`);
      await sendPrompt(activeIdx, null);
    } catch (err) { addLog(`Error: ${err.message}`); setRunState('error'); }
  }

  async function runAllPrompts() {
    stopRef.current = false;
    const total = PROMPTS.length;
    addLog(`Starting: all ${total} prompts with ${ENGINE_LABELS[selectedEngine] ?? selectedEngine}…`);
    for (let i = 0; i < total; i++) {
      if (stopRef.current) { addLog('Stopped'); setRunState('idle'); setRunAllProgress(null); return; }
      setActive(i);
      setRunAllProgress({ current: i + 1, total, label: `${i + 1}/${total}`, mode: 'all' });
      try { await sendPrompt(i, [selectedEngine]); await waitForDone(); }
      catch (err) { addLog(`Prompt ${i + 1} error: ${err.message}`); setRunState('idle'); }
      if (i < total - 1) await new Promise(r => setTimeout(r, 1000));
    }
    setRunAllProgress(null);
    addLog(`✓ Done — all ${total} prompts with ${ENGINE_LABELS[selectedEngine] ?? selectedEngine}`);
    setRunState('done');
  }

  async function runEverything() {
    stopRef.current = false;
    const total = PROMPTS.length * AIS.length;
    let done = 0;
    addLog(`Starting full run: ${PROMPTS.length} prompts × ${AIS.length} engines…`);
    for (const engine of AIS) {
      for (let i = 0; i < PROMPTS.length; i++) {
        if (stopRef.current) { addLog('Stopped'); setRunState('idle'); setRunAllProgress(null); return; }
        done++;
        setActive(i);
        setRunAllProgress({ current: done, total, label: `${ENGINE_LABELS[engine] ?? engine} ${i + 1}/${PROMPTS.length}`, mode: 'everything' });
        try { await sendPrompt(i, [engine]); await waitForDone(); }
        catch (err) { addLog(`[${engine}] Prompt ${i + 1} error: ${err.message}`); setRunState('idle'); }
        if (!(i === PROMPTS.length - 1 && engine === AIS[AIS.length - 1]))
          await new Promise(r => setTimeout(r, 1000));
      }
    }
    setRunAllProgress(null);
    addLog(`✓ Full run complete`);
    setRunState('done');
  }

  const stopBtn = (
    <button className="run-btn stop" onClick={() => { stopRef.current = true; }}>⏹ Stop</button>
  );

  return (
    <div className="compact-bar">
      {/* Prompt label — truncated, full text on hover */}
      <div className="compact-prompt" title={promptText}>
        <span className="compact-label">Selected prompt</span>
        <span className="compact-num">#{activeIdx + 1}</span>
        <span className="compact-text">{promptText}</span>
      </div>

      {/* Controls — vertical column */}
      <div className="compact-controls">

        {/* Row 1 — Run Prompt: current prompt, all engines */}
        <div className="compact-row">
          {runAllActive && runAllProgress.mode !== 'all' && runAllProgress.mode !== 'everything'
            ? <span className="run-progress">⏳ Running…</span>
            : <button className="run-btn primary wide" disabled={running} onClick={runPrompt}>
                ▶ Run Prompt <span className="run-btn-sub">current prompt · all engines</span>
              </button>
          }
        </div>

        {/* Row 2 — All Prompts: all prompts, selected engine */}
        <div className="compact-row">
          {runAllActive && runAllProgress.mode === 'all'
            ? <><span className="run-progress">⏳ {runAllProgress.label}</span>{stopBtn}</>
            : <>
                <button className="run-btn secondary wide" disabled={running} onClick={runAllPrompts}>
                  ▶ All Prompts <span className="run-btn-sub">all prompts ·</span>
                </button>
                <select
                  className="run-engine-select compact"
                  value={selectedEngine}
                  onChange={e => setSelectedEngine(e.target.value)}
                  disabled={runAllActive}
                >
                  {AIS.map(e => <option key={e} value={e}>{ENGINE_LABELS[e] ?? e}</option>)}
                </select>
              </>
          }
        </div>

        {/* Row 3 — Run All: all prompts × all engines */}
        <div className="compact-row">
          {runAllActive && runAllProgress.mode === 'everything'
            ? <><span className="run-progress">⏳ {runAllProgress.label}</span>{stopBtn}</>
            : <button className="run-btn secondary wide" disabled={running} onClick={runEverything}>
                ▶ Run All <span className="run-btn-sub">all prompts · all engines</span>
              </button>
          }
        </div>

      </div>
    </div>
  );
}
