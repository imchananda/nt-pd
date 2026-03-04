import { useState, useEffect, useCallback, useMemo } from 'react';
import { FaInstagram, FaFacebook, FaYoutube, FaWeibo, FaTiktok } from 'react-icons/fa';
import { FaXTwitter, FaThreads } from 'react-icons/fa6';
import { SiXiaohongshu } from 'react-icons/si';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SheetTask {
    id: string;
    phase: string;
    platform: string;
    url: string;
    title: string;
    likes: number;
    comments: number;
    shares: number;
    reposts: number;
    views: number;
    saves: number;
    isReel?: boolean;
    hashtagsFlag: number;  // column 'hashtags'  — 1 = นับ, 0 = ไม่นับ (สำหรับสื่อ)
    followerFlag: number;  // column 'follower'   — 1 = นับ, 0 = ไม่นับ (สำหรับสื่อ)
}


// CPM config per platform
interface PlatformCPM {
    key: string;
    label: string;
    emoji: string;
    cpm: number;         // USD per 1000 impressions
    cpmMin?: number;
    cpmMax?: number;
    hasRange: boolean;
    color: string;
    enabled: boolean;    // in EMV Part 2
    enabledMIV: boolean; // in MIV Part 3
}

// Per-post row state for EMV/MIV
interface PostRow {
    id: string;
    platform: string;
    title: string;
    url: string;
    likes: number;
    comments: number;
    shares: number;
    reposts: number;
    views: number;
    saves: number;
    included: boolean;
    hashtagsFlag: number;  // from sheet
    followerFlag: number;  // from sheet
    isMedia: boolean;      // true = non-Namtan post → subject to flag rules
    overrideLikes?: number;
    overrideComments?: number;
    overrideShares?: number;
    overrideReposts?: number;
    overrideViews?: number;
    overrideSaves?: number;
}

// ─── Sheet Config (mirrors App.tsx) ─────────────────────────────────────────
const SHEETS_CONFIG = [
    { phase: 'airport', label: '24-25 Feb', gid: '0' },
    { phase: 'show', label: '26 Feb', gid: '879518091' },
    { phase: 'aftermath', label: '27 Feb - 9 Mar', gid: '1605499344' },
    { phase: 'aftermath2', label: '27 Feb - 9 Mar', gid: '359554028' },
];

// ─── Default CPM Settings ────────────────────────────────────────────────────
const DEFAULT_CPM_CONFIG: PlatformCPM[] = [
    { key: 'instagram', label: 'Instagram', emoji: '📸', cpm: 100, hasRange: false, color: '#E1306C', enabled: true, enabledMIV: true },
    { key: 'weibo', label: 'Weibo', emoji: '🔴', cpm: 71.43, cpmMin: 70, cpmMax: 72.85, hasRange: true, color: '#E6162D', enabled: true, enabledMIV: true },
    { key: 'red', label: 'RED (小红书)', emoji: '📕', cpm: 51.02, cpmMin: 50, cpmMax: 52.04, hasRange: true, color: '#FF2442', enabled: true, enabledMIV: true },
    { key: 'tiktok', label: 'TikTok', emoji: '🎵', cpm: 0, hasRange: false, color: '#010101', enabled: false, enabledMIV: true },
    { key: 'x', label: 'X (Twitter)', emoji: '🐦', cpm: 0, hasRange: false, color: '#1DA1F2', enabled: false, enabledMIV: true },
    { key: 'facebook', label: 'Facebook', emoji: '👥', cpm: 0, hasRange: false, color: '#1877F2', enabled: false, enabledMIV: true },
    { key: 'youtube', label: 'YouTube', emoji: '▶️', cpm: 0, hasRange: false, color: '#FF0000', enabled: false, enabledMIV: true },
    { key: 'threads', label: 'Threads', emoji: '🧵', cpm: 0, hasRange: false, color: '#000000', enabled: false, enabledMIV: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const parseAbbreviatedNumber = (val: string): number => {
    if (!val) return 0;
    const s = val.toString().toLowerCase().trim().replace(/,/g, '');
    if (!s) return 0;
    let mul = 1;
    let num = s;
    if (s.endsWith('k')) { mul = 1000; num = s.slice(0, -1); }
    else if (s.endsWith('m')) { mul = 1000000; num = s.slice(0, -1); }
    const r = parseFloat(num) * mul;
    return isNaN(r) ? 0 : Math.round(r);
};

const fmt = (n: number) => n.toLocaleString('en-US');
const fmtUSD = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Namtan-vs-Media classifier ────────────────────────────────────────────────
// ของ Namtan = title มีคำว่า "namtan" (case-insensitive)
// สื่อ / Media = อื่นๆ ที่ title ไม่มีคำว่า "namtan"
function isNamtanPost(row: { title: string }): boolean {
    const t = row.title.toLowerCase();
    return t.includes('namtan') || t.includes('tipnaree') || t.includes('weerawatnodom');
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(csvText: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];
        if (char === '"') {
            if (inQuotes && nextChar === '"') { currentCell += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            currentRow.push(currentCell.trim());
            if (currentRow.some(c => c !== '')) rows.push(currentRow);
            currentRow = []; currentCell = '';
            if (char === '\r') i++;
        } else if (char === '\r' && !inQuotes) {
            currentRow.push(currentCell.trim());
            if (currentRow.some(c => c !== '')) rows.push(currentRow);
            currentRow = []; currentCell = '';
        } else {
            currentCell += char;
        }
    }
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c !== '')) rows.push(currentRow);
    return rows;
}

function parseTasksFromCSV(csvText: string, phase: string): SheetTask[] {
    csvText = csvText.replace(/^\uFEFF/, '');
    const rows = parseCSV(csvText);
    if (rows.length === 0) return [];
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const getVal = (r: string[], header: string) => {
        const idx = headers.indexOf(header.toLowerCase().trim());
        return idx !== -1 ? (r[idx] || '') : '';
    };
    // get the right-most column if there are duplicate headers (like "hashtags")
    const getLastVal = (r: string[], header: string) => {
        const idx = headers.lastIndexOf(header.toLowerCase().trim());
        return idx !== -1 ? (r[idx] || '') : '';
    };
    const tasks: SheetTask[] = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const url = getVal(r, 'url');
        if (!url) continue;
        let rawPlatform = (getVal(r, 'platform') || 'x').toLowerCase().trim();
        if (['ig', 'instagram', 'insta'].includes(rawPlatform)) rawPlatform = 'instagram';
        else if (['fb', 'facebook'].includes(rawPlatform)) rawPlatform = 'facebook';
        else if (['tt', 'tiktok'].includes(rawPlatform)) rawPlatform = 'tiktok';
        else if (['yt', 'youtube'].includes(rawPlatform)) rawPlatform = 'youtube';
        else if (['threads', 'thread', 'th'].includes(rawPlatform)) rawPlatform = 'threads';
        // weibo / red stay as-is
        const title = getVal(r, 'title') || getVal(r, 'note') || '';
        const isReel = title.toLowerCase().includes('reel') || url.toLowerCase().includes('/reel');
        // Read flag columns (1 = yes, 0 / empty = no). Use getLastVal because 'hashtags' appears twice.
        const hashtagsFlag = parseInt(getLastVal(r, 'hashtags') || '0', 10) === 1 ? 1 : 0;
        const followerFlag = parseInt(getLastVal(r, 'follower') || '0', 10) === 1 ? 1 : 0;
        tasks.push({
            id: getVal(r, 'id') || url || String(i),
            phase,
            platform: rawPlatform,
            url,
            title,
            likes: parseAbbreviatedNumber(getVal(r, 'likes')),
            comments: parseAbbreviatedNumber(getVal(r, 'comments')),
            shares: parseAbbreviatedNumber(getVal(r, 'shares')),
            reposts: parseAbbreviatedNumber(getVal(r, 'reposts')),
            views: parseAbbreviatedNumber(getVal(r, 'view') || getVal(r, 'views')),
            saves: parseAbbreviatedNumber(getVal(r, 'save') || getVal(r, 'saves')),
            isReel,
            hashtagsFlag,
            followerFlag,
        });
    }
    return tasks;
}

