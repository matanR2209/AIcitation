import { useState } from 'react';
import { useStore, PROMPTS } from '../store';

export default function ActivePrompt() {
  const activeIdx = useStore(s => s.activeIdx);
  const [copied, setCopied] = useState(false);
  const promptText = PROMPTS[activeIdx];

  async function copyPrompt() {
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="prompt-bar">
      <div className="prompt-bar-text">
        <em>Active Prompt</em>
        <span>{promptText}</span>
      </div>
      <button
        className={`copy-btn${copied ? ' copied' : ''}`}
        onClick={copyPrompt}
      >
        {copied ? '✓ Copied' : '📋 Copy'}
      </button>
    </div>
  );
}
