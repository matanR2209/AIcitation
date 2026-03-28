import { useStore } from '../store';

export default function StatusBar() {
  const statusLog = useStore(s => s.statusLog);
  const runState  = useStore(s => s.runState);

  const last = statusLog[statusLog.length - 1] ?? 'Ready';

  return (
    <div className={`status-bar status-${runState}`}>
      <span className="status-dot" />
      <span className="status-text">{last}</span>
    </div>
  );
}
