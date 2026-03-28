export const KNOWN_SOURCES = [
  { canonical: 'Sports Illustrated', patterns: ['sports illustrated', 'si.com'] },
  { canonical: 'ESPN',               patterns: ['espn.com', 'espn'] },
  { canonical: 'CBS Sports',         patterns: ['cbs sports', 'cbssports.com', 'cbssports'] },
  { canonical: 'Bleacher Report',    patterns: ['bleacher report', 'bleacherreport.com', 'bleacherreport'] },
  { canonical: 'The Athletic',       patterns: ['the athletic', 'theathletic.com'] },
  { canonical: 'Fox Sports',         patterns: ['fox sports', 'foxsports.com'] },
  { canonical: 'Sky Sports',         patterns: ['sky sports', 'skysports.com'] },
  { canonical: 'BBC Sport',          patterns: ['bbc sport', 'bbc.com/sport'] },
  { canonical: 'Goal.com',           patterns: ['goal.com'] },
  { canonical: '247Sports',          patterns: ['247sports.com', '247 sports', '247sports'] },
  { canonical: 'NBA.com',            patterns: ['nba.com'] },
  { canonical: 'NFL.com',            patterns: ['nfl.com'] },
  { canonical: 'MLB.com',            patterns: ['mlb.com'] },
  { canonical: 'Reuters',            patterns: ['reuters.com', 'reuters'] },
  { canonical: 'AP News',            patterns: ['apnews.com', 'associated press', 'ap news'] },
  { canonical: 'Yahoo Sports',       patterns: ['sports.yahoo.com', 'yahoo sports'] },
  { canonical: 'Sporting News',      patterns: ['sportingnews.com', 'sporting news'] },
  { canonical: 'NBC Sports',         patterns: ['nbcsports.com', 'nbc sports'] },
  { canonical: 'FanSided',           patterns: ['fansided.com', 'fansided'] },
  { canonical: '90min',              patterns: ['90min.com', '90min'] },
  { canonical: 'Marca',              patterns: ['marca.com', ' marca'] },
  { canonical: 'Ole.com.ar',         patterns: ['ole.com.ar', 'diario ole'] },
  { canonical: 'AS.com',             patterns: ['as.com', 'diario as'] },
  { canonical: 'ProFootballReference', patterns: ['pro-football-reference', 'pro football reference'] },
  { canonical: 'Basketball Reference', patterns: ['basketball-reference', 'basketball reference'] },
  { canonical: 'UFC.com',            patterns: ['ufc.com', 'ufc'] },
  { canonical: 'NHL.com',            patterns: ['nhl.com'] },
  { canonical: 'Transfermarkt',      patterns: ['transfermarkt'] },
  { canonical: 'WhoScored',          patterns: ['whoscored'] },
  { canonical: 'Stathead',           patterns: ['stathead'] },
  { canonical: "Blazer's Edge",      patterns: ['blazersedge.com', 'blazersedge', "blazer's edge"] },
  { canonical: 'Land of Basketball', patterns: ['landofbasketball.com', 'landofbasketball', 'land of basketball'] },
];

export function detectSources(text) {
  const found = new Set();
  const lower = text.toLowerCase();

  KNOWN_SOURCES.forEach(src => {
    if (src.patterns.some(p => lower.includes(p.toLowerCase()))) {
      found.add(src.canonical);
    }
  });

  // Catch any remaining domain patterns not already covered
  const domainRe = /(?:https?:\/\/)?(?:www\.)?([a-z0-9][a-z0-9\-]{1,60}\.(?:com|org|net|co\.uk|com\.br|com\.ar|io|tv))/g;
  let m;
  while ((m = domainRe.exec(lower)) !== null) {
    const domain = m[1];
    const alreadyCovered = KNOWN_SOURCES.some(src =>
      src.patterns.some(p => p.includes(domain) || domain.includes(p.replace(/https?:\/\/|www\./g, '')))
    );
    if (!alreadyCovered && domain.length > 5) found.add(domain);
  }

  return found;
}

export function highlightSources(text) {
  let out = escapeHtml(text);
  KNOWN_SOURCES.forEach(src => {
    src.patterns.forEach(kw => {
      const re = new RegExp(`(${escapeRe(kw)})`, 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    });
  });
  return out;
}

function escapeHtml(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
