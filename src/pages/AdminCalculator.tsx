import { useState, useEffect, useCallback, useMemo } from 'react';

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
    return row.title.toLowerCase().includes('namtan');
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
            <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="text-4xl mb-4 animate-spin">⚙️</div>
                    <p className="text-gray-400 text-sm tracking-widest uppercase">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    const tabs: { id: ActiveSection; label: string; emoji: string }[] = [
        { id: 'ig', label: 'Dashboard', emoji: '📊' },
        { id: 'emv', label: 'EMV', emoji: '💰' },
        { id: 'miv', label: 'MIV', emoji: '📊' },
    ];


    return (
        <div className="min-h-screen bg-gray-950 text-gray-100" style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
            {/* Top Bar */}
            <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { window.location.hash = ''; window.location.reload(); }}
                            className="text-gray-500 hover:text-gray-300 transition-colors text-sm flex items-center gap-1.5"
                        >
                            ← หน้าหลัก
                        </button>
                        <div className="w-px h-4 bg-gray-700" />
                        <h1 className="text-sm font-bold text-gray-200 tracking-wider">
                            🔒 Admin Dashboard
                        </h1>
                        <span className="text-[10px] bg-rose-900/60 text-rose-300 border border-rose-700/40 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Private</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {lastUpdated && <span className="text-[10px] text-gray-600">อัปเดต {lastUpdated}</span>}
                        <button
                            onClick={fetchData}
                            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 transition-colors flex items-center gap-1.5"
                        >
                            🔄 รีเฟรช
                        </button>
                    </div>
                </div>

                {/* Section Tabs */}
                <div className="max-w-5xl mx-auto px-4 pb-0">
                    <div className="flex gap-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSection(tab.id)}
                                className={`px-5 py-2.5 text-xs font-bold tracking-wider transition-all border-b-2 ${activeSection === tab.id
                                    ? 'text-white border-rose-500 bg-gray-800/60'
                                    : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-gray-600'
                                    }`}
                            >
                                {tab.emoji} {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">

                {/* ================================================================= */}
                {/* PART 1 – IG ACCOUNT SUMMARY                                        */}
                {/* ================================================================= */}
                {activeSection === 'ig' && (() => {
                    // Hardcoded IG follower data (source: instrack.app/instagram/namtan.tipnaree)
                    const followersBefore = 2817680;
                    const followersNow = 2827236;
                    const followerGain = followersNow - followersBefore;
                    const followerPct = ((followerGain) / followersBefore) * 100;

                    // Helper: sum engagement for a set of tasks
                    const sumEng = (tasks: SheetTask[]) => tasks.reduce((acc, t) => ({
                        likes: acc.likes + t.likes,
                        comments: acc.comments + t.comments,
                        shares: acc.shares + t.shares,
                        reposts: acc.reposts + t.reposts,
                        views: acc.views + t.views,
                        saves: acc.saves + t.saves,
                    }), { likes: 0, comments: 0, shares: 0, reposts: 0, views: 0, saves: 0 });
                    const totalEng = (e: ReturnType<typeof sumEng>) => e.likes + e.comments + e.shares + e.reposts + e.views + e.saves;

                    const namtanTasks = allTasks.filter(t => isNamtanPost(t));
                    const mediaTasks = allTasks.filter(t => !isNamtanPost(t));

                    // Platform groups
                    const platformGroups: { title: string; emoji: string; platforms: string[] }[] = [
                        { title: 'Instagram', emoji: '📸', platforms: ['instagram'] },
                        { title: 'X (Twitter)', emoji: '🐦', platforms: ['x'] },
                        { title: 'TikTok', emoji: '🎵', platforms: ['tiktok'] },
                        { title: 'Facebook', emoji: '👥', platforms: ['facebook'] },
                        { title: 'อื่นๆ (YouTube / Threads / Weibo / RED)', emoji: '🌐', platforms: ['youtube', 'threads', 'weibo', 'red'] },
                    ];

                    const EngRow = ({ label, tasks }: { label: string; tasks: SheetTask[] }) => {
                        const e = sumEng(tasks);
                        const total = totalEng(e);
                        if (total === 0 && tasks.length === 0) return null;
                        return (
                            <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-gray-300">{label}</span>
                                    <span className="text-[10px] text-gray-500">{fmt(tasks.length)} โพสต์</span>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                                    {([
                                        { k: 'likes', label: 'Likes', v: e.likes },
                                        { k: 'comments', label: 'Comments', v: e.comments },
                                        { k: 'shares', label: 'Shares', v: e.shares },
                                        { k: 'reposts', label: 'Reposts', v: e.reposts },
                                        { k: 'views', label: 'Views', v: e.views },
                                        { k: 'saves', label: 'Saves', v: e.saves },
                                    ]).map(m => (
                                        <div key={m.k} className="text-center">
                                            <div className="text-[8px] text-gray-600 uppercase tracking-wider mb-0.5">{m.label}</div>
                                            <div className={`text-xs font-black ${m.v > 0 ? 'text-white' : 'text-gray-700'}`}>{fmt(m.v)}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Total Engagement</span>
                                    <span className="text-sm font-black text-rose-400">{fmt(total)}</span>
                                </div>
                            </div>
                        );
                    };

                    return (
                        <div className="space-y-6">
                            <SectionHeader emoji="📊" title="Overall Dashboard" subtitle="ข้อมูลระหว่างวันที่ 24 กพ - 4 มีค — ทุก Platform รวมกัน (Read-Only)" />

                            {/* ── Follower Stats ─────────────────────────────────── */}
                            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">👥 ยอดฟอลโลเวอร์ IG (@namtanreal)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50 text-center">
                                        <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">ก่อนออกอีเวนต์ (22 Feb)</span>
                                        <span className="text-2xl font-black text-gray-200">{fmt(followersBefore)}</span>
                                    </div>
                                    <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50 text-center">
                                        <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">ปัจจุบัน</span>
                                        <span className="text-2xl font-black text-white">{fmt(followersNow)}</span>
                                        <a href="https://instrack.app/instagram/namtan.tipnaree" target="_blank" rel="noreferrer" className="text-[9px] text-rose-400 hover:underline block mt-1">instrack.app ↗</a>
                                    </div>
                                    <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50 text-center flex flex-col justify-center items-center">
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">เพิ่มขึ้น</span>
                                        <span className={`text-3xl font-black ${followerPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {followerPct >= 0 ? '+' : ''}{followerPct.toFixed(2)}%
                                        </span>
                                        <span className="text-xs text-gray-500 mt-1">+{fmt(followerGain)} คน</span>
                                    </div>
                                </div>
                            </div>

                            {/* ── Combined All Platforms ─────────────────────────── */}
                            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">🌐 ยอด Engagement รวมทุก Platform</h3>
                                <div className="space-y-3">
                                    <EngRow label="👤 ของ Namtan (ทุก Platform)" tasks={namtanTasks} />
                                    <EngRow label="📰 สื่อทั้งหมด (ทุก Platform)" tasks={mediaTasks} />
                                </div>
                            </div>

                            {/* ── Per-Platform Sections ─────────────────────────── */}
                            {platformGroups.map(group => {
                                const groupNamtan = namtanTasks.filter(t => group.platforms.includes(t.platform));
                                const groupMedia = mediaTasks.filter(t => group.platforms.includes(t.platform));
                                const hasData = (groupNamtan.length + groupMedia.length) > 0;
                                if (!hasData) return null;
                                return (
                                    <div key={group.title} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                                            {group.emoji} ยอด Engagement — {group.title}
                                        </h3>
                                        <div className="space-y-3">
                                            {groupNamtan.length > 0 && <EngRow label="👤 ของ Namtan" tasks={groupNamtan} />}
                                            {groupMedia.length > 0 && <EngRow label="📰 สื่อทั้งหมด" tasks={groupMedia} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}

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
        </div>
    );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SectionHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="text-3xl">{emoji}</div>
            <div>
                <h2 className="text-lg font-black text-white tracking-wide">{title}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
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

    // calculate EMV dynamically based on filtered rows
    const result = useMemo(() => {
        let total = 0;
        const byPlatform: Record<string, { impressions: number; emv: number; posts: number }> = {};
        filteredRows.forEach(row => {
            if (!row.included) return;
            const pc = cpmConfig.find(c => c.key === row.platform);
            if (!pc || !pc[enabledField]) return;
            const eff = (row.overrideLikes ?? row.likes)
                + (row.overrideComments ?? row.comments)
                + (row.overrideShares ?? row.shares)
                + (row.overrideReposts ?? row.reposts)
                + (row.overrideViews ?? row.views)
                + (row.overrideSaves ?? row.saves);
            const emv = (eff * pc.cpm) / 1000;
            total += emv;
            if (!byPlatform[row.platform]) byPlatform[row.platform] = { impressions: 0, emv: 0, posts: 0 };
            byPlatform[row.platform].impressions += eff;
            byPlatform[row.platform].emv += emv;
            byPlatform[row.platform].posts += 1;
        });
        return { total, byPlatform };
    }, [filteredRows, cpmConfig, enabledField]);

    return (
        <div className="space-y-6">
            <SectionHeader emoji={isMIV ? '📊' : '💰'} title={title} subtitle={subtitle} />
            <div className="bg-amber-950/20 border border-amber-700/30 rounded-xl px-4 py-3 text-xs text-amber-300/80">
                💡 {note}
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

            {/* ── CPM Config ───────────────────────────────────────────────── */}
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

            {/* ── Result Summary ────────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800/60 rounded-2xl border border-gray-700 p-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">📈 ผลการคำนวณ</h3>

                {/* Total */}
                <div className="text-center py-4 border-b border-gray-800 mb-4">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Total {isMIV ? 'MIV' : 'EMV'}</p>
                    <p className="text-4xl font-black text-emerald-400">{fmtUSD(result.total)}</p>
                    <p className="text-xs text-gray-600 mt-1">{fmt(filteredRows.filter(r => r.included).length)} โพสต์ที่นับ จาก {fmt(filteredRows.length)} ทั้งหมด (ตามฟิลเตอร์ปัจจุบัน)</p>
                </div>

                {/* By Platform */}
                <div className="space-y-2">
                    {enabledPlatforms.map(pc => {
                        const d = result.byPlatform[pc.key];
                        if (!d) return null;
                        return (
                            <div key={pc.key} className="flex items-center gap-3">
                                <span className="text-base">{pc.emoji}</span>
                                <span className="text-xs text-gray-400 flex-1">{pc.label}</span>
                                <span className="text-[10px] text-gray-600">{fmt(d.impressions)} impr.</span>
                                <span className="text-xs font-bold text-emerald-400 min-w-[80px] text-right">{fmtUSD(d.emv)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Post List ─────────────────────────────────────────────────── */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">📋 รายการโพสต์ ({fmt(rows.length)})</h3>
                </div>

                {/* ── View Mode: All / Namtan / Media ────────────────────── */}
                <div className="flex gap-1 mb-3 bg-gray-800/60 rounded-xl p-1">
                    {([
                        { id: 'all' as ViewMode, label: 'ทั้งหมด', count: platformFiltered.length },
                        { id: 'namtan' as ViewMode, label: '👤 ของ Namtan', count: namtanCount },
                        { id: 'media' as ViewMode, label: '📰 สื่อ / Media', count: mediaCount },
                    ]).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setViewMode(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === tab.id
                                ? 'bg-rose-600 text-white shadow'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            {tab.label}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${viewMode === tab.id ? 'bg-white/20' : 'bg-gray-700 text-gray-500'
                                }`}>{tab.count}</span>
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
