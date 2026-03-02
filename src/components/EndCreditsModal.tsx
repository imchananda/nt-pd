import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const CREDITS_GID = '1046968352';

interface CreditEntry {
    nickname: string;
}

function parseCSVRow(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCSVCredits(text: string): CreditEntry[] {
    const lines = text.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase());
    const nameIdx = (() => {
        const idx = headers.findIndex(h =>
            h.includes('nickname') || h.includes('name') || h.includes('ชื่อ')
        );
        return idx >= 0 ? idx : 1;
    })();
    const entries: CreditEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVRow(lines[i]);
        const nickname = (cols[nameIdx] || '').trim();
        if (nickname) entries.push({ nickname });
    }
    return entries;
}

interface EndCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/* ── Stable star layers ── */
const STARS_FAR = Array.from({ length: 120 }, (_, i) => ({
    id: i,
    left: `${(i * 1.618 * 11.3) % 100}%`,
    top: `${(i * 1.618 * 7.7) % 100}%`,
    size: 1,
    opacity: 0.15 + (i % 6) * 0.07,
    dur: `${3 + (i % 5)}s`,
    delay: `${(i % 9) * 0.5}s`,
}));

const STARS_NEAR = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: `${(i * 2.718 * 13.1) % 100}%`,
    top: `${(i * 2.718 * 9.3) % 100}%`,
    size: i % 5 === 0 ? 3 : 2,
    opacity: 0.35 + (i % 4) * 0.12,
    dur: `${2 + (i % 4)}s`,
    delay: `${(i % 7) * 0.4}s`,
}));