// ─── Section Tab ─────────────────────────────────────────────────────────────
type ActiveSection = 'ig' | 'emv' | 'miv';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminCalculator() {
    const [loading, setLoading] = useState(true);
    const [allTasks, setAllTasks] = useState<SheetTask[]>([]);
    const [activeSection, setActiveSection] = useState<ActiveSection>('ig');
    const [lastUpdated, setLastUpdated] = useState<string>('');


    // Part 2 – EMV: CPM config + post rows
    const [cpmConfig, setCpmConfig] = useState<PlatformCPM[]>(DEFAULT_CPM_CONFIG);
    const [emvRows, setEmvRows] = useState<PostRow[]>([]);

    // Part 3 – MIV: same CPM config, all platforms
    const [mivRows, setMivRows] = useState<PostRow[]>([]);
    const [mivCpmConfig, setMivCpmConfig] = useState<PlatformCPM[]>(DEFAULT_CPM_CONFIG);

    // ─── Fetch all sheet data ─────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const allFetched: SheetTask[] = [];
            await Promise.all(SHEETS_CONFIG.map(async (sheet) => {
                try {
                    const res = await fetch(`/api/sheet?gid=${sheet.gid}`);
                    if (!res.ok) return;
                    const csv = await res.text();
                    const tasks = parseTasksFromCSV(csv, sheet.phase);
                    allFetched.push(...tasks);
                } catch (e) {
                    console.error(`Error fetching sheet ${sheet.phase}:`, e);
                }
            }));
            setAllTasks(allFetched);
            setLastUpdated(new Date().toLocaleTimeString('th-TH'));


            // Build EMV rows (IG, Weibo, RED only — i.e. platforms with set CPM)
            const emvPlatforms = ['instagram', 'weibo', 'red'];
            const emvTasksRaw = allFetched.filter(t => emvPlatforms.includes(t.platform));
            setEmvRows(emvTasksRaw.map(t => {
                const isMedia = !isNamtanPost(t);
                return {
                    id: t.id,
                    platform: t.platform,
                    title: t.title || t.url.slice(0, 60),
                    url: t.url,
                    likes: t.likes,
                    comments: t.comments,
                    shares: t.shares,
                    reposts: t.reposts,
                    views: t.views,
                    saves: t.saves,
                    hashtagsFlag: t.hashtagsFlag,
                    followerFlag: t.followerFlag,
                    isMedia,
                    included: !isMedia || (t.hashtagsFlag === 1 && t.followerFlag === 1),
                };
            }));

            // Build MIV rows (all platforms)
            setMivRows(allFetched.map(t => {
                const isMedia = !isNamtanPost(t);
                return {
                    id: t.id,
                    platform: t.platform,
                    title: t.title || t.url.slice(0, 60),
                    url: t.url,
                    likes: t.likes,
                    comments: t.comments,
                    shares: t.shares,
                    reposts: t.reposts,
                    views: t.views,
                    saves: t.saves,
                    hashtagsFlag: t.hashtagsFlag,
                    followerFlag: t.followerFlag,
                    isMedia,
                    included: !isMedia || (t.hashtagsFlag === 1 && t.followerFlag === 1),
                };
            }));
        } catch (e) {
            console.error('Fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // (calcEMV moved to EMVSection to be reactive to filters)

    // ─── Render Helpers ───────────────────────────────────────────────────────
    const updateCPM = (_config: PlatformCPM[], setConfig: React.Dispatch<React.SetStateAction<PlatformCPM[]>>, key: string, field: keyof PlatformCPM, value: unknown) => {
        setConfig(prev => prev.map(c => c.key === key ? { ...c, [field]: value } : c));
    };

    const updateRow = (_rows: PostRow[], setRows: React.Dispatch<React.SetStateAction<PostRow[]>>, rowId: string, field: keyof PostRow, value: unknown) => {
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r));
    };

    const addCustomPlatform = (_config: PlatformCPM[], setConfig: React.Dispatch<React.SetStateAction<PlatformCPM[]>>) => {
        const key = `custom_${Date.now()}`;
        setConfig(prev => [...prev, {
            key,
            label: 'Platform ใหม่',
            emoji: '🌐',
            cpm: 0,
            hasRange: false,
            color: '#888888',
            enabled: true,
            enabledMIV: true,
        }]);
    };

    // ─── Loading Screen ───────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-6 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
                        <div className="absolute inset-0 rounded-full border-4 border-t-rose-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                        <div className="absolute inset-2 flex items-center justify-center text-xl">📊</div>
                    </div>
                    <p className="text-gray-400 text-sm tracking-widest uppercase font-medium">กำลังโหลดข้อมูล...</p>
                    <p className="text-gray-700 text-xs mt-2">กำลังดึงข้อมูลจาก Google Sheets</p>
                </div>
            </div>
        );
    }

    const tabs: { id: ActiveSection; label: string; emoji: string }[] = [
        { id: 'ig', label: 'Dashboard', emoji: '📊' },
        { id: 'emv', label: 'EMV', emoji: '💰' },
        { id: 'miv', label: 'MIV', emoji: '📈' },
    ];


    return (
        <div className="min-h-screen bg-[#0a0a0f] text-gray-100 font-sans">
            {/* ── Top Bar ─────────────────────────────────────────────────── */}
            <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800/80 sticky top-0 z-50">
                {/* Rose accent line at top */}
                <div className="h-0.5 bg-gradient-to-r from-rose-600 via-pink-500 to-rose-600" />
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { window.location.hash = ''; window.location.reload(); }}
                            className="text-gray-500 hover:text-gray-200 transition-colors text-xs flex items-center gap-1.5 group"
                        >
                            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                            <span>หน้าหลัก</span>
                        </button>
                        <div className="w-px h-4 bg-gray-700" />
                        <div className="flex items-center gap-2">
                            <span className="text-base">🔒</span>
                            <h1 className="text-sm font-bold text-gray-100 tracking-wide">Admin Dashboard</h1>
                        </div>
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Private</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {lastUpdated && (
                            <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {lastUpdated}
                            </span>
                        )}
                        <button
                            onClick={fetchData}
                            className="text-xs bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700/80 transition-all flex items-center gap-1.5"
                        >
                            🔄 <span className="hidden sm:inline">รีเฟรช</span>
                        </button>
                    </div>
                </div>

                {/* ── Navigation Tabs ───────────────────────────────────── */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="flex gap-1 pb-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSection(tab.id)}
                                className={`relative px-4 sm:px-6 py-2.5 text-xs font-bold tracking-wide transition-all rounded-t-lg ${activeSection === tab.id
                                    ? 'text-white bg-gray-800 border-t border-l border-r border-gray-700/80'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40'
                                    }`}
                            >
                                {activeSection === tab.id && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-t-full" />
                                )}
                                <span className="flex items-center gap-1.5">
                                    <span>{tab.emoji}</span>
                                    <span>{tab.label}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

                {/* ================================================================= */}
                {/* PART 1 – IG ACCOUNT SUMMARY (Dashboard)                           */}
                {/* ================================================================= */}
                {activeSection === 'ig' && <DashboardSection allTasks={allTasks} />}


                {/* ================================================================= */}
                {/* PART 2 – EMV CALCULATOR                                            */}
                {/* ================================================================= */}
                {activeSection === 'emv' && (
                    <EMVSection
                        title="EMV Calculator"
                        subtitle="Earned Media Value (ข้อมูลระหว่างวันที่ 24 กพ- 4มีค) — คำนวณจาก (Impressions × CPM) / 1000"
                        note="Impressions = รวม Likes + Comments + Shares + Reposts + Views + Saves"
                        rows={emvRows}
                        setRows={setEmvRows}
                        cpmConfig={cpmConfig}
                        setCpmConfig={setCpmConfig}
                        updateCPM={(key, field, value) => updateCPM(cpmConfig, setCpmConfig, key, field, value)}
                        updateRow={(id, field, value) => updateRow(emvRows, setEmvRows, id, field, value)}
                        addPlatform={() => addCustomPlatform(cpmConfig, setCpmConfig)}
                        isMIV={false}
                    />
                )}

                {/* ================================================================= */}
                {/* PART 3 – MIV CALCULATOR                                            */}
                {/* ================================================================= */}
                {activeSection === 'miv' && (
                    <EMVSection
                        title="MIV Calculator"
                        subtitle="Media Impact Value (ข้อมูลระหว่างวันที่ 24 กพ- 4มีค) — ใช้โครงสร้างเดียวกับ EMV (สูตร MIV จริงยังไม่ทราบ)"
                        note="ตั้งค่า CPM ต่อ platform เพื่อประมาณ MIV — ปรับได้ตามข้อมูลจริง"
                        rows={mivRows}
                        setRows={setMivRows}
                        cpmConfig={mivCpmConfig}
                        setCpmConfig={setMivCpmConfig}
                        updateCPM={(key, field, value) => updateCPM(mivCpmConfig, setMivCpmConfig, key, field, value)}
                        updateRow={(id, field, value) => updateRow(mivRows, setMivRows, id, field, value)}
                        addPlatform={() => addCustomPlatform(mivCpmConfig, setMivCpmConfig)}
                        isMIV={true}
                    />
                )}

            </div>
        </div >
    );
}


