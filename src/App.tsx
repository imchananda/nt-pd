import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLanguage } from './i18n/LanguageContext';
import AchievementPopup, { AchievementFloatingButton } from './components/AchievementPopup';

// Types
interface Task {
  id: string;
  phase: 'pre' | 'airport' | 'show' | 'aftermath' | 'aftermath2';
  platform: 'x' | 'instagram' | 'facebook' | 'tiktok' | 'youtube';
  url: string;
  hashtags: string;
  title: string;
  focus: boolean;
  likes: number;
  comments: number;
  shares: number;
  reposts: number;
  views: number;
  saves: number;
}

interface CompletedState {
  [taskId: string]: {
    completedAt: string;
  };
}

// SVG Icons for social platforms
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

// Platform configs — muted luxury tones
const platformConfig = {
  x: {
    name: 'X',
    icon: <XIcon />,
    color: 'from-slate-700 to-prada-charcoal',
    hoverColor: 'hover:from-slate-600 hover:to-prada-charcoal',
  },
  instagram: {
    name: 'IG',
    icon: <InstagramIcon />,
    color: 'from-rose-400 to-purple-500',
    hoverColor: 'hover:from-rose-300 hover:to-purple-400',
  },
  facebook: {
    name: 'FB',
    icon: <FacebookIcon />,
    color: 'from-blue-500 to-blue-600',
    hoverColor: 'hover:from-blue-400 hover:to-blue-500',
  },
  tiktok: {
    name: 'TT',
    icon: <TikTokIcon />,
    color: 'from-prada-charcoal to-slate-700',
    hoverColor: 'hover:from-slate-700 hover:to-prada-charcoal',
  },
  youtube: {
    name: 'YT',
    icon: <YouTubeIcon />,
    color: 'from-red-600 to-red-700',
    hoverColor: 'hover:from-red-500 hover:to-red-600',
  },
};

// ===========================================
// ⚙️ SETTINGS - แก้ไขตรงนี้
// ===========================================
const SPREADSHEET_ID = '1_MYS-pKcUNguQ4NNcYPU7sXQya9SioubuPFyRxV9_6s';
const SHEETS_CONFIG = [
  { phase: 'pre', label: '22-23 Feb', gid: '1884793749' },
  { phase: 'airport', label: '24-25 Feb', gid: '0' },
  { phase: 'show', label: '26 Feb', gid: '879518091' },
  // aftermath = 2 sheets merged in UI (aftermath2 is internal-only for EMV exclusion)
  { phase: 'aftermath', label: '27 Feb - 9 Mar', gid: '1605499344' },
  { phase: 'aftermath2', label: '27 Feb - 9 Mar', gid: '359554028' },
];
const POSITIVE_MESSAGES_GID = '211253247'; // Sheet for positive messages
// ===========================================