export default function EndCreditsModal({ isOpen, onClose }: EndCreditsModalProps) {
    const { language } = useLanguage();
    const [entries, setEntries] = useState<CreditEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchCredits = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/sheet?gid=${CREDITS_GID}`);
            if (!res.ok) throw new Error();
            const text = await res.text();
            setEntries(parseCSVCredits(text));
        } catch {
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) fetchCredits();
    }, [isOpen, fetchCredits]);

    /* JS-driven scroll — reliable on iOS Safari */
    useEffect(() => {
        if (!isOpen || loading) return;
        let el: HTMLElement | null = null;
        const init = () => {
            el = document.getElementById('end-credits-scroller');
            if (!el) return;
            let offset = 0;
            const startY = window.innerHeight;
            let rafId: number;
            const speed = 90;
            let lastTime: number | null = null;
            let paused = false;

            const step = (timestamp: number) => {
                if (lastTime === null) {
                    lastTime = timestamp;
                } else {
                    // Cap delta to 100ms — prevents giant jump when tab is backgrounded/throttled
                    const delta = Math.min((timestamp - lastTime) / 1000, 0.1);
                    lastTime = timestamp;
                    if (!paused && el) {
                        offset += speed * delta;
                        const half = el.scrollHeight / 2;
                        if (half > 0 && offset >= half + startY) offset -= half;
                        el.style.transform = `translateY(${startY - offset}px) translateZ(0)`;
                    }
                }
                rafId = requestAnimationFrame(step);
            };

            // Reset lastTime when tab becomes visible again to avoid stale delta
            const onVisibilityChange = () => {
                if (document.visibilityState === 'visible') lastTime = null;
            };

            const pause = () => { paused = true; };
            const resume = () => { paused = false; lastTime = null; };
            el.addEventListener('touchstart', pause, { passive: true });
            el.addEventListener('touchend', resume, { passive: true });
            el.addEventListener('mouseenter', pause);
            el.addEventListener('mouseleave', resume);
            document.addEventListener('visibilitychange', onVisibilityChange);
            rafId = requestAnimationFrame(step);
            return () => {
                cancelAnimationFrame(rafId);
                document.removeEventListener('visibilitychange', onVisibilityChange);
                if (el) {
                    el.removeEventListener('touchstart', pause);
                    el.removeEventListener('touchend', resume);
                    el.removeEventListener('mouseenter', pause);
                    el.removeEventListener('mouseleave', resume);
                }
            };
        };
        const timer = setTimeout(() => {
            const cleanup = init();
            (window as any).__creditsCleanup = cleanup;
        }, 100);
        return () => {
            clearTimeout(timer);
            const cleanup = (window as any).__creditsCleanup;
            if (cleanup) cleanup();
        };
    }, [isOpen, loading]);

    if (!isOpen) return null;

    const creditsContent = (
        <div className="flex flex-col items-center px-6 w-full">

            {/* ── Hero title ── */}
            <div className="mb-24 text-center">
                {/* Glow ring */}
                <div className="relative inline-flex items-center justify-center mb-8">
                    <div className="absolute w-32 h-32 rounded-full blur-3xl opacity-40"
                        style={{ background: 'radial-gradient(circle, #B8986E 0%, transparent 70%)' }} />
                    <div className="relative font-bold select-none"
                        style={{
                            fontSize: '5rem',
                            color: '#B8986E',
                            filter: 'drop-shadow(0 0 24px rgba(184,152,110,0.9))',
                            lineHeight: 1,
                        }}>
                        ✦
                    </div>
                </div>

                <p className="text-xs uppercase tracking-[0.5em] mb-5 font-light"
                    style={{ color: '#B8986E', letterSpacing: '0.5em' }}>
                    {language === 'th' ? 'นำเสนอโดย' : 'Presented by'}
                </p>

                <h1 className="font-bold mb-3 drop-shadow-2xl"
                    style={{
                        fontSize: 'clamp(1.6rem, 6vw, 2.8rem)',
                        letterSpacing: '0.18em',
                        background: 'linear-gradient(135deg, #fff 0%, #B8986E 50%, #fff 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                    NAMTAN TIPNAREE
                </h1>

                <p className="text-4xl font-extralight mb-3" style={{ color: '#B8986E' }}>×</p>

                <h2 className="font-bold drop-shadow-2xl"
                    style={{
                        fontSize: 'clamp(1.6rem, 6vw, 2.8rem)',
                        letterSpacing: '0.25em',
                        background: 'linear-gradient(135deg, #fff 0%, #B8986E 50%, #fff 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                    PRADA FW26
                </h2>
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-4 mb-24 w-48">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #B8986E)' }} />
                <div className="w-1 h-1 rounded-full" style={{ background: '#B8986E' }} />
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #B8986E)' }} />
            </div>

            {/* ── Thank you title ── */}
            <div className="text-center mb-16">
                <p className="text-sm uppercase mb-4 font-light" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.4em' }}>
                    {language === 'th' ? 'ขอบคุณผู้สนับสนุนทุกท่าน' : 'With Deepest Gratitude To'}
                </p>
                <h2 className="font-bold mb-3" style={{
                    fontSize: 'clamp(1.2rem, 4vw, 1.6rem)',
                    letterSpacing: '0.3em',
                    background: 'linear-gradient(135deg, #B8986E, #D4C8B8, #B8986E)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}>
                    MISSION SUPPORTERS
                </h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
                    {language === 'th' ? 'ผู้ที่ทำ Mission ครบทุกภารกิจ 💖' : 'Those who completed every mission 💖'}
                </p>
            </div>

            {/* ── Names ── */}
            {loading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                    <div className="w-8 h-8 rounded-full animate-spin"
                        style={{ border: '2px solid transparent', borderTopColor: '#B8986E', borderRightColor: '#B8986E40' }} />
                </div>
            ) : entries.length === 0 ? (
                <p className="text-sm italic py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {language === 'th' ? 'ยังไม่มีชื่อ — เป็นคนแรกได้เลย! ✨' : 'No names yet — be the first! ✨'}
                </p>
            ) : (
                <div className="flex flex-col items-center gap-10 w-full max-w-xs">
                    {entries.map((entry, idx) => (
                        <div key={idx} className="text-center relative">
                            {/* Subtle glow behind each name */}
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 blur-xl opacity-20 rounded-full"
                                style={{ background: '#B8986E' }} />
                            <p className="relative font-semibold tracking-widest drop-shadow-lg"
                                style={{
                                    fontSize: '1.1rem',
                                    color: idx % 3 === 0 ? '#B8986E' : idx % 3 === 1 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
                                    letterSpacing: '0.1em',
                                }}>
                                {entry.nickname}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Thank you collage ── */}
            <div className="mt-28 mb-16 text-center">
                <div className="flex items-center gap-4 mb-12 w-48 mx-auto">
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #B8986E40)' }} />
                    <div className="w-1 h-1 rounded-full" style={{ background: '#B8986E80' }} />
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #B8986E40)' }} />
                </div>

                <div className="flex flex-wrap justify-center items-baseline gap-x-4 gap-y-3 px-4 max-w-xs mx-auto">
                    {[
                        { text: 'ขอบคุณ', big: true, gold: true },
                        { text: 'Thank you', big: false, gold: false },
                        { text: 'ありがとう', big: true, gold: false },
                        { text: '감사합니다', big: false, gold: true },
                        { text: '谢谢你', big: true, gold: false },
                        { text: 'Gracias', big: false, gold: true },
                        { text: 'Merci', big: true, gold: false },
                        { text: 'Danke', big: false, gold: false },
                        { text: 'Terima kasih', big: true, gold: true },
                        { text: 'Obrigada', big: false, gold: false },
                        { text: 'Dziękuję', big: true, gold: false },
                        { text: 'Salamat', big: false, gold: true },
                        { text: 'Cảm ơn', big: true, gold: true },
                        { text: '사랑해', big: true, gold: false },
                    ].map(({ text, big, gold }, i) => (
                        <span key={i} className="font-bold leading-tight drop-shadow-md"
                            style={{
                                fontSize: big ? '1.5rem' : '0.9rem',
                                color: gold ? '#B8986E' : 'rgba(255,255,255,0.85)',
                            }}>
                            {text}
                        </span>
                    ))}
                </div>

                <div className="mt-10 text-5xl drop-shadow-2xl"
                    style={{ filter: 'drop-shadow(0 0 16px rgba(255,100,150,0.6))' }}>
                    💖
                </div>

                <div className="flex items-center gap-4 mt-10 w-48 mx-auto">
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #B8986E40)' }} />
                    <div className="w-1 h-1 rounded-full" style={{ background: '#B8986E80' }} />
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #B8986E40)' }} />
                </div>
            </div>

            <div className="h-screen" />
        </div>
    );

    return (
        <>
            {/* Inject nebula keyframes */}
            <style>{`
                @keyframes nebula-pulse {
                    0%, 100% { opacity: 0.06; transform: scale(1); }
                    50%      { opacity: 0.12; transform: scale(1.08); }
                }
                @keyframes star-twinkle {
                    0%, 100% { opacity: var(--op); }
                    50%      { opacity: calc(var(--op) * 0.3); }
                }
            `}</style>

            <div
                className="fixed inset-0 z-[120] flex flex-col overflow-hidden"
                style={{ background: 'radial-gradient(ellipse at 50% 30%, #0a0520 0%, #020008 60%, #000 100%)' }}
                onClick={onClose}
            >
                {/* ── Deep nebula glow blobs ── */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute rounded-full blur-3xl"
                        style={{
                            width: '70vw', height: '60vw',
                            top: '-10%', left: '-20%',
                            background: 'radial-gradient(circle, rgba(80,40,180,0.5) 0%, transparent 70%)',
                            animation: 'nebula-pulse 8s ease-in-out infinite',
                        }} />
                    <div className="absolute rounded-full blur-3xl"
                        style={{
                            width: '60vw', height: '50vw',
                            top: '30%', right: '-20%',
                            background: 'radial-gradient(circle, rgba(120,0,80,0.4) 0%, transparent 70%)',
                            animation: 'nebula-pulse 11s ease-in-out infinite',
                            animationDelay: '3s',
                        }} />
                    <div className="absolute rounded-full blur-3xl"
                        style={{
                            width: '50vw', height: '40vw',
                            bottom: '10%', left: '20%',
                            background: 'radial-gradient(circle, rgba(0,60,140,0.35) 0%, transparent 70%)',
                            animation: 'nebula-pulse 9s ease-in-out infinite',
                            animationDelay: '5s',
                        }} />
                </div>

                {/* ── Far star layer (tiny, dim) ── */}
                <div className="absolute inset-0 pointer-events-none">
                    {STARS_FAR.map(s => (
                        <div key={s.id} className="absolute rounded-full bg-white"
                            style={{
                                width: s.size,
                                height: s.size,
                                left: s.left,
                                top: s.top,
                                ['--op' as any]: s.opacity,
                                opacity: s.opacity,
                                animation: `star-twinkle ${s.dur} ease-in-out infinite ${s.delay}`,
                            }} />
                    ))}
                </div>

                {/* ── Near star layer (bigger, brighter) ── */}
                <div className="absolute inset-0 pointer-events-none">
                    {STARS_NEAR.map(s => (
                        <div key={s.id} className="absolute rounded-full"
                            style={{
                                width: s.size,
                                height: s.size,
                                left: s.left,
                                top: s.top,
                                background: s.id % 8 === 0 ? '#ffeebb' : s.id % 5 === 0 ? '#bbddff' : 'white',
                                ['--op' as any]: s.opacity,
                                opacity: s.opacity,
                                animation: `star-twinkle ${s.dur} ease-in-out infinite ${s.delay}`,
                                boxShadow: s.size === 3 ? `0 0 4px 1px rgba(255,255,255,0.4)` : 'none',
                            }} />
                    ))}
                </div>

                {/* Top & bottom fade */}
                <div className="absolute top-0 left-0 right-0 h-32 z-20 pointer-events-none"
                    style={{ background: 'linear-gradient(to bottom, #020008, transparent)' }} />
                <div className="absolute bottom-0 left-0 right-0 h-32 z-20 pointer-events-none"
                    style={{ background: 'linear-gradient(to top, #020008, transparent)' }} />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-30 px-4 py-1.5 rounded-full text-xs transition-all"
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: 'rgba(255,255,255,0.4)',
                        backdropFilter: 'blur(8px)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                >
                    {language === 'th' ? 'ปิด ✕' : 'Close ✕'}
                </button>

                {/* Scrolling credits */}
                <div
                    id="end-credits-scroller"
                    className="flex flex-col items-center w-full will-change-transform"
                    style={{ transform: 'translateY(100vh) translateZ(0)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {creditsContent}
                    {creditsContent}
                </div>
            </div>
        </>
    );
}
