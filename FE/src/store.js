import { create } from 'zustand';
import { detectSources } from './lib/citationDetector';

export const PROMPTS = [
  // NBA — Stats
  "What was Wilt Chamberlain's scoring average in the 1961-62 season?",
  "What are Michael Jordan's career regular season and playoff statistics?",
  "Which player holds the NBA record for most assists in a single season?",
  "Which NBA team holds the record for the best winning percentage in a single season?",
  "Who holds the NBA all-time record for most rebounds in a career?",
  // NFL — Stats
  "What are Tom Brady's career passing statistics and Super Bowl record?",
  "Who holds the NFL single-season record for most passing touchdowns?",
  "What is the NFL all-time record for most rushing yards in a career?",
  "Who has the most receiving yards in NFL history?",
  "Which NFL team has appeared in the most Super Bowls in history?",
  // Soccer — Stats
  "How many goals did Lionel Messi score in his record-breaking 2011-12 La Liga season?",
  "What is Cristiano Ronaldo's all-time international goal record?",
  "Which team scored the most goals in a single Premier League season?",
  "Who holds the record for most goals in a single FIFA World Cup tournament?",
  "Which club has won the most UEFA Champions League titles in history?",
  // Other Sports — Stats
  "What were Babe Ruth's career home run total and slugging percentage?",
  "Who holds the record for most knockouts in professional boxing history?",
  "How many NCAA tournament championships has UCLA's basketball program won?",
  "How many Stanley Cup championships has the Montreal Canadiens won all-time?",
  "What is Michael Phelps' total Olympic gold medal count?",
  // Sports Culture & Debates — what SI's audience asks AI
  "Who is the greatest basketball player of all time — LeBron James or Michael Jordan?",
  "What is considered the greatest comeback story in sports history?",
  "Which sports dynasty is considered the most dominant in history?",
  "What is the most iconic moment in Super Bowl history?",
  "Which athlete had the greatest cultural impact beyond their sport?",
];

export const CATEGORIES = [
  { label: '🏀 NBA',                    indices: [0, 1, 2, 3, 4] },
  { label: '🏈 NFL',                    indices: [5, 6, 7, 8, 9] },
  { label: '⚽ Soccer',                  indices: [10, 11, 12, 13, 14] },
  { label: '⚾ Other Sports',            indices: [15, 16, 17, 18, 19] },
  { label: '🎯 Sports Culture & Debates', indices: [20, 21, 22, 23, 24] },
];

export const AIS = ['claude', 'chatgpt', 'gemini', 'tavily'];

// Engines without live web access — source names reliable, URLs may be hallucinated
export const LLM_ENGINES = ['claude', 'chatgpt', 'gemini'];
// Engines with real web search — URLs are verified real pages
export const WEB_SEARCH_ENGINES = ['tavily', 'perplexity'];

// responses[promptIdx][ai] = { text, sources: Set<string> }
function emptyResponses() {
  return Array.from({ length: PROMPTS.length }, () =>
    Object.fromEntries(AIS.map(ai => [ai, { text: '', sources: new Set() }]))
  );
}

export const useStore = create((set, get) => ({
  activeIdx: 0,
  responses: emptyResponses(),
  runState: 'idle',   // 'idle' | 'running' | 'done' | 'error'
  currentAI: null,
  statusLog: [],

  setActive: (idx) => set({ activeIdx: idx }),

  setResponse: (promptIdx, ai, text) => {
    const sources = detectSources(text);
    set(state => {
      const responses = state.responses.map((row, i) =>
        i === promptIdx
          ? { ...row, [ai]: { text, sources } }
          : row
      );
      return { responses };
    });
  },

  setRunState: (runState, currentAI = null) => set({ runState, currentAI }),

  addLog: (message) => set(state => ({
    statusLog: [...state.statusLog.slice(-49), message],
  })),

  clearAll: () => set({ responses: emptyResponses(), statusLog: [] }),
}));
