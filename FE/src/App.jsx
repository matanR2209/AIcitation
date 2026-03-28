import Sidebar from './components/Sidebar';
import RunPanel from './components/RunPanel';
import ResponseTabs from './components/ResponseTabs';
import CitationMatrix from './components/CitationMatrix';
import StatusBar from './components/StatusBar';

export default function App() {
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