function App() {
  const { language, setLanguage, t } = useLanguage();
  const [allTasks, setAllTasks] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [copiedType, setCopiedType] = useState<'message' | 'hashtags' | 'both' | null>(null);

  // Positive messages state — organized by language
  const [msgPools, setMsgPools] = useState<Record<string, { p1: string[], p2: string[] }>>({
    en: { p1: [], p2: [] },
    th: { p1: [], p2: [] }
  });
  const [emojiPool, setEmojiPool] = useState<string[]>([]);
  const [completed, setCompleted] = useState<Record<string, CompletedState>>(() => {
    try {
      const saved = localStorage.getItem('social-tracker-completed-v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load saved data:', e);
    }
    return {};
  });

  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);
  const [showGlobalStats, setShowGlobalStats] = useState(true);

  // Auto-detect phase based on current date
  const getInitialPhase = () => {
    const today = new Date();
    const month = today.getMonth(); // 0 is Jan, 1 is Feb, 2 is Mar
    const date = today.getDate();

    if (month === 1) { // February
      if (date >= 22 && date <= 23) return 'pre';
      if (date >= 24 && date <= 25) return 'airport';
      if (date === 26) return 'show';
      if (date >= 27 && date <= 28) return 'aftermath'; // Feb 27-28
    } else if (month === 2) { // March
      if (date >= 1 && date <= 9) return 'aftermath';
    }

    return 'all'; // Default fallback if outside range
  };

  // Phase and Stats State
  const [activePhase, setActivePhase] = useState<'all' | 'pre' | 'airport' | 'show' | 'aftermath'>(getInitialPhase());
  const [statsPeriod, setStatsPeriod] = useState<'emv' | 'miv'>('miv');

  const [visibleCount, setVisibleCount] = useState(30);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showPlatformSummaryModal, setShowPlatformSummaryModal] = useState(false);
  // Achievement popup states (Global)
  const [showAchievement, setShowAchievement] = useState(false);
  const [achievementUnlocked, setAchievementUnlocked] = useState(() => {
    try {
      const saved = localStorage.getItem('social-tracker-achievement-unlocked-v3');
      if (saved) return saved === 'true';
    } catch {
      return false;
    }
    return false;
  });

  const [achievementShownOnce, setAchievementShownOnce] = useState(() => {
    try {
      const saved = localStorage.getItem('social-tracker-achievement-shown-v3');
      if (saved) return saved === 'true';
    } catch {
      return false;
    }
    return false;
  });

  const tasks = useMemo(() => {
    if (activePhase === 'all') {
      return SHEETS_CONFIG.map(s => allTasks[s.phase] || []).flat();
    }
    // 'aftermath' tab shows both aftermath sheets combined
    if (activePhase === 'aftermath') {
      return [...(allTasks['aftermath'] || []), ...(allTasks['aftermath2'] || [])];
    }
    return allTasks[activePhase] || [];
  }, [allTasks, activePhase]);

  const isTaskCompleted = useCallback((task?: Task) => {
    if (!task) return false;
    return !!(completed[task.phase] && completed[task.phase][task.id]);
  }, [completed]);

  // Create a flat list of all tasks for global calculations
  const totalTasksList = useMemo(() => Object.values(allTasks).flat(), [allTasks]);
  const totalCompletedCount = useMemo(() => {
    let count = 0;
    Object.entries(completed).forEach(([phase, sheetCompleted]) => {
      const sheetTasks = allTasks[phase] || [];
      sheetTasks.forEach(task => {
        if (sheetCompleted[task.id]) count++;
      });
    });
    return count;
  }, [completed, allTasks]);

  // Calculate platform-specific engagement stats
  const getPlatformStats = useCallback((platform?: string, period: 'emv' | 'miv' = statsPeriod) => {
    // Filter by platform
    let pTasks = platform ? totalTasksList.filter(t => t.platform === platform) : totalTasksList;

    // Filter by period
    // MIV = all sheets; EMV = only airport + show + aftermath (excludes pre & aftermath2)
    if (period === 'emv') {
      pTasks = pTasks.filter(t => t.phase !== 'pre' && t.phase !== 'aftermath2');
    }

    return {
      likes: pTasks.reduce((s, t) => s + t.likes, 0),
      comments: pTasks.reduce((s, t) => s + t.comments, 0),
      shares: pTasks.reduce((s, t) => s + t.shares, 0),
      reposts: pTasks.reduce((s, t) => s + t.reposts, 0),
      views: pTasks.reduce((s, t) => s + (t.views || 0), 0),
      saves: pTasks.reduce((s, t) => s + (t.saves || 0), 0)
    };
  }, [totalTasksList, statsPeriod]);

  // Memoize global stats to prevent recalculation on every render (e.g. during scroll)
  const dashboardStats = useMemo(() => getPlatformStats(), [getPlatformStats]);

  // Memoize platform-specific stats for the modal
  const platformStatsMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof getPlatformStats>> = {};
    if (!showPlatformSummaryModal) return map;
    map['total'] = getPlatformStats();
    map['instagram'] = getPlatformStats('instagram');
    map['tiktok'] = getPlatformStats('tiktok');
    map['x'] = getPlatformStats('x');
    map['facebook'] = getPlatformStats('facebook');
    map['youtube'] = getPlatformStats('youtube');
    return map;
  }, [getPlatformStats, showPlatformSummaryModal]);

  const allTasksStats = useMemo(() => {
    return {
      likes: totalTasksList.reduce((s, t) => s + t.likes, 0),
      comments: totalTasksList.reduce((s, t) => s + t.comments, 0),
      shares: totalTasksList.reduce((s, t) => s + t.shares, 0),
      reposts: totalTasksList.reduce((s, t) => s + t.reposts, 0),
    };
  }, [totalTasksList]);

  // Mark as loaded after first render
  useEffect(() => {
    setHasLoaded(true);
  }, []);

  // Save completed state to localStorage
  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem('social-tracker-completed-v3', JSON.stringify(completed));
  }, [completed, hasLoaded]);

  // Check for 100% global achievement
  useEffect(() => {
    // Only check if we have loaded all sheets defined in config
    const loadedSheetCount = Object.keys(allTasks).length;
    if (!hasLoaded || loading || loadedSheetCount < SHEETS_CONFIG.length || totalTasksList.length === 0) return;

    // Strict logic: Check every task in every sheet specifically
    const allCompleted = SHEETS_CONFIG.every(sheet => {
      const sheetTasks = allTasks[sheet.phase] || [];
      if (sheetTasks.length === 0) return false;
      const sheetCompleted = completed[sheet.phase] || {};
      return sheetTasks.every(task => !!sheetCompleted[task.id]);
    });

    if (allCompleted && !achievementUnlocked) {
      setAchievementUnlocked(true);
      localStorage.setItem('social-tracker-achievement-unlocked-v3', 'true');

      if (!achievementShownOnce) {
        setShowAchievement(true);
        setAchievementShownOnce(true);
        localStorage.setItem('social-tracker-achievement-shown-v3', 'true');
      }
    } else if (!allCompleted && achievementUnlocked) {
      setAchievementUnlocked(false);
      localStorage.setItem('social-tracker-achievement-unlocked-v3', 'false');
    }
  }, [allTasks, totalTasksList, completed, hasLoaded, loading, achievementUnlocked, achievementShownOnce]);

  // Parse entire CSV text handling quoted strings with newlines
  const parseCSV = useCallback((csvText: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote ("") - add single quote to cell
          currentCell += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of cell
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
        // End of row (handle both \n and \r\n)
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
        if (char === '\r') i++; // Skip \n in \r\n
      } else if (char === '\r' && !inQuotes) {
        // Handle standalone \r as newline
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        // Regular character (including newlines inside quotes)
        currentCell += char;
      }
    }

    // Don't forget the last cell and row
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell !== '')) {
      rows.push(currentRow);
    }

    return rows;
  }, []);

  // Fetch data from Google Sheets (Fetch all on mount)
  const fetchAllData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const results: Record<string, Task[]> = {};

      await Promise.all(SHEETS_CONFIG.map(async (sheet) => {
        try {
          const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${sheet.gid}`;
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          let csvText = await response.text();
          csvText = csvText.replace(/^\uFEFF/, '');
          const rows = parseCSV(csvText);

          if (rows.length > 0) {
            const headers = rows[0].map(h => h.toLowerCase().trim());
            const parsedTasks: Task[] = [];
            for (let i = 1; i < rows.length; i++) {
              const values = rows[i];
              const getVal = (headerName: string) => {
                const idx = headers.indexOf(headerName.toLowerCase().trim());
                return idx !== -1 ? (values[idx] || '') : '';
              };
              const focusValue = getVal('focus').toLowerCase().trim();
              const task: Task = {
                id: getVal('id') || getVal('url') || String(i),
                phase: sheet.phase as Task['phase'],
                platform: (getVal('platform') || 'x').toLowerCase().trim() as Task['platform'],
                url: getVal('url') || '',
                hashtags: getVal('hashtags') || '',
                title: getVal('title') || getVal('note') || '',
                focus: focusValue === 'true' || focusValue === '1' || focusValue === 'yes',
                likes: parseInt(getVal('likes')) || 0,
                comments: parseInt(getVal('comments')) || 0,
                shares: parseInt(getVal('shares')) || 0,
                reposts: parseInt(getVal('reposts')) || 0,
                views: parseInt(getVal('view')) || parseInt(getVal('views')) || 0,
                saves: parseInt(getVal('save')) || parseInt(getVal('saves')) || 0,
              };
              if (task.url) parsedTasks.push(task);
            }
            results[sheet.phase] = parsedTasks.reverse();
          }
        } catch (sheetErr) {
          console.error(`Failed to fetch sheet ${sheet.phase}:`, sheetErr);
        }
      }));

      setAllTasks(results);
      setError(null);
      // Save to localStorage for offline support
      try {
        localStorage.setItem('social-tracker-tasks-cache-v3', JSON.stringify(results));
      } catch { /* quota exceeded, ignore */ }
    } catch (err) {
      // Try loading from offline cache
      try {
        const cached = localStorage.getItem('social-tracker-tasks-cache-v3');
        if (cached) {
          setAllTasks(JSON.parse(cached));
          setError(null);
          console.log('Loaded from offline cache');
        } else {
          setError(t('error'));
        }
      } catch {
        setError(t('error'));
      }
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parseCSV]);

  // Fetch positive messages from Google Sheets — parse 3 columns independently
  const fetchPositiveMessages = useCallback(async () => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${POSITIVE_MESSAGES_GID}`;
      const response = await fetch(url);
      let csvText = await response.text();
      csvText = csvText.replace(/^\uFEFF/, '');
      const rows = parseCSV(csvText);

      if (rows.length > 0) {
        const headers = rows[0].map(h => h.toLowerCase().trim());
        const idx1_en = headers.indexOf('message_en_1');
        const idx2_en = headers.indexOf('message_en_2');
        const idx1_th = headers.indexOf('message_th_1');
        const idx2_th = headers.indexOf('message_th_2');
        const idxE = headers.indexOf('emoji');

        const pools = {
          en: { p1: [] as string[], p2: [] as string[] },
          th: { p1: [] as string[], p2: [] as string[] }
        };
        const poolE: string[] = [];

        for (let i = 1; i < rows.length; i++) {
          if (idx1_en !== -1 && rows[i][idx1_en]) pools.en.p1.push(rows[i][idx1_en].trim());
          if (idx2_en !== -1 && rows[i][idx2_en]) pools.en.p2.push(rows[i][idx2_en].trim());
          if (idx1_th !== -1 && rows[i][idx1_th]) pools.th.p1.push(rows[i][idx1_th].trim());
          if (idx2_th !== -1 && rows[i][idx2_th]) pools.th.p2.push(rows[i][idx2_th].trim());
          if (idxE !== -1 && rows[i][idxE]) poolE.push(rows[i][idxE].trim());
        }

        setMsgPools(pools);
        setEmojiPool(poolE);
      }
    } catch (err) {
      console.error('Failed to fetch positive messages:', err);
    }
  }, [parseCSV]);

  useEffect(() => {
    fetchAllData();
    fetchPositiveMessages();
  }, [fetchAllData, fetchPositiveMessages]);

  // Handle automatic scrolling top when Phase changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activePhase]);

  // Filter and sort tasks (Focus first, then by engagement score)
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filterPlatform) {
      result = result.filter(t => t.platform === filterPlatform);
    }
    const pending = result.filter(t => !isTaskCompleted(t));
    const done = result.filter(t => isTaskCompleted(t));
    // Sort: Focus posts first, then by engagement score (high to low)
    const engagementScore = (t: Task) => t.likes + t.comments + t.shares + t.reposts;
    const sortTasks = (a: Task, b: Task) => {
      if (a.focus !== b.focus) return b.focus ? 1 : -1;
      return engagementScore(b) - engagementScore(a);
    };
    const sortedPending = [...pending].sort(sortTasks);
    const sortedDone = [...done].sort(sortTasks);
    return [...sortedPending, ...sortedDone];
  }, [tasks, isTaskCompleted, filterPlatform]);

  // Lazy load
  const visibleTasks = useMemo(() => {
    return filteredTasks.slice(0, visibleCount);
  }, [filteredTasks, visibleCount]);

  const pendingCount = tasks.filter(t => !isTaskCompleted(t)).length;
  const completedCount = tasks.filter(t => isTaskCompleted(t)).length;



  // Get hashtags for platform
  const getCaption = (task: Task): string => {
    return task.hashtags || '';
  };

  // Generate random positive message — 2-step: pick from each pool, then pick 1 of 4 patterns
  const generateRandomMessage = useCallback(() => {
    const activePool = msgPools[language] || msgPools.en;
    if (activePool.p1.length === 0 || activePool.p2.length === 0 || emojiPool.length === 0) return;
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const m1 = pick(activePool.p1);
    const m2 = pick(activePool.p2);
    const em = pick(emojiPool);
    const pattern = Math.floor(Math.random() * 6);
    let sentence = '';
    if (pattern === 0) sentence = `${m1} ${m2} ${em}`;
    else if (pattern === 1) sentence = `${m2} ${m1} ${em}`;
    else if (pattern === 2) sentence = `${m2} ${em} ${m1}`;
    else if (pattern === 3) sentence = `${m1} ${em} ${m2}`;
    else if (pattern === 4) sentence = `${em} ${m1} ${m2}`;
    else sentence = `${em} ${m2} ${m1}`;
    setGeneratedMessage(sentence);
    setCopiedType(null);
  }, [msgPools, emojiPool, language]);

  // Copy functions for 3 different options
  const handleCopyMessage = async () => {
    if (!generatedMessage) return;
    try {
      await navigator.clipboard.writeText(generatedMessage);
      setCopiedType('message');
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleCopyHashtags = async (task: Task) => {
    const text = getCaption(task);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType('hashtags');
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleCopyBoth = async (task: Task) => {
    const hashtags = getCaption(task);
    const text = generatedMessage
      ? `${generatedMessage}\n\n${hashtags}`
      : hashtags;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType('both');
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Open the actual post URL
  const handleGoToPost = (task: Task) => {
    window.open(task.url, '_blank');
  };

  // Mark task as complete
  const handleMarkComplete = (task: Task) => {
    setCompleted(prev => ({
      ...prev,
      [task.phase]: {
        ...(prev[task.phase] || {}),
        [task.id]: { completedAt: new Date().toISOString() },
      },
    }));
    setSelectedTask(null);
  };

  // Unmark task
  const handleUnmarkComplete = (task: Task) => {
    setCompleted(prev => {
      const next = { ...prev };
      if (next[task.phase]) {
        const nextPhase = { ...next[task.phase] };
        delete nextPhase[task.id];
        next[task.phase] = nextPhase;
      }
      return next;
    });
    setSelectedTask(null);
  };

  // Quick complete without modal
  const handleQuickComplete = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    handleMarkComplete(task);
  };

  // Load more on scroll
  const scrollTimeoutRef = useRef<number | null>(null);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (scrollTimeoutRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 400) {
      setVisibleCount(prev => Math.min(prev + 30, filteredTasks.length));
      scrollTimeoutRef.current = window.setTimeout(() => {
        scrollTimeoutRef.current = null;
      }, 100);
    }
  }, [filteredTasks.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-prada-offwhite flex items-center justify-center relative overflow-hidden">
        {/* Subtle background decorative element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-prada-cream opacity-20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 text-center flex flex-col items-center">
          <div className="w-32 h-40 mb-6 relative group animate-in fade-in zoom-in duration-700">
            <div className="absolute inset-0 bg-white/30 rounded-2xl blur-xl group-hover:bg-white/40 transition-all duration-500 animate-pulse"></div>
            <img
              src="/nt.png"
              alt="Namtan Tipnaree"
              className="w-full h-full object-contain relative z-10 drop-shadow-2xl animate-bounce [animation-duration:3s]"
            />
          </div>

          <div className="relative">
            <div className="w-10 h-1 border-t-2 border-prada-warm/40 mx-auto mb-4 scale-x-150 rounded-full animate-pulse"></div>
            <p className="text-prada-charcoal font-bold text-lg tracking-[0.2em] uppercase animate-pulse">
              {t('loading')}
            </p>
            <div className="w-10 h-1 border-b-2 border-prada-warm/40 mx-auto mt-4 scale-x-150 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col relative bg-prada-offwhite overflow-hidden">
      {/* Subtle paper texture overlay */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23000000' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E")`
      }} />

      {/* Left-aligned background image */}
      {/* <div className="fixed bottom-0 left-0 z-0 pointer-events-none w-[45vw] sm:w-[35vw] max-w-[400px] opacity-15 sm:opacity-25 transition-opacity">
        <img src="/nt-2.png" alt="" className="w-full h-auto object-contain object-left-bottom" />
      </div> */}

      {/* Header Container (Fixed at top) */}
      <div className="relative z-40 flex-shrink-0 bg-prada-offwhite">
        {/* Header */}
        <header className="backdrop-blur-xl bg-prada-offwhite/95 border-b border-prada-warm/50 shadow-sm">
          <div className="max-w-lg mx-auto px-4 pt-3 pb-0">
            {/* Hero: Image + Title */}
            <div className="flex items-center gap-3 mb-0">
              <div className="w-16 h-20 sm:w-20 sm:h-24 flex-shrink-0">
                <img
                  src="/nt.png"
                  alt="Namtan Tipnaree"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl sm:text-2xl font-bold text-prada-charcoal tracking-wide leading-snug">
                    {t('appTitle')}
                  </h1>

                  {/* Language Buttons */}
                  <div className="flex flex-shrink-0 rounded-full overflow-hidden border border-prada-warm ml-2">
                    <button
                      onClick={() => setLanguage('th')}
                      className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold transition-all ${language === 'th'
                        ? 'bg-prada-charcoal text-prada-offwhite'
                        : 'bg-prada-cream/50 text-prada-charcoal/40 hover:bg-prada-cream'
                        }`}
                    >
                      TH
                    </button>
                    <button
                      onClick={() => setLanguage('en')}
                      className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold transition-all ${language === 'en'
                        ? 'bg-prada-charcoal text-prada-offwhite'
                        : 'bg-prada-cream/50 text-prada-charcoal/40 hover:bg-prada-cream'
                        }`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                <div className="mt-1">
                  <span className="text-base font-display font-bold uppercase tracking-wider text-prada-charcoal/90">
                    Namtan Tipnaree
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation & Timeline Area */}
          <div className="bg-white/40 backdrop-blur-md">
            {/* Phase Filters - Compact & Meaningful */}
            <div className="w-full max-w-lg mx-auto px-2 pt-1 pb-2 grid grid-cols-5 gap-1.5">
              {[
                { id: 'all', icon: '✦', label: t('allLabel'), desc: t('sixteenDaysShort'), days: [] },
                { id: 'pre', icon: '🗓️', label: t('preLabel'), desc: t('phasePreShort'), days: ['22 Feb', '23 Feb'] },
                { id: 'airport', icon: '✈️', label: t('airportLabel'), desc: t('phaseAirportShort'), days: ['24 Feb', '25 Feb'] },
                { id: 'show', icon: '✨', label: t('showLabel'), desc: t('phaseShowShort'), days: ['26 Feb'] },
                { id: 'aftermath', icon: '📸', label: t('aftermathLabel'), desc: t('phaseAftermathShort'), days: ['27 Feb', '28 Feb', '1 Mar', '2 Mar', '3 Mar', '4 Mar', '5 Mar', '6 Mar', '7 Mar', '8 Mar', '9 Mar'] },
              ].map(phase => {
                const isActive = activePhase === phase.id;
                return (
                  <button
                    key={phase.id}
                    onClick={() => {
                      setActivePhase(phase.id as any);
                      setVisibleCount(30);
                    }}
                    className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg border transition-all ${isActive
                      ? 'bg-prada-charcoal text-prada-offwhite border-prada-charcoal shadow-sm scale-105 z-10'
                      : 'bg-white/60 text-prada-charcoal/70 border-prada-warm/40 hover:bg-prada-cream/80'
                      }`}
                  >
                    <div className="text-[12px] sm:text-[14px] leading-none mb-1">{phase.icon}</div>
                    <div className="text-[9px] sm:text-[10px] font-bold leading-none mb-0.5 whitespace-nowrap">{phase.label}</div>
                    <div className={`text-[7px] sm:text-[8px] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis w-full px-0.5 text-center ${isActive ? 'text-prada-cream/80' : 'text-prada-taupe'}`}>{phase.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Filter chips + Refresh + Hide */}
          <div className="max-w-lg mx-auto px-4">
            <div className="flex justify-center gap-2 items-center pt-1 pb-2">
              <button
                onClick={() => setFilterPlatform(null)}
                className={`w-[34px] h-[34px] sm:w-9 sm:h-9 rounded-full flex-shrink-0 text-[9.5px] sm:text-[10.5px] font-bold border transition-transform flex items-center justify-center shadow-sm ${!filterPlatform
                  ? 'bg-prada-charcoal border-transparent text-prada-offwhite scale-110'
                  : 'bg-white/80 border-prada-warm/50 text-prada-charcoal/70 hover:bg-prada-cream/80 hover:scale-105'
                  }`}
              >
                {t('allLabel')}
              </button>

              <div className="flex gap-1.5 items-center">
                {(['instagram', 'tiktok', 'x', 'facebook', 'youtube'] as const).map(p => {
                  const isActive = filterPlatform === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setFilterPlatform(isActive ? null : p)}
                      className={`w-[34px] h-[34px] sm:w-9 sm:h-9 rounded-full flex-shrink-0 text-sm font-medium border transition-transform flex items-center justify-center shadow-sm ${isActive
                        ? `bg-gradient-to-br ${platformConfig[p].color} border-transparent text-white scale-110`
                        : 'bg-white/80 border-prada-warm/50 text-prada-charcoal/60 hover:bg-prada-cream/80 hover:scale-105'
                        }`}
                    >
                      {platformConfig[p].icon}
                    </button>
                  );
                })}

                {!showGlobalStats && (
                  <button
                    onClick={() => setShowGlobalStats(true)}
                    className="ml-auto px-3.5 h-8 rounded-full flex items-center gap-2 bg-prada-charcoal text-white shadow-lg shadow-black/10 transition-all hover:scale-105 active:scale-95 group animate-in fade-in slide-in-from-right-4"
                  >
                    <span className="text-[10px] animate-pulse">✦</span>
                    <span className="text-[8.5px] font-bold uppercase tracking-wider">{t('tapToExpand')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Scrollable Middle Area */}
      <main
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-lg mx-auto flex flex-col gap-1 px-3 pt-4 pb-2">

          {/* Mission Impact Stats Card */}
          {totalTasksList.length > 0 && !loading && !error && showGlobalStats && (
            <div className="mb-1 animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] p-4 sm:p-5 mx-0 border border-prada-warm/30 shadow-2xl shadow-black/5 relative overflow-hidden group">
                {/* Decorative background - white hazy glow */}
                <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-white/50 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-32 h-32 bg-white/30 rounded-full blur-2xl pointer-events-none"></div>

                {/* Header area */}
                <div className="flex items-start justify-between relative z-10 mb-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-prada-warm/25 flex items-center justify-center text-prada-charcoal border border-prada-warm/40 shadow-sm">
                        <span className="text-base">✨</span>
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-prada-charcoal tracking-tight leading-none">
                          {t('globalStats')}
                        </h2>
                        <p className="text-[8px] font-bold text-prada-charcoal/60 tracking-widest uppercase mt-1">
                          {t('sixteenDays')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => setShowGlobalStats(false)}
                      className="w-7 h-7 rounded-lg bg-prada-warm/25 text-prada-charcoal border border-prada-warm/40 shadow-sm hover:bg-prada-warm/40 active:scale-95 flex items-center justify-center"
                      title={t('minimize')}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    <span className="text-[6.5px] font-bold text-prada-charcoal/50 uppercase tracking-[0.1em] animate-pulse text-center leading-tight">
                      {t('tapToHide')}
                    </span>
                  </div>
                </div>

                {/* Main Content Area - mobile: stack vertically; sm+: rail left, stats right */}
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-stretch">
                    {/* Mode Toggle: horizontal on mobile, vertical rail on sm+ */}
                    <div className="flex flex-row sm:flex-col gap-2 sm:w-[96px] flex-shrink-0">
                      <button
                        onClick={() => setStatsPeriod('miv')}
                        className={`flex-1 sm:flex-none sm:h-12 rounded-full px-3 py-2.5 sm:px-3.5 sm:py-0 flex flex-col items-center justify-center text-[10px] font-bold tracking-[0.14em] uppercase min-w-0 ${statsPeriod === 'miv'
                          ? 'bg-prada-charcoal text-white shadow-md shadow-black/15'
                          : 'bg-white/80 text-prada-charcoal/70 border border-prada-warm/30'
                          }`}
                      >
                        <span className="text-[11px] sm:text-[13px] font-bold leading-none">MIV</span>
                        <span className="text-[6.5px] sm:text-[7.5px] font-medium mt-0.5 tracking-[0.12em] whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                          22 FEB - 9 MAR
                        </span>
                      </button>
                      <button
                        onClick={() => setStatsPeriod('emv')}
                        className={`flex-1 sm:flex-none sm:h-12 rounded-full px-3 py-2.5 sm:px-3.5 sm:py-0 flex flex-col items-center justify-center text-[10px] font-bold tracking-[0.14em] uppercase min-w-0 ${statsPeriod === 'emv'
                          ? 'bg-prada-charcoal text-white shadow-md shadow-black/15'
                          : 'bg-white/80 text-prada-charcoal/70 border border-prada-warm/30'
                          }`}
                      >
                        <span className="text-[11px] sm:text-[13px] font-bold leading-none">EMV</span>
                        <span className="text-[6.5px] sm:text-[7.5px] font-medium mt-0.5 tracking-[0.12em] whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                          24 FEB - 2 MAR
                        </span>
                      </button>
                    </div>

                    {(() => {
                      const statCards = [
                        { labelLines: [t('commentsLabel'), t('replies')], value: dashboardStats.comments, icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /> },
                        { labelLines: [t('sharesLabel'), t('quotesWord'), t('reposts')], value: dashboardStats.shares + dashboardStats.reposts, icon: <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" /> },
                        { labelLines: [t('savesLabel')], value: dashboardStats.saves, icon: <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" /> },
                        { labelLines: [t('viewsLabel')], value: dashboardStats.views, icon: <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /> },
                      ];
                      return (
                        <div className="flex-1 min-w-0 space-y-3">
                          {/* Top card: icon left, number + label right */}
                          <div className="bg-white rounded-[1.25rem] py-4 px-4 sm:px-5 border border-prada-warm/25 shadow-md shadow-black/5 flex items-center justify-between gap-3 min-h-[4rem]">
                            <div className="text-prada-charcoal flex-shrink-0">
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 sm:w-8 sm:h-8"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                            </div>
                            <div className="flex flex-col items-end text-right min-w-0">
                              <span className="text-2xl sm:text-3xl font-bold text-prada-charcoal tabular-nums leading-none">
                                {dashboardStats.likes.toLocaleString()}
                              </span>
                              <span className="text-xs font-medium text-prada-charcoal/60 mt-0.5">
                                {t('totalLikesLabel')}
                              </span>
                            </div>
                          </div>

                          {/* 2x2 grid: icon left, number + label right */}
                          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 min-w-0">
                            {statCards.map((item, idx) => (
                              <div
                                key={idx}
                                className="bg-white rounded-[1.15rem] py-3.5 px-3.5 sm:px-4 border border-prada-warm/25 shadow-md shadow-black/5 flex items-center justify-between gap-2 min-w-0 min-h-[4rem]"
                              >
                                <div className="text-prada-charcoal flex-shrink-0">
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">{item.icon}</svg>
                                </div>
                                <div className="flex flex-col items-end text-right min-w-0">
                                  <span className="text-lg sm:text-xl font-bold text-prada-charcoal tabular-nums leading-none">
                                    {item.value.toLocaleString()}
                                  </span>
                                  <p className="text-[11px] sm:text-xs font-medium text-prada-charcoal/60 leading-tight line-clamp-2 mt-0.5">
                                    {item.labelLines.join(' ')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="h-1" />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 my-2">
              {t('error')}
            </div>
          )}

          {visibleTasks.map((task, index) => {
            const config = platformConfig[task.platform];
            return (
              <div key={`${task.id}-${index}`}>
                {(index === 0 || isTaskCompleted(task) !== isTaskCompleted(visibleTasks[index - 1])) && (
                  <div className="flex items-center gap-3 mb-2 mt-6 first:mt-2">
                    <h3 className="text-sm font-bold text-prada-charcoal uppercase tracking-widest pl-2">
                      {isTaskCompleted(task) ? t('done') : t('pending')}
                    </h3>
                    <div className="flex-1 h-px bg-prada-warm/50" />
                  </div>
                )}

                <div
                  onClick={() => setSelectedTask(task)}
                  className={`flex items-center gap-2 bg-prada-offwhite rounded-2xl py-2.5 px-3 mb-1.5 border cursor-pointer hover:shadow-md transition-all group animate-in fade-in slide-in-from-bottom-4 duration-300 ${isTaskCompleted(task)
                    ? 'border-prada-warm/50 opacity-60 grayscale-[0.3]'
                    : task.focus
                      ? 'border-prada-warm bg-prada-warm/10 shadow-sm relative overflow-hidden'
                      : 'border-prada-warm/50'
                    }`}
                  style={{ animationDelay: `${(index % 10) * 50}ms` }}
                >
                  {/* Platform badge */}
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-sm flex-shrink-0 shadow-sm text-white`}>
                    {isTaskCompleted(task) ? '✓' : config.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-prada-charcoal/90 truncate">
                        {task.title || t('noTitle')}
                      </span>
                      {task.focus && !isTaskCompleted(task) && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-prada-gold to-prada-darkgold text-white rounded-full flex-shrink-0 animate-pulse">
                          {t('focusBadge')}
                        </span>
                      )}
                    </div>
                    {/* Engagement Metrics */}
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.likes > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-prada-taupe">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-[11px] h-[11px]"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                          {task.likes}
                        </span>
                      )}
                      {task.comments > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-prada-taupe">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-[11px] h-[11px]"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                          {task.comments}
                        </span>
                      )}
                      {task.shares > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-prada-taupe">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-[11px] h-[11px]"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" /></svg>
                          {task.shares}
                        </span>
                      )}
                      {task.reposts > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-prada-taupe">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-[11px] h-[11px]"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>
                          {task.reposts}
                        </span>
                      )}
                      {task.likes === 0 && task.comments === 0 && task.shares === 0 && task.reposts === 0 && (
                        <span className="text-[10px] text-prada-taupe/40">—</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {isTaskCompleted(task) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnmarkComplete(task);
                      }}
                      className="text-prada-taupe/50 text-[11px] hover:text-prada-charcoal/60 px-2 py-1"
                    >
                      ↩
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleQuickComplete(task, e)}
                      className="bg-prada-warm/30 border border-prada-warm/50 text-prada-charcoal text-xs px-2 py-1 rounded-md font-semibold hover:bg-prada-warm/50 transition-colors"
                    >
                      ✓
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Load more indicator */}
          {visibleCount < filteredTasks.length && (
            <div className="text-center py-4 text-prada-taupe text-xs">
              {t('scrollToLoad')} ({visibleCount}/{filteredTasks.length})
            </div>
          )}

          {tasks.length === 0 && !error && !loading && (
            <div className="text-center py-12 text-prada-taupe">
              <p className="text-4xl mb-4">📭</p>
              <p>{t('noTasks')}</p>
            </div>
          )}

          {filteredTasks.length === 0 && tasks.length > 0 && (
            <div className="text-center py-12 text-prada-taupe animate-in fade-in zoom-in duration-700">
              <p className="text-4xl mb-4 grayscale opacity-40">🎉</p>
              <p className="font-bold tracking-widest uppercase text-xs opacity-60">{t('allDone')}</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Bar Container (Fixed at bottom) */}
      <footer className="relative z-40 flex-shrink-0 bg-prada-offwhite pt-2 pb-2 border-t border-prada-warm/30 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <div className="max-w-lg mx-auto relative px-4">
          {/* Stats Bar */}
          <div className="bg-prada-charcoal/95 backdrop-blur-xl rounded-full px-5 py-2.5 flex items-center justify-between shadow-xl border border-prada-charcoal/50">
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                onClick={() => setShowPlatformSummaryModal(true)}
                className="flex items-center gap-1.5 pr-1 hover:opacity-70 transition-opacity"
              >
                <span className="text-[12px] font-bold text-white whitespace-nowrap">✦ {t('summary')}</span>
              </button>

              <div className="w-px h-6 bg-white/10" />

              <div className="flex flex-col items-center min-w-[45px]">
                <div className="text-[11px] font-bold text-prada-cream flex items-baseline leading-none mb-0.5 whitespace-nowrap">
                  {pendingCount} <span className="text-[9px] font-normal opacity-60 ml-1">/ {totalTasksList.length}</span>
                </div>
                <div className="text-[7.5px] text-prada-cream/60 uppercase tracking-widest whitespace-nowrap leading-none">{t('pending')}</div>
              </div>

              <div className="w-px h-6 bg-white/10" />

              <div className="flex flex-col items-center min-w-[45px]">
                <div className="text-[13px] font-bold text-white shadow-sm leading-none mb-0.5">
                  {completedCount}
                </div>
                <div className="text-[7.5px] text-prada-cream/80 uppercase tracking-widest whitespace-nowrap leading-none">{t('done')}</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center min-w-[40px]">
                <div className="text-[13px] font-bold text-white leading-none mb-0.5">
                  {totalTasksList.length ? Math.round((totalCompletedCount / totalTasksList.length) * 100) : 0}%
                </div>
                <div className="text-[7.5px] text-prada-cream/60 uppercase tracking-widest leading-none">{t('totalLabel')}</div>
              </div>

              <div className="w-px h-6 bg-white/10" />

              {/* Refresh Button */}
              <button
                onClick={() => fetchAllData(true)}
                disabled={refreshing}
                className={`p-1.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-all ${refreshing ? 'animate-spin opacity-50' : ''}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5 text-white">
                  <path d="M4 4v5h5M20 20v-5h-5M20 9A9 9 0 0 0 5.64 5.64L4 9M4 15a9 9 0 0 0 14.36 3.36L20 15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Stats Bottom Sheet Modal */}
      {
        showStatsModal && (
          <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
            onClick={() => setShowStatsModal(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-prada-charcoal/40 backdrop-blur-sm animate-in fade-in duration-200"></div>

            {/* Modal Content */}
            <div
              className="relative w-full max-w-md bg-prada-offwhite/98 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl border border-prada-warm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 pb-safe"
              onClick={e => e.stopPropagation()}
            >
              {/* Handle bar (mobile) */}
              <div className="w-12 h-1.5 bg-prada-warm rounded-full mx-auto mt-3 mb-2 sm:hidden" />

              {/* Header */}
              <div className="px-5 pt-3 pb-4 flex items-center justify-between border-b border-prada-warm/50">
                <h3 className="text-lg font-display font-bold text-prada-charcoal flex items-center gap-2">
                  <span className="text-prada-gold font-serif">✦</span> {t('missionImpact')}
                </h3>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="w-8 h-8 rounded-full bg-prada-cream hover:bg-prada-stone flex items-center justify-center text-prada-charcoal/60 hover:text-prada-charcoal transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Stats Content */}
              <div className="p-5">
                <div className="flex flex-col gap-4">
                  <div className="bg-prada-cream/50 rounded-2xl p-4 border border-prada-warm flex items-center justify-between">
                    <span className="text-sm font-medium text-prada-charcoal/80 uppercase tracking-wider">{t('completedTasks')}</span>
                    <span className="text-lg font-bold text-prada-charcoal">
                      {totalCompletedCount} <span className="text-sm font-normal text-prada-taupe">/ {totalTasksList.length}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl p-4 border border-prada-warm shadow-sm flex flex-col items-center justify-center gap-1">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-rose-400"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                      <span className="text-[10px] text-prada-taupe font-bold uppercase tracking-wider mt-1">{t('likes')}</span>
                      <span className="text-xl font-display font-bold text-prada-charcoal mt-0.5">
                        {allTasksStats.likes.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-prada-warm shadow-sm flex flex-col items-center justify-center gap-1">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-400"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                      <span className="text-[10px] text-prada-taupe font-bold uppercase tracking-wider mt-1">{t('comments')}</span>
                      <span className="text-xl font-display font-bold text-prada-charcoal mt-0.5">
                        {allTasksStats.comments.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-prada-warm shadow-sm flex flex-col items-center justify-center gap-1">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-prada-charcoal/70"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" /></svg>
                      <span className="text-[10px] text-prada-taupe font-bold uppercase tracking-wider mt-1">{t('shares')}</span>
                      <span className="text-xl font-display font-bold text-prada-charcoal mt-0.5">
                        {allTasksStats.shares.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-prada-warm shadow-sm flex flex-col items-center justify-center gap-1">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-purple-400"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>
                      <span className="text-[10px] text-prada-taupe font-bold uppercase tracking-wider mt-1">{t('reposts')}</span>
                      <span className="text-xl font-display font-bold text-prada-charcoal mt-0.5">
                        {allTasksStats.reposts.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )
      }

      {/* Platform Summary Modal */}
      {
        showPlatformSummaryModal && (
          <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
            onClick={() => setShowPlatformSummaryModal(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-prada-charcoal/40 backdrop-blur-sm animate-in fade-in duration-200"></div>

            {/* Modal Content */}
            <div
              className="relative w-full max-w-md bg-prada-offwhite/98 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl border border-prada-warm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 pb-safe"
              onClick={e => e.stopPropagation()}
            >
              {/* Handle bar (mobile) */}
              <div className="w-12 h-1.5 bg-prada-warm rounded-full mx-auto mt-3 mb-2 sm:hidden" />

              {/* Header */}
              <div className="px-5 pt-3.5 pb-4 flex items-center justify-between bg-prada-charcoal shrink-0 shadow-md">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-white font-serif">✦</span> {t('summary')}
                </h3>
                <button
                  onClick={() => setShowPlatformSummaryModal(false)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors border border-white/20"
                >
                  ✕
                </button>
              </div>

              {/* Stats Content */}
              <div className="p-5 overflow-y-auto max-h-[70vh] sm:max-h-[80vh]">
                <div className="flex flex-col gap-4">

                  {/* Grand Total Overview */}
                  {(() => {
                    const totalAll = platformStatsMap['total'] || dashboardStats;
                    return (
                      <div className="bg-gradient-to-br from-white to-prada-cream/30 backdrop-blur-xl rounded-[2rem] p-4 sm:p-5 shadow-xl shadow-black/5 border border-prada-warm/20 relative overflow-hidden mb-1">
                        {/* Decorative subtle element */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/40 rounded-full blur-2xl"></div>

                        <div className="relative z-10 flex flex-col gap-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-prada-charcoal font-serif text-lg">✦</span>
                            <h4 className="text-prada-charcoal font-bold text-[15px] tracking-wide">{t('totalStats')}</h4>
                          </div>

                          {/* Highlighted Likes */}
                          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-prada-warm/20 flex items-center justify-between shadow-sm">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-1">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-prada-charcoal"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                                <span className="text-prada-charcoal font-bold text-base uppercase tracking-wider">{t('totalLikesLabel')}</span>
                              </div>
                              <span className="text-prada-taupe/60 text-[10px] sm:text-[11px] font-medium leading-tight">{t('totalLikesDesc')}</span>
                            </div>
                            <span className="text-xl sm:text-2xl font-bold text-prada-charcoal tracking-tight truncate max-w-[50%]" title={totalAll.likes.toLocaleString()}>{totalAll.likes.toLocaleString()}</span>
                          </div>

                          {/* Other Stats Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Comments */}
                            <div className="bg-white/80 backdrop-blur-md rounded-xl p-3 border border-prada-warm/30 flex flex-col hover:border-prada-warm/50 transition-colors shadow-sm">
                              <div className="flex items-center justify-between mb-1.5 gap-2">
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-prada-charcoal font-bold text-xs uppercase tracking-wider">{t('commentsLabel')}</span>
                                </div>
                                <span className="text-[13px] font-bold text-prada-charcoal truncate" title={totalAll.comments.toLocaleString()}>{totalAll.comments.toLocaleString()}</span>
                              </div>
                              <span className="text-prada-taupe/40 text-[9.5px] font-medium leading-tight line-clamp-1">{t('commentsDesc')}</span>
                            </div>

                            {/* Shares & Reposts */}
                            <div className="bg-white/80 backdrop-blur-md rounded-xl p-3 border border-prada-warm/30 flex flex-col hover:border-prada-warm/50 transition-colors shadow-sm">
                              <div className="flex items-center justify-between mb-1.5 gap-2">
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-prada-charcoal font-bold text-xs uppercase tracking-wider">{t('sharesLabel')}</span>
                                </div>
                                <span className="text-[13px] font-bold text-prada-charcoal truncate" title={(totalAll.shares + totalAll.reposts).toLocaleString()}>{(totalAll.shares + totalAll.reposts).toLocaleString()}</span>
                              </div>
                              <span className="text-prada-taupe/40 text-[9.5px] font-medium leading-tight line-clamp-1">{t('sharesDesc')}</span>
                            </div>

                            {/* Saves */}
                            <div className="bg-white/80 backdrop-blur-md rounded-xl p-3 border border-prada-warm/30 flex flex-col hover:border-prada-warm/50 transition-colors shadow-sm">
                              <div className="flex items-center justify-between mb-1.5 gap-2">
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-prada-charcoal font-bold text-xs uppercase tracking-wider">{t('savesLabel')}</span>
                                </div>
                                <span className="text-[13px] font-bold text-prada-charcoal truncate" title={totalAll.saves.toLocaleString()}>{totalAll.saves.toLocaleString()}</span>
                              </div>
                              <span className="text-prada-taupe/40 text-[9.5px] font-medium leading-tight line-clamp-1">{t('savesDesc')}</span>
                            </div>

                            {/* Views */}
                            <div className="bg-white/80 backdrop-blur-md rounded-xl p-3 border border-prada-warm/30 flex flex-col hover:border-prada-warm/50 transition-colors shadow-sm">
                              <div className="flex items-center justify-between mb-1.5 gap-2">
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-prada-charcoal font-bold text-xs uppercase tracking-wider">{t('viewsLabel')}</span>
                                </div>
                                <span className="text-[13px] font-bold text-prada-charcoal truncate" title={totalAll.views.toLocaleString()}>{totalAll.views.toLocaleString()}</span>
                              </div>
                              <span className="text-prada-taupe/40 text-[9.5px] font-medium leading-tight line-clamp-1">{t('viewsDesc')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {[
                    { id: 'instagram', label: t('igLabel'), icon: <InstagramIcon />, color: 'from-rose-400 to-purple-500' },
                    { id: 'tiktok', label: t('ttLabel'), icon: <TikTokIcon />, color: 'from-prada-charcoal to-prada-black' },
                    { id: 'x', label: t('xLabel'), icon: <XIcon />, color: 'from-slate-700 to-slate-900' },
                    { id: 'facebook', label: t('fbLabel'), icon: <FacebookIcon />, color: 'from-blue-500 to-blue-700' },
                    { id: 'youtube', label: t('ytLabel'), icon: <YouTubeIcon />, color: 'from-red-500 to-red-700' },
                  ].map(p => {
                    const stats = platformStatsMap[p.id] || dashboardStats;

                    // Base Icons
                    const likeIcon = <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mb-1"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
                    const commentIcon = <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mb-1"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>;
                    const shareIcon = <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mb-1"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" /></svg>;
                    const repostIcon = <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mb-1"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>;
                    const viewIcon = <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mb-1"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>;
                    const sendIcon = <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mb-1"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>;
                    const saveIcon = <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mb-1"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>;

                    let metrics: { label: string, value: number, color: string, icon: any }[] = [];

                    if (p.id === 'instagram') {
                      metrics = [
                        { label: t('likes'), value: stats.likes, color: 'text-rose-400', icon: likeIcon },
                        { label: t('comments'), value: stats.comments, color: 'text-blue-400', icon: commentIcon },
                        { label: t('reposts'), value: stats.reposts, color: 'text-purple-400', icon: repostIcon },
                        { label: t('sends'), value: stats.shares, color: 'text-indigo-400', icon: sendIcon },
                        { label: t('view'), value: stats.views, color: 'text-emerald-500', icon: viewIcon },
                      ];
                    } else if (p.id === 'tiktok') {
                      metrics = [
                        { label: t('likes'), value: stats.likes, color: 'text-rose-400', icon: likeIcon },
                        { label: t('comments'), value: stats.comments, color: 'text-blue-400', icon: commentIcon },
                        { label: t('saves'), value: stats.saves, color: 'text-amber-500', icon: saveIcon },
                        { label: t('shares'), value: stats.shares, color: 'text-prada-charcoal/70', icon: shareIcon },
                      ];
                    } else if (p.id === 'x') {
                      metrics = [
                        { label: t('likes'), value: stats.likes, color: 'text-rose-400', icon: likeIcon },
                        { label: t('replies'), value: stats.comments, color: 'text-blue-400', icon: commentIcon },
                        { label: t('reposts'), value: stats.reposts, color: 'text-purple-400', icon: repostIcon },
                      ];
                    } else if (p.id === 'facebook') {
                      metrics = [
                        { label: t('likes'), value: stats.likes, color: 'text-blue-500', icon: likeIcon },
                        { label: t('comments'), value: stats.comments, color: 'text-blue-400', icon: commentIcon },
                        { label: t('shares'), value: stats.shares, color: 'text-prada-charcoal/70', icon: shareIcon },
                      ];
                    } else if (p.id === 'youtube') {
                      metrics = [
                        { label: t('likes'), value: stats.likes, color: 'text-rose-500', icon: likeIcon },
                        { label: t('comments'), value: stats.comments, color: 'text-blue-400', icon: commentIcon },
                        { label: t('view'), value: stats.views, color: 'text-emerald-500', icon: viewIcon },
                      ];
                    }

                    return (
                      <div key={p.id} className="bg-white/80 backdrop-blur-md rounded-xl p-4 border border-prada-warm/30 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center gap-2 border-b border-prada-warm/50 pb-2">
                          {p.icon && (
                            <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${p.color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                              <div className="scale-75">{p.icon}</div>
                            </div>
                          )}
                          <span className="font-bold text-prada-charcoal text-[13px]">{p.label}</span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                          {metrics.map((m, idx) => (
                            <div key={idx} className={`flex flex-col items-center min-w-[56px] ${metrics.length === 4 ? 'w-[22%]' : 'w-[30%]'} overflow-hidden`}>
                              <span className={m.color}>{m.icon}</span>
                              <span className="text-[9px] uppercase font-bold text-prada-charcoal/50 mb-0.5 tracking-wider text-center whitespace-nowrap w-full truncate">{m.label}</span>
                              <span className="text-[11px] sm:text-xs font-bold text-prada-charcoal tabular-nums w-full text-center truncate" title={m.value.toLocaleString()}>{m.value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Platform-Specific Task Modal */}
      {
        selectedTask && (() => {
          const platform = selectedTask.platform;
          const isFacebook = platform === 'facebook';
          const hasHashtags = !!selectedTask.hashtags && !isFacebook;
          const activePool = msgPools[language] || msgPools.en;
          const msgReady = activePool.p1.length > 0 && activePool.p2.length > 0 && emojiPool.length > 0;

          // Per-platform usage tips
          const tips: string[] = (() => {
            if (platform === 'instagram') return [t('igTip1'), t('igTip2'), t('igTip3')];
            if (platform === 'x') return [t('xTip1')];
            if (platform === 'tiktok') return [t('ttTip1'), t('ttTip2')];
            if (platform === 'youtube') return [t('ytTip1'), t('ytTip2')];
            if (platform === 'facebook') return [t('fbTip1')];
            return [];
          })();

          return (
            <div
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
              onClick={() => setSelectedTask(null)}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

              <div
                className="relative w-full max-w-md mx-3 mb-0 sm:mb-4 max-h-[92vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                  {/* Handle bar */}
                  <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mt-2.5 mb-0 sm:hidden flex-shrink-0" />

                  {/* Header */}
                  <div className="px-4 pt-3 pb-2.5 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${platformConfig[platform].color} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                        {platformConfig[platform].icon}
                      </div>
                      <p className="text-sm font-semibold text-prada-charcoal truncate">{selectedTask.title || t('noTitle')}</p>
                    </div>
                    <button
                      onClick={() => setSelectedTask(null)}
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm transition-colors flex-shrink-0 ml-2"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Scrollable body */}
                  <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">

                    {/* ── SECTION 1: Hashtags (not shown for Facebook) ── */}
                    {hasHashtags && (
                      <div className="rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{t('sectionHashtags')}</span>
                          <button
                            onClick={() => handleCopyHashtags(selectedTask)}
                            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${copiedType === 'hashtags'
                              ? 'bg-prada-red text-white'
                              : 'bg-white border border-prada-red/30 text-prada-red hover:bg-prada-red/10'
                              }`}
                          >
                            {copiedType === 'hashtags' ? t('copiedBtn') : t('copyTagsBtn')}
                          </button>
                        </div>
                        <div className="px-3 py-2.5 max-h-28 overflow-y-auto">
                          <p className="text-gray-700 text-xs whitespace-pre-wrap leading-relaxed">{selectedTask.hashtags}</p>
                        </div>
                      </div>
                    )}

                    {/* ── SECTION 2: Random Message ── */}
                    <div className="rounded-2xl border border-gray-200 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{t('sectionMessage')}</span>
                        {generatedMessage && (
                          <button
                            onClick={handleCopyMessage}
                            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${copiedType === 'message'
                              ? 'bg-prada-red text-white'
                              : 'bg-white border border-prada-red/30 text-prada-red hover:bg-prada-red/10'
                              }`}
                          >
                            {copiedType === 'message' ? t('copiedBtn') : t('copyMsgBtn')}
                          </button>
                        )}
                      </div>
                      <div className="px-3 py-2.5 space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={generateRandomMessage}
                            disabled={!msgReady}
                            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${msgReady
                              ? 'bg-prada-red hover:bg-prada-charcoal text-white shadow-sm'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                          >
                            {t('generateCaption')}
                          </button>
                          {generatedMessage && msgReady && (
                            <button
                              onClick={generateRandomMessage}
                              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-colors"
                            >
                              {t('regenerate')}
                            </button>
                          )}
                        </div>
                        {!msgReady && (
                          <p className="text-gray-400 text-[10px]">{t('noPositiveMessages')}</p>
                        )}
                        {generatedMessage && (
                          <p className="text-gray-800 text-xs p-2.5 bg-white rounded-xl border border-gray-200 leading-relaxed">{generatedMessage}</p>
                        )}
                      </div>
                    </div>

                    {/* ── SECTION 3: Copy All (message + hashtags) — not shown for Facebook ── */}
                    {!isFacebook && generatedMessage && hasHashtags && (
                      <button
                        onClick={() => handleCopyBoth(selectedTask)}
                        className={`w-full py-2.5 rounded-2xl text-xs font-bold transition-all border ${copiedType === 'both'
                          ? 'bg-prada-charcoal text-white border-prada-charcoal'
                          : 'bg-prada-gold/15 hover:bg-prada-gold/25 text-prada-darkgold border-prada-gold/30'
                          }`}
                      >
                        {copiedType === 'both' ? t('copiedBtn') : `${t('copyAllBtn')} — ${t('sectionMessage')} + ${t('sectionHashtags')}`}
                      </button>
                    )}

                    {/* ── SECTION 4: Actions (Go to post + Mark done) ── */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGoToPost(selectedTask)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${platformConfig[platform].color} hover:opacity-90 transition-opacity shadow-sm`}
                      >
                        {t('goPost')}
                      </button>
                      {isTaskCompleted(selectedTask) ? (
                        <button
                          onClick={() => handleUnmarkComplete(selectedTask)}
                          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-green-50 hover:bg-green-100 text-green-600 transition-colors border border-green-200"
                        >
                          {t('undoDoneBtn')}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMarkComplete(selectedTask)}
                          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 hover:bg-green-50 text-gray-600 hover:text-green-600 transition-colors border border-gray-200 hover:border-green-200"
                        >
                          {t('markDoneBtn')}
                        </button>
                      )}
                    </div>

                    {/* ── SECTION 5: Usage Tips ── */}
                    {tips.length > 0 && (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 overflow-hidden">
                        <div className="px-3 py-2 border-b border-amber-100">
                          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">{t('sectionTips')}</span>
                        </div>
                        <ul className="px-3 py-2.5 space-y-1.5 pb-3">
                          {tips.map((tip, i) => (
                            <li key={i} className="text-[12px] text-amber-800 leading-snug">{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Bottom padding for scroll */}
                    <div className="h-1" />
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      }


      {/* Achievement Popup */}
      <AchievementPopup
        isOpen={showAchievement}
        onClose={() => setShowAchievement(false)}
        completedCount={totalCompletedCount}
        totalCount={totalTasksList.length}
      />

      {/* Achievement Floating Button */}
      <AchievementFloatingButton
        onClick={() => setShowAchievement(true)}
        isUnlocked={achievementUnlocked}
      />
    </div>
  );
}

export default App;