// ─── Dashboard Section (Interactive Hooks) ──────────────────────────────────
function DashboardSection({ allTasks }: { allTasks: SheetTask[] }) {
    const followersBefore = 2817680;
    const followersNow = 2828997;
    const followerGain = followersNow - followersBefore;
    const followerPct = (followerGain / followersBefore) * 100;

    const sumEng = (tasks: SheetTask[]) => tasks.reduce((acc, t) => ({
        likes: acc.likes + t.likes,
        comments: acc.comments + t.comments,
        shares: acc.shares + t.shares,
        reposts: acc.reposts + t.reposts,
        views: acc.views + t.views,
        saves: acc.saves + t.saves,
    }), { likes: 0, comments: 0, shares: 0, reposts: 0, views: 0, saves: 0 });
    const totalEng = (e: ReturnType<typeof sumEng>) =>
        e.likes + e.comments + e.shares + e.reposts + e.views + e.saves;

    const namtanTasks = allTasks.filter(t => isNamtanPost(t));
    const mediaTasks = allTasks.filter(t => !isNamtanPost(t));

    const ENG_LABELS = [
        { k: 'likes', label: 'Likes ❤️' },
        { k: 'comments', label: 'Comments 💬' },
        { k: 'shares', label: 'Shares 📤' },
        { k: 'reposts', label: 'Reposts 🔁' },
        { k: 'views', label: 'Views 👁️' },
        { k: 'saves', label: 'Saves 🔖' },
    ] as const;

    const platformGroups: { id: string; title: string; icon: React.ReactNode; platforms: string[]; glow: string; border: string; activeCls: string }[] = [
        { id: 'instagram', title: 'Instagram', icon: <FaInstagram />, platforms: ['instagram'], glow: 'bg-pink-500/10', border: 'border-pink-500/40', activeCls: 'bg-gradient-to-br from-pink-500/15 to-gray-900 border-pink-500/40 text-pink-300' },
        { id: 'x', title: 'X', icon: <FaXTwitter />, platforms: ['x'], glow: 'bg-gray-500/10', border: 'border-gray-400/40', activeCls: 'bg-gradient-to-br from-gray-500/15 to-gray-900 border-gray-400/40 text-gray-200' },
        { id: 'tiktok', title: 'TikTok', icon: <FaTiktok />, platforms: ['tiktok'], glow: 'bg-cyan-500/10', border: 'border-cyan-500/40', activeCls: 'bg-gradient-to-br from-cyan-500/15 to-gray-900 border-cyan-500/40 text-cyan-300' },
        { id: 'facebook', title: 'Facebook', icon: <FaFacebook />, platforms: ['facebook'], glow: 'bg-blue-500/10', border: 'border-blue-500/40', activeCls: 'bg-gradient-to-br from-blue-500/15 to-gray-900 border-blue-500/40 text-blue-300' },
        { id: 'youtube', title: 'YouTube', icon: <FaYoutube />, platforms: ['youtube'], glow: 'bg-red-500/10', border: 'border-red-500/40', activeCls: 'bg-gradient-to-br from-red-500/15 to-gray-900 border-red-500/40 text-red-300' },
        { id: 'threads', title: 'Threads', icon: <FaThreads />, platforms: ['threads', 'th', 'thread'], glow: 'bg-neutral-500/10', border: 'border-neutral-400/40', activeCls: 'bg-gradient-to-br from-neutral-500/15 to-gray-900 border-neutral-400/40 text-neutral-200' },
        { id: 'weibo', title: 'Weibo', icon: <FaWeibo />, platforms: ['weibo'], glow: 'bg-yellow-500/10', border: 'border-yellow-500/40', activeCls: 'bg-gradient-to-br from-yellow-500/15 to-gray-900 border-yellow-500/40 text-yellow-300' },
        { id: 'red', title: 'RED', icon: <SiXiaohongshu />, platforms: ['red'], glow: 'bg-rose-500/10', border: 'border-rose-500/40', activeCls: 'bg-gradient-to-br from-rose-500/15 to-gray-900 border-rose-500/40 text-rose-300' },
    ];

    const [activeTab, setActiveTab] = useState('instagram');

    // Sub-block inside a platform card
    const SubSection = ({ label, tasks }: { label: string; tasks: SheetTask[] }) => {
        if (tasks.length === 0) return null;
        const e = sumEng(tasks);
        const total = totalEng(e);
        return (
            <div>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-400">{label}</span>
                    <span className="text-[10px] text-gray-600">{fmt(tasks.length)} โพสต์</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {ENG_LABELS.map(m => (
                        <div key={m.k} className="bg-gray-800/70 rounded-xl p-3 border border-gray-600/60 flex flex-col items-center justify-center text-center hover:border-gray-500/80 transition-colors">
                            <span className="text-[9px] text-gray-400 uppercase tracking-widest mb-1 block w-full truncate">{m.label}</span>
                            <span className="text-lg font-black text-white">{fmt(e[m.k])}</span>
                        </div>
                    ))}
                </div>
                {total > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Total Engagement</span>
                        <span className="text-xl font-black bg-gradient-to-r from-emerald-400 via-cyan-300 to-sky-400 bg-clip-text text-transparent">{fmt(total)}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-5">
            {/* Page title */}
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-xl flex-shrink-0">📊</div>
                <div>
                    <h2 className="text-lg font-black text-white tracking-wide">Overall Dashboard</h2>
                    <p className="text-[11px] text-gray-500 mt-0.5">ข้อมูลระหว่างวันที่ 24 กพ - 4 มีค · Read-Only</p>
                </div>
            </div>

            {/* ── Follower Stats ───────────────────────────────── */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-pink-500/25 p-5 shadow-xl relative overflow-hidden shadow-pink-500/5">
                <div className="absolute top-0 right-0 p-40 bg-pink-500/10 rounded-full blur-3xl" />
                <h3 className="text-xs font-bold text-pink-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span>📸</span> ยอดฟอลโลเวอร์ Instagram · namtan.tipnaree
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
                    <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700/50 text-center">
                        <div className="text-[9px] text-gray-400 uppercase tracking-widest mb-2">ก่อนอีเวนต์ · 22 Feb</div>
                        <div className="text-2xl font-black text-gray-400 tabular-nums">{fmt(followersBefore)}</div>
                    </div>
                    <div className="bg-gray-800/80 backdrop-blur rounded-xl p-4 border border-pink-500/20 text-center shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                        <div className="text-[9px] text-pink-400 uppercase tracking-widest mb-2">ปัจจุบัน</div>
                        <div className="text-2xl font-black text-white tabular-nums">{fmt(followersNow)}</div>
                        <a href="https://instrack.app/instagram/namtan.tipnaree" target="_blank" rel="noreferrer"
                            className="text-[9px] text-gray-500 hover:text-white hover:underline mt-1 inline-flex items-center gap-0.5 transition-colors">
                            instrack.app ↗
                        </a>
                    </div>
                    <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700/50 text-center">
                        <div className="text-[9px] text-gray-400 uppercase tracking-widest mb-2">เพิ่มขึ้น</div>
                        <div className={`text-2xl font-black tabular-nums ${followerPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {followerPct >= 0 ? '+' : ''}{followerPct.toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-400 mt-1">+{fmt(followerGain)} คน</div>
                    </div>
                </div>
            </div>

            {/* ── Combined All Platforms ────────────────────────── */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-indigo-500/25 p-5 shadow-xl relative overflow-hidden shadow-indigo-500/5">
                <div className="absolute top-0 right-0 p-40 bg-indigo-500/10 rounded-full blur-3xl" />
                <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                    <span>🌐</span> ยอด Engagement รวมทุก Platform
                </h3>
                <div className="space-y-6 relative z-10">
                    <SubSection label="👤 Namtan — ทุก Platform" tasks={namtanTasks} />
                    <div className="border-t border-gray-800" />
                    <SubSection label="📰 สื่อทั้งหมด — ทุก Platform" tasks={mediaTasks} />
                </div>
            </div>

            {/* ── Per-Platform Tabbed Sections ────────────────────────────── */}
            {(() => {
                const activeGroup = platformGroups.find(g => g.id === activeTab);
                return (
                    <div className={`rounded-2xl border shadow-xl overflow-hidden transition-all duration-300 ${activeGroup ? activeGroup.border : 'border-gray-800'}`}>
                        {/* Platform Tabs Header */}
                        <div className="border-b border-gray-700/50 bg-black/30 p-2 sm:p-3 overflow-x-auto no-scrollbar">
                            <div className="flex gap-1.5 min-w-max">
                                {platformGroups.map(group => {
                                    const groupCount = allTasks.filter(t => group.platforms.includes(t.platform)).length;
                                    if (groupCount === 0) return null;
                                    const isActive = activeTab === group.id;

                                    return (
                                        <button
                                            key={group.id}
                                            onClick={() => setActiveTab(group.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-200 border ${isActive ? `${group.activeCls} shadow-md` : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
                                                }`}
                                        >
                                            <span className="text-base">{group.icon}</span>
                                            <span className="uppercase tracking-widest">{group.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Active Platform Content */}
                        <div className="p-5">
                            {(() => {
                                const grp = platformGroups.find(g => g.id === activeTab);
                                if (grp) return <div className={`absolute inset-x-0 top-0 h-0.5 ${grp.glow.replace('bg-', 'bg-gradient-to-r via-').replace('/10', '/60').replace('/8', '/50')}`} />;
                                return null;
                            })()}
                            {platformGroups.filter(g => g.id === activeTab).map(group => {
                                const groupNamtan = namtanTasks.filter(t => group.platforms.includes(t.platform));
                                const groupMedia = mediaTasks.filter(t => group.platforms.includes(t.platform));

                                if (groupNamtan.length + groupMedia.length === 0) {
                                    return (
                                        <div key={group.id} className="text-center py-10 text-gray-600 text-sm">
                                            ไม่มีข้อมูลโพสต์ของแพลตฟอร์มนี้ในช่วงเวลาที่กำหนด
                                        </div>
                                    );
                                }

                                return (
                                    <div key={group.id} className="space-y-6">
                                        {groupNamtan.length > 0 && <SubSection label="👤 Namtan" tasks={groupNamtan} />}
                                        {groupNamtan.length > 0 && groupMedia.length > 0 && (
                                            <div className="border-t border-gray-800" />
                                        )}
                                        {groupMedia.length > 0 && <SubSection label="📰 สื่อทั้งหมด" tasks={groupMedia} />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* ── Data Quality Panel ────────────────────────────────────── */}
            <DataQualityPanel allTasks={allTasks} />
        </div>
    );
}


// ─── Data Quality Panel ────────────────────────────────────────────────────────
function DataQualityPanel({ allTasks }: { allTasks: SheetTask[] }) {
    const namtanTasks = allTasks.filter(t => isNamtanPost(t));
    const mediaTasks = allTasks.filter(t => !isNamtanPost(t));

    // ── 1. Namtan posts per platform ──────────────────────────────────────────
    const namtanByPlatform = namtanTasks.reduce<Record<string, number>>((acc, t) => {
        acc[t.platform] = (acc[t.platform] || 0) + 1;
        return acc;
    }, {});
    const namtanPlatformEntries = Object.entries(namtanByPlatform).sort((a, b) => b[1] - a[1]);

    // ── 2. Media outlets per platform (grouped by title) ──────────────────────
    const mediaByPlatform = mediaTasks.reduce<Record<string, Record<string, number>>>((acc, t) => {
        const title = (t.title || t.url).trim();
        if (!acc[t.platform]) acc[t.platform] = {};
        acc[t.platform][title] = (acc[t.platform][title] || 0) + 1;
        return acc;
    }, {});
    const mediaPlatformEntries = Object.entries(mediaByPlatform).sort((a, b) => {
        const totalA = Object.values(a[1]).reduce((s, n) => s + n, 0);
        const totalB = Object.values(b[1]).reduce((s, n) => s + n, 0);
        return totalB - totalA;
    });

    // ── 3. Flag counters (ALL tasks) ──────────────────────────────────────────
    const followerZero = allTasks.filter(t => t.followerFlag === 0).length;
    const hashtagsZero = allTasks.filter(t => t.hashtagsFlag === 0).length;
    const bothZero = allTasks.filter(t => t.followerFlag === 0 && t.hashtagsFlag === 0).length;

    // ── 4. EMV Loss: media posts that are excluded ────────────────────────────
    const mediaExcluded = mediaTasks.filter(t => t.followerFlag !== 1 || t.hashtagsFlag !== 1);
    const mediaIncluded = mediaTasks.filter(t => t.followerFlag === 1 && t.hashtagsFlag === 1);
    const totalMediaImprLost = mediaExcluded.reduce(
        (s, t) => s + t.likes + t.comments + t.shares + t.reposts + t.views + t.saves, 0
    );

    // Platform label helper
    const PLATFORM_LABEL: Record<string, string> = {
        instagram: '📸 Instagram', facebook: '👥 Facebook', x: '🐦 X (Twitter)',
        tiktok: '🎵 TikTok', youtube: '▶️ YouTube', threads: '🧵 Threads',
        weibo: '🔴 Weibo', red: '📕 RED',
    };
    const pl = (key: string) => PLATFORM_LABEL[key] || `🌐 ${key}`;

    const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({});
    const togglePlatform = (key: string) =>
        setExpandedPlatforms(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="space-y-4">
            {/* Section header */}
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xl flex-shrink-0">🔍</div>
                <div>
                    <h2 className="text-lg font-black text-white tracking-wide">Data Quality & Coverage</h2>
                    <p className="text-[11px] text-gray-500 mt-0.5">สถิติความครบถ้วนของข้อมูล — ตรวจ flags, สื่อ, และยอดที่ใช้คิด EMV ไม่ได้</p>
                </div>
            </div>

            {/* ─ Block 1: Namtan posts per platform ─────────────────────────────── */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-violet-500/25 p-5 shadow-xl">
                <h3 className="text-xs font-bold text-violet-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span>👤</span> โพสต์ของ Namtan แยกตาม Platform
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {namtanPlatformEntries.map(([platform, count]) => (
                        <div key={platform} className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/50 text-center">
                            <div className="text-[10px] text-gray-400 mb-1">{pl(platform)}</div>
                            <div className="text-2xl font-black text-white">{count}</div>
                            <div className="text-[9px] text-gray-500 mt-0.5">โพสต์</div>
                        </div>
                    ))}
                </div>
                <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 font-bold">รวมทั้งหมด</span>
                    <span className="text-2xl font-black text-violet-400">{namtanTasks.length} โพสต์</span>
                </div>
            </div>

            {/* ─ Block 2: Media outlets per platform ────────────────────────────── */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-amber-500/25 p-5 shadow-xl">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span>📰</span> สื่อ (Media) แยกตาม Platform
                    <span className="ml-auto text-[10px] text-gray-500 normal-case font-normal tracking-normal">คลิก platform เพื่อดูรายชื่อสื่อ</span>
                </h3>
                <div className="space-y-3">
                    {mediaPlatformEntries.map(([platform, outlets]) => {
                        const outletEntries = Object.entries(outlets).sort((a, b) => b[1] - a[1]);
                        const totalPosts = outletEntries.reduce((s, [, n]) => s + n, 0);
                        const isOpen = expandedPlatforms[platform];
                        return (
                            <div key={platform} className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                                {/* Platform header row */}
                                <button
                                    onClick={() => togglePlatform(platform)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/30 transition-colors text-left"
                                >
                                    <span className="text-sm font-bold text-gray-200 flex-1">{pl(platform)}</span>
                                    <span className="text-[10px] text-gray-400">{outletEntries.length} สื่อ</span>
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">{totalPosts} โพสต์</span>
                                    <span className="text-gray-500 text-xs ml-1">{isOpen ? '▲' : '▼'}</span>
                                </button>
                                {/* Outlet list (collapsible) */}
                                {isOpen && (
                                    <div className="border-t border-gray-700/50 px-4 py-3 space-y-1.5">
                                        {outletEntries.map(([title, count]) => (
                                            <div key={title} className="flex items-center gap-2 py-1 border-b border-gray-800/60 last:border-0">
                                                <span className="flex-1 text-[11px] text-gray-300 leading-tight">{title}</span>
                                                <span className="text-[10px] font-bold text-amber-400 flex-shrink-0">{count} โพสต์</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 font-bold">รวม Media ทั้งหมด</span>
                    <span className="text-2xl font-black text-amber-400">{mediaTasks.length} โพสต์</span>
                </div>
            </div>

            {/* ─ Block 3: Flag counters ──────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-red-500/25 p-5 shadow-xl">
                <h3 className="text-xs font-bold text-red-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span>🚩</span> โพสต์ที่มี Flag = 0
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'follower = 0', count: followerZero, sub: 'โพสต์ที่ไม่มีข้อมูล Follower', color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' },
                        { label: 'hashtags = 0', count: hashtagsZero, sub: 'โพสต์ที่ไม่มี Hashtag', color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10' },
                        { label: 'follower = 0 AND hashtags = 0', count: bothZero, sub: 'ทั้ง 2 flag เป็น 0', color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10' },
                    ].map(item => (
                        <div key={item.label} className={`rounded-xl p-4 border ${item.border} ${item.bg} text-center`}>
                            <div className="text-[10px] text-gray-400 mb-2 font-mono">{item.label}</div>
                            <div className={`text-3xl font-black ${item.color}`}>{item.count}</div>
                            <div className="text-[9px] text-gray-500 mt-1">{item.sub}</div>
                            <div className="text-[9px] text-gray-600 mt-0.5">จาก {allTasks.length} โพสต์ทั้งหมด</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─ Block 4: EMV Loss Summary ───────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-rose-600/30 p-5 shadow-xl">
                <h3 className="text-xs font-bold text-rose-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span>💸</span> สรุป EMV Loss — ยอดที่ใช้คิด EMV ไม่ได้
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50 text-center">
                        <div className="text-[10px] text-gray-400 mb-1">Media Posts ทั้งหมด</div>
                        <div className="text-3xl font-black text-gray-200">{mediaTasks.length}</div>
                        <div className="text-[9px] text-gray-500 mt-0.5">โพสต์ทั้งหมดของสื่อ</div>
                    </div>
                    <div className="bg-emerald-950/40 rounded-xl p-4 border border-emerald-700/40 text-center">
                        <div className="text-[10px] text-emerald-400 mb-1">✅ ใช้คิด EMV ได้</div>
                        <div className="text-3xl font-black text-emerald-400">{mediaIncluded.length}</div>
                        <div className="text-[9px] text-emerald-600 mt-0.5">(follower=1 AND hashtags=1)</div>
                    </div>
                    <div className="bg-red-950/40 rounded-xl p-4 border border-red-700/40 text-center">
                        <div className="text-[10px] text-red-400 mb-1">❌ ใช้ไม่ได้ (Excluded)</div>
                        <div className="text-3xl font-black text-red-400">{mediaExcluded.length}</div>
                        <div className="text-[9px] text-red-600 mt-0.5">(follower=0 OR hashtags=0)</div>
                    </div>
                </div>
                {/* Impression loss */}
                <div className="bg-red-950/30 rounded-xl p-4 border border-red-700/30">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <div className="text-[10px] text-red-300 uppercase tracking-widest font-bold mb-0.5">Impressions ที่สูญเสียไป</div>
                            <div className="text-[10px] text-gray-500">(Likes+Comments+Shares+Reposts+Views+Saves ของโพสต์ที่ excluded)</div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-black text-red-400">{fmt(totalMediaImprLost)}</div>
                            <div className="text-[9px] text-gray-500">impressions ที่ใช้คิด EMV ไม่ได้</div>
                        </div>
                    </div>
                    {mediaTasks.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-red-900/50">
                            <div className="text-[10px] text-gray-500 mb-1.5">สัดส่วน Media ที่ถูก Exclude</div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full transition-all"
                                    style={{ width: `${Math.round((mediaExcluded.length / mediaTasks.length) * 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                                <span>0%</span>
                                <span className="text-red-400 font-bold">
                                    {Math.round((mediaExcluded.length / mediaTasks.length) * 100)}% excluded
                                </span>
                                <span>100%</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


// ─── EMV / MIV Section (shared) ───────────────────────────────────────────────

interface EMVSectionProps {
    title: string;
    subtitle: string;
    note: string;
    rows: PostRow[];
    setRows: React.Dispatch<React.SetStateAction<PostRow[]>>;
    cpmConfig: PlatformCPM[];
    setCpmConfig: React.Dispatch<React.SetStateAction<PlatformCPM[]>>;
    updateCPM: (key: string, field: keyof PlatformCPM, value: unknown) => void;
    updateRow: (id: string, field: keyof PostRow, value: unknown) => void;
    addPlatform: () => void;
    isMIV: boolean;
}

type ViewMode = 'all' | 'namtan' | 'media';

function EMVSection({ title, subtitle, note, rows, cpmConfig, updateCPM, updateRow, addPlatform, isMIV }: EMVSectionProps) {
    const [filterPlatform, setFilterPlatform] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('all');
    const [igSumViewMode, setIgSumViewMode] = useState<ViewMode>('all');

    // ── EMV Calculation Method ──────────────────────────────────────────
    const [calcMethod, setCalcMethod] = useState<1 | 2 | 3 | 4>(1);

    // Method 2 (was 3): per-platform per-metric rates
    const [m3Mults, setM3Mults] = useState<Record<string, Record<string, number>>>({
        instagram: { impression: 22.62, view: 0.12, like: 0.093, comment: 4.52, share: 0, repost: 0 },
        facebook: { impression: 18.48, view: 0.16, like: 0.23, comment: 3.70, share: 2.04, repost: 0 },
        x: { impression: 9.79, view: 0.093, like: 0.60, comment: 0, share: 1.93, repost: 2.83 },
        youtube: { impression: 8.71, view: 0.13, like: 1.01, comment: 9.14, share: 4.22, repost: 0 },
        tiktok: { impression: 0, view: 0.058, like: 0.093, comment: 4.52, share: 2.19, repost: 0 },
    });

    // Method 3 (was 4): IG-only estimated rates
    const [m4Mults, setM4Mults] = useState({ like: 0.01, comment: 0.10, share: 0.5, view: 0.03 });

    // Method 4: custom formula (user-defined)
    const [m4Formula, setM4Formula] = useState('likes * 0.01 + comments * 0.10 + shares * 0.5 + views * 0.03');
    const [m4FormulaError, setM4FormulaError] = useState('');

    const enabledField: keyof PlatformCPM = isMIV ? 'enabledMIV' : 'enabled';
    const enabledPlatforms = cpmConfig.filter(c => c[enabledField]);

    // Apply platform filter first, then viewMode (namtan/media) filter
    const platformFiltered = filterPlatform ? rows.filter(r => r.platform === filterPlatform) : rows;
    const filteredRows = viewMode === 'namtan'
        ? platformFiltered.filter(r => isNamtanPost(r))
        : viewMode === 'media'
            ? platformFiltered.filter(r => !isNamtanPost(r))
            : platformFiltered;

    // Counts for the tab badges
    const namtanCount = platformFiltered.filter(r => isNamtanPost(r)).length;
    const mediaCount = platformFiltered.filter(r => !isNamtanPost(r)).length;

    const toggleAll = (platform: string | null, included: boolean) => {
        const targets = platform ? rows.filter(r => r.platform === platform) : rows;
        targets.forEach(r => updateRow(r.id, 'included', included));
    };

    // --- Engagement Summary Logic ---
    // For EMV: IG only, with Namtan/Media split
    const igRows = rows.filter(r => r.platform === 'instagram' && r.included);
    const igTargetRows = igSumViewMode === 'namtan'
        ? igRows.filter(r => isNamtanPost(r))
        : igSumViewMode === 'media'
            ? igRows.filter(r => !isNamtanPost(r))
            : igRows;

    const igEng = igTargetRows.reduce((acc, row) => ({
        likes: acc.likes + (row.overrideLikes ?? row.likes),
        comments: acc.comments + (row.overrideComments ?? row.comments),
        shares: acc.shares + (row.overrideShares ?? row.shares),
        reposts: acc.reposts + (row.overrideReposts ?? row.reposts),
        views: acc.views + (row.overrideViews ?? row.views),
        saves: acc.saves + (row.overrideSaves ?? row.saves),
    }), { likes: 0, comments: 0, shares: 0, reposts: 0, views: 0, saves: 0 });
    const totalIgEng = igEng.likes + igEng.comments + igEng.shares + igEng.reposts + igEng.views + igEng.saves;

    // For MIV: all platforms with data
    const activePlatforms = [...new Set(rows.filter(r => r.included).map(r => r.platform))];
    const platformEngMap = activePlatforms.map(platform => {
        const pRows = rows.filter(r => r.platform === platform && r.included);
        const eng = pRows.reduce((acc, row) => ({
            likes: acc.likes + (row.overrideLikes ?? row.likes),
            comments: acc.comments + (row.overrideComments ?? row.comments),
            shares: acc.shares + (row.overrideShares ?? row.shares),
            reposts: acc.reposts + (row.overrideReposts ?? row.reposts),
            views: acc.views + (row.overrideViews ?? row.views),
            saves: acc.saves + (row.overrideSaves ?? row.saves),
        }), { likes: 0, comments: 0, shares: 0, reposts: 0, views: 0, saves: 0 });
        const total = eng.likes + eng.comments + eng.shares + eng.reposts + eng.views + eng.saves;
        const pc = cpmConfig.find(c => c.key === platform);
        return { platform, pc, eng, total };
    }).filter(p => p.total > 0);

    // calculate EMV dynamically based on filtered rows & selected method
    const result = useMemo(() => {
        let total = 0;
        const byPlatform: Record<string, { impressions: number; emv: number; posts: number }> = {};
        filteredRows.forEach(row => {
            if (!row.included) return;

            const likes = row.overrideLikes ?? row.likes;
            const comments = row.overrideComments ?? row.comments;
            const shares = row.overrideShares ?? row.shares;
            const reposts = row.overrideReposts ?? row.reposts;
            const views = row.overrideViews ?? row.views;
            const saves = row.overrideSaves ?? row.saves;
            const totalEng = likes + comments + shares + reposts + views + saves;

            let emv = 0;

            if (calcMethod === 1) {
                const pc = cpmConfig.find(c => c.key === row.platform);
                if (!pc || !pc[enabledField]) return;
                emv = (totalEng * pc.cpm) / 1000;
            } else if (calcMethod === 2) {
                const mults = m3Mults[row.platform];
                if (!mults) return;
                emv = (views / 1000 * (mults.impression ?? 0))
                    + (views * (mults.view ?? 0))
                    + (likes * (mults.like ?? 0))
                    + (comments * (mults.comment ?? 0))
                    + (shares * (mults.share ?? 0))
                    + (reposts * (mults.repost ?? 0));
            } else if (calcMethod === 3) {
                if (row.platform !== 'instagram') return;
                emv = (likes * m4Mults.like)
                    + (comments * m4Mults.comment)
                    + (shares * m4Mults.share)
                    + (views * m4Mults.view);
            } else if (calcMethod === 4) {
                try {
                    // eslint-disable-next-line no-new-func
                    const fn = new Function('likes', 'comments', 'shares', 'reposts', 'views', 'saves', 'totalEng', `return (${m4Formula})`);
                    emv = Number(fn(likes, comments, shares, reposts, views, saves, totalEng)) || 0;
                } catch { return; }
            }

            total += emv;
            if (!byPlatform[row.platform]) byPlatform[row.platform] = { impressions: 0, emv: 0, posts: 0 };
            byPlatform[row.platform].impressions += totalEng;
            byPlatform[row.platform].emv += emv;
            byPlatform[row.platform].posts += 1;
        });
        return { total, byPlatform };
    }, [filteredRows, cpmConfig, enabledField, calcMethod, m3Mults, m4Mults, m4Formula]);

    return (
        <div className="space-y-5">
            {/* Section Header */}
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${isMIV ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-emerald-500/20 border border-emerald-500/30'
                    }`}>
                    {isMIV ? '📈' : '💰'}
                </div>
                <div>
                    <h2 className="text-lg font-black text-white tracking-wide">{title}</h2>
                    <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-300/70">
                <span className="text-base">💡</span>
                <span>{note}</span>
            </div>

            {/* ── Method Selector ─────────────────────────────────── */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3">⚗️ เลือกวิธีคำนวณ</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-0">
                    {([
                        { id: 1 as const, label: 'Method 1', desc: '(Eng × CPM) / 1000' },
                        { id: 2 as const, label: 'Method 2', desc: 'Per-Metric Rate' },
                        { id: 3 as const, label: 'Method 3', desc: 'IG Estimated' },
                        { id: 4 as const, label: 'Method 4', desc: 'Custom Formula ✍️' },
                    ]).map(m => (
                        <button key={m.id} onClick={() => setCalcMethod(m.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${calcMethod === m.id
                                ? 'bg-rose-600/20 border-rose-500/50 text-rose-300'
                                : 'bg-gray-800/40 border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                                }`}>
                            <div className="text-xs font-black">{m.label}</div>
                            <div className="text-[10px] mt-0.5 opacity-70">{m.desc}</div>
                        </button>
                    ))}
                </div>

                {/* Method 1 note */}
                {calcMethod === 1 && (
                    <div className="mt-3 pt-3 border-t border-gray-800 text-[10px] text-gray-500">
                        สูตร: <span className="text-gray-300 font-mono">EMV = (Total Engagement × CPM) / 1000</span>
                        <span className="ml-2 text-gray-600">— ตั้งค่า CPM ด้านล่าง</span>
                    </div>
                )}

                {/* Method 2 config: per-platform per-metric rates */}
                {calcMethod === 2 && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                        <div className="text-[10px] text-gray-500 mb-3">สูตร: <span className="text-gray-300 font-mono">EMV = (Views/1k × imp) + (view×V) + (like×L) + (comment×C) + (share×S) + (repost×R)</span></div>
                        <div className="space-y-3">
                            {Object.entries(m3Mults).map(([platform, mults]) => (
                                <div key={platform} className="bg-gray-800/40 rounded-xl p-3 border border-gray-700/50">
                                    <div className="text-[10px] font-bold text-gray-200 uppercase tracking-widest mb-2 capitalize">{platform}</div>
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                        {Object.entries(mults).map(([metric, val]) => (
                                            <div key={metric} className="flex flex-col gap-1">
                                                <span className="text-[9px] text-gray-500 capitalize">{metric === 'impression' ? 'per 1k Imp' : `per ${metric}`}</span>
                                                <input type="number" step="0.001" min="0" value={val}
                                                    onChange={e => setM3Mults(p => ({ ...p, [platform]: { ...p[platform], [metric]: parseFloat(e.target.value) || 0 } }))}
                                                    className="text-right bg-gray-700/60 text-white text-xs font-bold rounded px-1.5 py-1 outline-none border border-gray-600/50 focus:border-rose-500 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Method 3 config: IG Estimated */}
                {calcMethod === 3 && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                        <div className="text-[10px] text-gray-500 mb-3">Estimated EMV สำหรับ <span className="text-pink-400 font-bold">Instagram เท่านั้น</span></div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {(Object.keys(m4Mults) as (keyof typeof m4Mults)[]).map(metric => (
                                <div key={metric} className="flex flex-col gap-1">
                                    <span className="text-[9px] text-gray-500 capitalize">per {metric}</span>
                                    <input type="number" step="0.001" min="0" value={m4Mults[metric]}
                                        onChange={e => setM4Mults(p => ({ ...p, [metric]: parseFloat(e.target.value) || 0 }))}
                                        className="text-right bg-gray-700/80 text-white text-sm font-bold rounded-lg px-2 py-1 outline-none border border-gray-600 focus:border-rose-500 transition-colors" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Method 4: Custom Formula Builder */}
                {calcMethod === 4 && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                        <div className="text-[10px] text-gray-500 mb-2">
                            เขียนสูตรของตัวเองได้เลย — ตัวแปรที่ใช้ได้:
                            {['likes', 'comments', 'shares', 'reposts', 'views', 'saves', 'totalEng'].map(v => (
                                <code key={v} className="ml-1.5 bg-gray-700/60 text-cyan-300 px-1.5 py-0.5 rounded text-[9px]">{v}</code>
                            ))}
                        </div>
                        <input
                            value={m4Formula}
                            onChange={e => {
                                setM4Formula(e.target.value);
                                try {
                                    // eslint-disable-next-line no-new-func
                                    new Function('likes', 'comments', 'shares', 'reposts', 'views', 'saves', 'totalEng', `return (${e.target.value})`);
                                    setM4FormulaError('');
                                } catch (err) { setM4FormulaError(String(err)); }
                            }}
                            placeholder="e.g. likes * 0.5 + views * 0.02"
                            className={`w-full bg-gray-800 text-white font-mono text-sm rounded-xl px-4 py-3 outline-none border transition-colors mt-2 ${m4FormulaError ? 'border-red-500/60' : 'border-gray-600 focus:border-rose-500'
                                }`}
                        />
                        {m4FormulaError
                            ? <div className="mt-1.5 text-[10px] text-red-400">{m4FormulaError}</div>
                            : m4Formula && <div className="mt-1.5 text-[10px] text-emerald-400">✓ Formula valid</div>
                        }
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                            {[
                                { label: '[ IG Estimated ]', f: 'likes * 0.01 + comments * 0.10 + shares * 0.5 + views * 0.03' },
                                { label: '[ Total Eng × 1 ]', f: 'totalEng * 1' },
                                { label: '[ Views × 0.12 + Likes × 0.09 ]', f: 'views * 0.12 + likes * 0.093' },
                            ].map(p => (
                                <button key={p.label} onClick={() => { setM4Formula(p.f); setM4FormulaError(''); }}
                                    className="text-[9px] text-gray-400 bg-gray-800/60 hover:bg-gray-700/60 hover:text-gray-200 border border-gray-700/50 rounded-lg px-3 py-2 text-left transition-colors">
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {/* ── Engagement Summary (Read-Only) ──────────────────────────────── */}
            {!isMIV ? (
                /* EMV: IG only with Namtan/Media toggle */
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">❤️ ยอด Engagement IG (ที่นำมาคำนวณ)</h3>
                        <div className="flex gap-1 bg-gray-800/60 rounded-xl p-1">
                            {([
                                { id: 'all' as ViewMode, label: 'ทั้งหมด', count: igRows.length },
                                { id: 'namtan' as ViewMode, label: '👤 ของ Namtan', count: igRows.filter(isNamtanPost).length },
                                { id: 'media' as ViewMode, label: '📰 สื่อ / Media', count: igRows.filter(r => !isNamtanPost(r)).length },
                            ]).map(tab => (
                                <button
                                    key={`igsum-${tab.id}`}
                                    onClick={() => setIgSumViewMode(tab.id)}
                                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${igSumViewMode === tab.id ? 'bg-rose-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {tab.label}
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${igSumViewMode === tab.id ? 'bg-white/20' : 'bg-gray-700 text-gray-500'}`}>{tab.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        {[
                            { key: 'likes', label: 'Likes ❤️', value: igEng.likes },
                            { key: 'comments', label: 'Comments 💬', value: igEng.comments },
                            { key: 'shares', label: 'Shares 📤', value: igEng.shares },
                            { key: 'reposts', label: 'Reposts 🔁', value: igEng.reposts },
                            { key: 'views', label: 'Views 👁️', value: igEng.views },
                            { key: 'saves', label: 'Saves 🔖', value: igEng.saves },
                        ].map(m => (
                            <div key={m.key} className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/50 flex flex-col items-center justify-center text-center">
                                <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-1 block w-full truncate">{m.label}</span>
                                <span className="text-lg font-black text-white">{fmt(m.value)}</span>
                            </div>
                        ))}
                    </div>
                    {totalIgEng > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">รวม Total Engagement</span>
                            <span className="text-xl font-black text-rose-400">{fmt(totalIgEng)}</span>
                        </div>
                    )}
                </div>
            ) : (
                /* MIV: one block per platform with data */
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">❤️ ยอด Engagement แยกตาม Platform (ที่นำมาคำนวณ)</h3>
                    {platformEngMap.map(({ platform, pc, eng, total }) => (
                        <div key={platform} className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                                    <span>{pc?.emoji || '🌐'}</span>
                                    <span>{pc?.label || platform}</span>
                                </h4>
                                <span className="text-xs text-gray-500">{fmt(rows.filter(r => r.platform === platform && r.included).length)} โพสต์</span>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {[
                                    { key: 'likes', label: 'Likes', value: eng.likes },
                                    { key: 'comments', label: 'Comments', value: eng.comments },
                                    { key: 'shares', label: 'Shares', value: eng.shares },
                                    { key: 'reposts', label: 'Reposts', value: eng.reposts },
                                    { key: 'views', label: 'Views', value: eng.views },
                                    { key: 'saves', label: 'Saves', value: eng.saves },
                                ].map(m => (
                                    <div key={m.key} className="bg-gray-800/60 rounded-lg p-2 text-center">
                                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block mb-0.5">{m.label}</span>
                                        <span className={`text-sm font-black ${m.value > 0 ? 'text-white' : 'text-gray-700'}`}>{fmt(m.value)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider">รวม Total Engagement</span>
                                <span className="text-base font-black text-rose-400">{fmt(total)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── CPM Config — Method 1 only ──────────────────────────────── */}
            {calcMethod === 1 && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">⚙️ ตั้งค่า CPM ต่อ Platform</h3>
                        <button
                            onClick={addPlatform}
                            className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            + เพิ่ม Platform
                        </button>
                    </div>
                    <div className="space-y-2">
                        {cpmConfig.map(pc => (
                            <div key={pc.key} className="flex items-center gap-3 bg-gray-800/50 rounded-xl px-4 py-2.5 border border-gray-700/50">
                                {/* Enable toggle */}
                                <button
                                    onClick={() => updateCPM(pc.key, enabledField, !pc[enabledField])}
                                    className={`w-8 h-5 rounded-full transition-all flex-shrink-0 relative ${pc[enabledField] ? 'bg-rose-600' : 'bg-gray-700'}`}
                                >
                                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${pc[enabledField] ? 'left-3.5' : 'left-0.5'}`} />
                                </button>

                                {/* Emoji + Name */}
                                <span className="text-lg flex-shrink-0">{pc.emoji}</span>
                                <input
                                    className="w-28 bg-transparent text-sm font-semibold text-gray-200 outline-none border-b border-gray-700 focus:border-rose-500 transition-colors"
                                    value={pc.label}
                                    onChange={e => updateCPM(pc.key, 'label', e.target.value)}
                                />

                                {/* CPM input */}
                                <div className="flex-1 flex items-center gap-2 justify-end">
                                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">CPM</span>
                                    <span className="text-gray-600 text-sm">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={pc.cpm}
                                        onChange={e => updateCPM(pc.key, 'cpm', parseFloat(e.target.value) || 0)}
                                        className="w-24 text-right bg-gray-700/80 text-white text-sm font-bold rounded-lg px-2 py-1 outline-none border border-gray-600 focus:border-rose-500 transition-colors"
                                    />
                                    <span className="text-[10px] text-gray-600">/ 1k</span>
                                </div>

                                {/* EMV result for this platform */}
                                {result.byPlatform[pc.key] && (
                                    <span className="text-xs font-bold text-emerald-400 flex-shrink-0 min-w-[80px] text-right">
                                        {fmtUSD(result.byPlatform[pc.key].emv)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )} {/* end calcMethod===1 CPM config */}

            {/* ── Result Summary ────────────────────────────────────────────── */}
            <div className={`rounded-2xl border overflow-hidden ${isMIV ? 'border-blue-700/30 bg-gradient-to-br from-blue-950/40 to-gray-900' : 'border-emerald-700/30 bg-gradient-to-br from-emerald-950/40 to-gray-900'
                }`}>
                <div className="p-5">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total {isMIV ? 'MIV' : 'EMV'}</div>
                    <div className={`text-5xl font-black tabular-nums mb-1 ${isMIV ? 'text-blue-400' : 'text-emerald-400'}`}>
                        {fmtUSD(result.total)}
                    </div>
                    <div className="text-[10px] text-gray-600 mb-5">
                        {fmt(filteredRows.filter(r => r.included).length)} โพสต์ที่นับ จาก {fmt(filteredRows.length)} (ตามฟิลเตอร์)
                    </div>

                    <div className="space-y-2">
                        {(calcMethod === 1 ? enabledPlatforms.map(pc => ({ key: pc.key, label: pc.label, emoji: pc.emoji, d: result.byPlatform[pc.key] })) : Object.entries(result.byPlatform).map(([key, d]) => { const pc = cpmConfig.find(c => c.key === key); return { key, label: pc?.label ?? key, emoji: pc?.emoji ?? '🌐', d }; })).map(({ key, label, emoji, d }) => {
                            const pct = result.total > 0 && d ? (d.emv / result.total) * 100 : 0;
                            return (
                                <div key={key} className="bg-gray-800/50 rounded-xl px-3 py-2.5">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-base">{emoji}</span>
                                        <span className="text-xs text-gray-300 flex-1 font-medium">{label}</span>
                                        {d && <span className="text-[10px] text-gray-500">{fmt(d.impressions)} impr.</span>}
                                        <span className={`text-xs font-black min-w-[72px] text-right ${isMIV ? 'text-blue-400' : 'text-emerald-400'}`}>{d ? fmtUSD(d.emv) : '$0.00'}</span>
                                    </div>
                                    {d && pct > 0 && (
                                        <div className="h-1 bg-gray-700/60 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${isMIV ? 'bg-blue-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Post List ─────────────────────────────────────────────────── */}
            <div className="bg-gray-900/80 rounded-2xl border border-gray-800/80 p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">📋 รายการโพสต์</h3>
                        <span className="text-[9px] bg-gray-700/60 text-gray-400 px-2 py-0.5 rounded-full">{fmt(rows.length)} รายการ</span>
                    </div>
                </div>

                {/* ── View Mode: All / Namtan / Media ────────────────────── */}
                <div className="flex gap-1 mb-3 p-1 bg-gray-800/40 rounded-xl border border-gray-700/40">
                    {([
                        { id: 'all' as ViewMode, label: 'ทั้งหมด', count: platformFiltered.length },
                        { id: 'namtan' as ViewMode, label: '👤 Namtan', count: namtanCount },
                        { id: 'media' as ViewMode, label: '📰 สื่อ', count: mediaCount },
                    ]).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setViewMode(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === tab.id
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/40'
                                }`}
                        >
                            {tab.label}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${viewMode === tab.id ? 'bg-white/20' : 'bg-gray-700 text-gray-600'}`}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* Platform filter */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                    <button
                        onClick={() => setFilterPlatform(null)}
                        className={`px-3 h-6 rounded-full text-[10px] font-bold border transition-colors ${!filterPlatform ? 'bg-rose-600 border-rose-600 text-white' : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-500'}`}
                    >
                        All Platform
                    </button>
                    {[...new Set(rows.map(r => r.platform))].map(p => {
                        const pc = cpmConfig.find(c => c.key === p);
                        return (
                            <button
                                key={p}
                                onClick={() => setFilterPlatform(filterPlatform === p ? null : p)}
                                className={`px-3 h-6 rounded-full text-[10px] font-bold border transition-colors ${filterPlatform === p ? 'bg-rose-600 border-rose-600 text-white' : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-500'}`}
                            >
                                {pc?.emoji || ''} {pc?.label || p}
                            </button>
                        );
                    })}
                </div>

                {/* Toggle all buttons */}
                <div className="flex gap-2 mb-3">
                    <button
                        onClick={() => toggleAll(filterPlatform, true)}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/60 transition-colors"
                    >
                        ✓ เลือกทั้งหมด
                    </button>
                    <button
                        onClick={() => toggleAll(filterPlatform, false)}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 transition-colors"
                    >
                        ✕ ยกเลิกทั้งหมด
                    </button>
                </div>

                {/* Rows */}
                <div key={`${viewMode}-${filterPlatform ?? 'all'}`} className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                    {filteredRows.map(row => {
                        const pc = cpmConfig.find(c => c.key === row.platform);
                        const impressions = (row.overrideLikes ?? row.likes)
                            + (row.overrideComments ?? row.comments)
                            + (row.overrideShares ?? row.shares)
                            + (row.overrideReposts ?? row.reposts)
                            + (row.overrideViews ?? row.views)
                            + (row.overrideSaves ?? row.saves);
                        const rowEMV = pc && pc[enabledField] && pc.cpm > 0 ? (impressions * pc.cpm) / 1000 : 0;
                        return (
                            <PostRowItem
                                key={row.id}
                                row={row}
                                pc={pc}
                                impressions={impressions}
                                rowEMV={rowEMV}
                                onToggle={(v) => updateRow(row.id, 'included', v)}
                                onEdit={(field, value) => updateRow(row.id, field, value)}
                                isMIV={isMIV}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Post Row Item ─────────────────────────────────────────────────────────────
function PostRowItem({
    row, pc, impressions, rowEMV, onToggle, onEdit, isMIV
}: {
    row: PostRow;
    pc: PlatformCPM | undefined;
    impressions: number;
    rowEMV: number;
    onToggle: (v: boolean) => void;
    onEdit: (field: keyof PostRow, value: unknown) => void;
    isMIV: boolean;
}) {
    const enabledOnPlatform = pc && pc[isMIV ? 'enabledMIV' : 'enabled'];
    const [expandEdit, setExpandEdit] = useState(false);

    const metrics: { key: 'overrideLikes' | 'overrideComments' | 'overrideShares' | 'overrideReposts' | 'overrideViews' | 'overrideSaves'; base: keyof PostRow; label: string }[] = [
        { key: 'overrideLikes', base: 'likes', label: '❤️ Likes' },
        { key: 'overrideComments', base: 'comments', label: '💬 Comments' },
        { key: 'overrideShares', base: 'shares', label: '📤 Shares' },
        { key: 'overrideReposts', base: 'reposts', label: '🔁 Reposts' },
        { key: 'overrideViews', base: 'views', label: '👁️ Views' },
        { key: 'overrideSaves', base: 'saves', label: '🔖 Saves' },
    ];

    return (
        <div className={`rounded-xl border transition-all ${row.included && enabledOnPlatform ? 'border-gray-700 bg-gray-800/40' : 'border-gray-800/50 bg-gray-900/30 opacity-50'}`}>
            <div className="flex items-center gap-2 px-3 py-2">
                {/* Checkbox */}
                <button
                    onClick={() => onToggle(!row.included)}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${row.included ? 'bg-rose-600 border-rose-600' : 'bg-transparent border-gray-600 hover:border-gray-400'}`}
                >
                    {row.included && <span className="text-[8px] text-white font-bold">✓</span>}
                </button>

                {/* Platform badge */}
                <span className="text-xs flex-shrink-0">{pc?.emoji || '🌐'}</span>

                {/* Title & Warning */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <a href={row.url} target="_blank" rel="noreferrer" className="text-[11px] text-gray-300 hover:text-rose-400 hover:underline truncate leading-tight block">
                        {row.title || row.url}
                    </a>
                    {row.isMedia && (row.hashtagsFlag !== 1 || row.followerFlag !== 1) && (
                        <span className="text-[9px] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded border border-red-700/50 flex-shrink-0 whitespace-nowrap" title="ไม่นำมาคำนวณเพราะ hashtags หรือ follower ไม่เป็น 1">
                            🚫 Excluded (Flag=0)
                        </span>
                    )}
                    {!enabledOnPlatform && <span className="text-[9px] text-amber-600 flex-shrink-0">Platform ปิด</span>}
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-3 ml-auto flex-shrink-0">
                    {/* Impressions */}
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Impressions</span>
                        <span className="text-xs font-bold text-gray-300">{fmt(impressions)}</span>
                    </div>

                    {/* EMV */}
                    {rowEMV > 0 && (
                        <div className="flex flex-col items-end min-w-[70px]">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{isMIV ? 'MIV' : 'EMV'}</span>
                            <span className="text-xs font-black text-emerald-400">{fmtUSD(rowEMV)}</span>
                        </div>
                    )}
                </div>

                {/* Edit expand */}
                <button
                    onClick={() => setExpandEdit(!expandEdit)}
                    className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-400 p-1.5 rounded transition-colors ml-2"
                    title="แก้ไขตัวเลข"
                >
                    ✏️
                </button>
            </div>

            {/* Expandable edit */}
            {expandEdit && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-800/60">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {metrics.map(m => {
                            const baseVal = row[m.base] as number;
                            const overrideVal = row[m.key];
                            return (
                                <div key={m.key} className="bg-gray-800/60 rounded-lg px-2 py-2">
                                    <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">{m.label}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder={String(baseVal)}
                                        value={overrideVal ?? ''}
                                        onChange={e => {
                                            const v = e.target.value === '' ? undefined : parseInt(e.target.value) || 0;
                                            onEdit(m.key, v);
                                        }}
                                        className="w-full bg-gray-700 text-white text-xs font-bold rounded px-2 py-1 outline-none border border-gray-600 focus:border-rose-500"
                                    />
                                    {overrideVal !== undefined && overrideVal !== baseVal && (
                                        <button
                                            onClick={() => onEdit(m.key, undefined)}
                                            className="text-[8px] text-amber-500 mt-0.5 hover:text-amber-300"
                                        >
                                            รีเซ็ต ({fmt(baseVal)})
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
