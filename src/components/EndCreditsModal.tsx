import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const CREDITS_GID = '1046968352';

interface CreditEntry {
    nickname: string;
}

// Proper CSV row parser — handles quoted fields with commas inside (e.g. timestamps)
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

// Stars generated once — stable between rerenders
const STARS = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: `${(i * 1.618033988 * 13.7) % 100}%`,
    top: `${(i * 1.618033988 * 7.3) % 100}%`,
    size: i % 10 === 0 ? 2 : 1,
    opacity: 0.1 + (i % 5) * 0.09,
    delay: `${(i % 7) * 0.7}s`,
    duration: `${2 + (i % 4)}s`,
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
        if (isOpen) {
            fetchCredits();
        }
    }, [isOpen, fetchCredits]);

    // JS-driven scroll — works on iOS Safari and all mobile browsers
    // CSS @keyframes injected via <style> tags can fail silently on mobile WebKit
    useEffect(() => {
        if (!isOpen || loading) return;

        let el: HTMLElement | null = null;

        // Small delay to ensure the DOM is ready after loading state changes
        const init = () => {
            el = document.getElementById('end-credits-scroller');
            if (!el) return;

            let offset = 0;
            let rafId: number;
            const speed = 80; // px per second
            let lastTime: number | null = null;
            let paused = false;

            const step = (timestamp: number) => {
                if (lastTime === null) lastTime = timestamp;
                const delta = (timestamp - lastTime) / 1000;
                lastTime = timestamp;

                if (!paused && el) {
                    offset += speed * delta;
                    const half = el.scrollHeight / 2;
                    if (half > 0 && offset >= half) offset -= half;
                    el.style.transform = `translateY(-${offset}px) translateZ(0)`;
                }

                rafId = requestAnimationFrame(step);
            };

            const pause = () => { paused = true; };
            const resume = () => { paused = false; lastTime = null; };

            el.addEventListener('touchstart', pause, { passive: true });
            el.addEventListener('touchend', resume, { passive: true });
            el.addEventListener('mouseenter', pause);
            el.addEventListener('mouseleave', resume);

            rafId = requestAnimationFrame(step);

            return () => {
                cancelAnimationFrame(rafId);
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
            // Store cleanup for the effect cleanup
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
            {/* Intro spacer */}
            <div className="h-screen" />

            {/* Studio card */}
            <div className="mb-20 text-center">
                <div className="text-5xl mb-5">👑</div>
                <p className="text-prada-gold/80 text-[10px] uppercase tracking-[0.5em] mb-3 drop-shadow-md">
                    {language === 'th' ? 'นำเสนอโดย' : 'Presented by'}
                </p>
                <h1 className="text-white text-3xl sm:text-4xl font-bold tracking-[0.2em] mb-2 drop-shadow-lg">NAMTAN TIPNAREE</h1>
                <h2 className="text-white text-3xl sm:text-4xl font-bold tracking-[0.2em] drop-shadow-lg">× PRADA</h2>
            </div>

            <div className="w-px h-24 bg-gradient-to-b from-prada-gold/40 to-transparent mb-20" />

            {/* Title */}
            <div className="text-center mb-24">
                <p className="text-white/60 text-[9px] uppercase tracking-[0.6em] mb-4 drop-shadow-sm">
                    {language === 'th' ? 'ขอบคุณผู้สนับสนุนทุกท่าน' : 'With Deepest Gratitude To'}
                </p>
                <h2 className="text-prada-gold text-3xl font-bold tracking-[0.2em] mb-3 drop-shadow-lg">
                    MISSION SUPPORTERS
                </h2>
                <p className="text-white/60 text-xs tracking-widest drop-shadow-sm">
                    {language === 'th' ? 'ผู้ที่ทำ Mission ครบทุกภารกิจ 💖' : 'Those who completed every mission 💖'}
                </p>
            </div>

            {/* Names */}
            {loading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                    <div className="w-8 h-8 border border-prada-gold/50 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : entries.length === 0 ? (
                <p className="text-white/60 text-sm italic py-8">
                    {language === 'th' ? 'ยังไม่มีชื่อ — เป็นคนแรกได้เลย! ✨' : 'No names yet — be the first! ✨'}
                </p>
            ) : (
                <div className="flex flex-col items-center gap-8 w-full max-w-xs">
                    {entries.map((entry, idx) => (
                        <div key={idx} className="text-center">
                            <p className="text-white text-lg font-bold tracking-wider drop-shadow-md">
                                {entry.nickname}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* End section */}
            <div className="mt-24 mb-12 text-center">
                <div className="w-24 h-px bg-prada-gold/40 mx-auto mb-10" />
                <p className="text-white/60 text-[9px] uppercase tracking-[0.5em] drop-shadow-sm">
                    {language === 'th' ? 'ขอบคุณทุกคน' : 'Thank You All'}
                </p>
                <p className="text-white/90 text-2xl mt-3 drop-shadow-md">💖</p>
                <div className="w-24 h-px bg-prada-gold/40 mx-auto mt-8" />
            </div>

            {/* Outro spacer */}
            <div className="h-screen" />
        </div>
    );

    return (
        <>
            <div
                className="fixed inset-0 z-[120] flex flex-col bg-black overflow-hidden"
                onClick={onClose}
            >
                {/* Star field */}
                <div className="absolute inset-0 pointer-events-none">
                    {STARS.map(s => (
                        <div
                            key={s.id}
                            className="absolute rounded-full bg-white animate-pulse"
                            style={{
                                width: s.size,
                                height: s.size,
                                left: s.left,
                                top: s.top,
                                opacity: s.opacity,
                                animationDelay: s.delay,
                                animationDuration: s.duration,
                            }}
                        />
                    ))}
                </div>

                {/* Top & bottom gradient fades */}
                <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black to-transparent z-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none" />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-30 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/40 hover:text-white text-xs transition-colors"
                >
                    {language === 'th' ? 'ปิด ✕' : 'Close ✕'}
                </button>

                {/* Scrolling credits — duplicated for seamless loop */}
                <div
                    id="end-credits-scroller"
                    className="flex flex-col items-center w-full will-change-transform"
                    style={{ transform: 'translateY(0) translateZ(0)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {creditsContent}
                    {creditsContent}
                </div>
            </div>
        </>
    );
}
