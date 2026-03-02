import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const CREDITS_GID = '1046968352';

interface CreditEntry { nickname: string; }

function parseCSVRow(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else { current += ch; }
    }
    result.push(current.trim());
    return result;
}

function parseCSVCredits(text: string): CreditEntry[] {
    const lines = text.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase());
    const nameIdx = (() => {
        const idx = headers.findIndex(h => h.includes('nickname') || h.includes('name') || h.includes('ชื่อ'));
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

/* ── Star Canvas — zero ongoing cost ── */
function StarCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const W = canvas.width = window.innerWidth;
        const H = canvas.height = window.innerHeight;
        ctx.clearRect(0, 0, W, H);
        for (let i = 0; i < 150; i++) {
            const x = (i * 1.618 * 397) % W;
            const y = (i * 1.618 * 217) % H;
            const r = i % 12 === 0 ? 1.5 : i % 4 === 0 ? 1 : 0.6;
            const alpha = 0.1 + (i % 7) * 0.08;
            const hue = i % 5 === 0 ? 'rgba(255,235,180,' : i % 7 === 0 ? 'rgba(180,210,255,' : 'rgba(255,255,255,';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = `${hue}${alpha})`;
            ctx.fill();
        }
    }, []);
    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }} />;
}

interface EndCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function EndCreditsModal({ isOpen, onClose }: EndCreditsModalProps) {
    const { language } = useLanguage();
    const [entries, setEntries] = useState<CreditEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollDuration, setScrollDuration] = useState(40);

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

    // Calculate dynamic duration based on content height
    useEffect(() => {
        if (!loading && entries.length > 0 && containerRef.current) {
            const height = containerRef.current.scrollHeight / 2;
            const speed = 70; // px per second
            const dur = Math.max(15, height / speed);
            setScrollDuration(dur);
        }
    }, [loading, entries]);

    if (!isOpen) return null;

    const creditsContent = (
        <div className="flex flex-col items-center px-6 w-full py-20">
            {/* Hero title */}
            <div className="mb-24 text-center">
                <div className="relative inline-flex items-center justify-center mb-10">
                    <div className="relative font-bold select-none text-[#B8986E] text-8xl" style={{ filter: 'drop-shadow(0 0 24px rgba(184,152,110,0.9))', lineHeight: 1 }}>
                        ✦
                    </div>
                </div>
                <p className="text-xs uppercase tracking-[0.5em] mb-5 font-light text-[#B8986E]">
                    {language === 'th' ? 'นำเสนอโดย' : 'Presented by'}
                </p>
                <h1 className="font-bold mb-3 drop-shadow-2xl text-4xl sm:text-5xl" style={{ letterSpacing: '0.18em', background: 'linear-gradient(135deg, #fff 0%, #B8986E 50%, #fff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    NAMTAN TIPNAREE
                </h1>
                <p className="text-4xl font-extralight mb-3 text-[#B8986E]">×</p>
                <h2 className="font-bold drop-shadow-2xl text-4xl sm:text-5xl" style={{ letterSpacing: '0.25em', background: 'linear-gradient(135deg, #fff 0%, #B8986E 50%, #fff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    PRADA FW26
                </h2>
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-4 mb-24 w-48">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#B8986E]" />
                <div className="w-1 h-1 rounded-full bg-[#B8986E]" />
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#B8986E]" />
            </div>

            {/* Thank you title */}
            <div className="text-center mb-16">
                <p className="text-xs uppercase mb-4 font-light text-white/50 tracking-[0.4em]">
                    {language === 'th' ? 'ขอบคุณผู้สนับสนุนทุกท่าน' : 'With Deepest Gratitude To'}
                </p>
                <h2 className="font-bold mb-3 text-2xl tracking-[0.3em]" style={{ background: 'linear-gradient(135deg, #B8986E, #D4C8B8, #B8986E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    MISSION SUPPORTERS
                </h2>
                <p className="text-sm text-white/60">
                    {language === 'th' ? 'ผู้ที่ทำ Mission ครบทุกภารกิจ 💖' : 'Those who completed every mission 💖'}
                </p>
            </div>

            {/* Names */}
            {loading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                    <div className="w-8 h-8 rounded-full border-2 border-[#B8986E]/40 border-t-[#B8986E] animate-spin" />
                </div>
            ) : entries.length === 0 ? (
                <p className="text-sm italic py-8 text-white/40">
                    {language === 'th' ? 'ยังไม่มีชื่อ — เป็นคนแรกได้เลย! ✨' : 'No names yet — be the first! ✨'}
                </p>
            ) : (
                <div className="flex flex-col items-center gap-12 w-full max-w-xs">
                    {entries.map((entry, idx) => (
                        <p key={idx} className="font-semibold tracking-widest text-center text-xl"
                            style={{ color: idx % 3 === 0 ? '#B8986E' : idx % 3 === 1 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)', letterSpacing: '0.15em' }}>
                            {entry.nickname}
                        </p>
                    ))}
                </div>
            )}

            {/* Final collage */}
            <div className="mt-28 mb-16 text-center">
                <div className="flex items-center gap-4 mb-20 w-48 mx-auto">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#B8986E]/40" />
                    <div className="w-1 h-1 rounded-full bg-[#B8986E]/80" />
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#B8986E]/40" />
                </div>
                <div className="flex flex-wrap justify-center items-baseline gap-x-6 gap-y-4 px-4 max-w-sm mx-auto">
                    {[
                        { text: 'ขอบคุณ', big: true, gold: true },
                        { text: 'Thank you', big: false, gold: false },
                        { text: 'ありがとう', big: true, gold: false },
                        { text: '감사합니다', big: false, gold: true },
                        { text: '谢谢你', big: true, gold: false },
                        { text: 'Gracias', big: false, gold: true },
                        { text: 'Merci', big: true, gold: false },
                        { text: 'Terima kasih', big: true, gold: true },
                        { text: 'Obrigada', big: false, gold: false },
                        { text: 'Dziękuję', big: true, gold: false },
                        { text: 'Salamat', big: false, gold: true },
                        { text: 'Cảm ơn', big: true, gold: true },
                        { text: '사랑해', big: true, gold: false },
                    ].map(({ text, big, gold }, i) => (
                        <span key={i} className="font-bold leading-tight" style={{ fontSize: big ? '1.8rem' : '1rem', color: gold ? '#B8986E' : 'rgba(255,255,255,0.85)' }}>
                            {text}
                        </span>
                    ))}
                </div>
                <div className="mt-14 text-6xl">💖</div>
                <div className="flex items-center gap-4 mt-16 w-48 mx-auto">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#B8986E]/40" />
                    <div className="w-1 h-1 rounded-full bg-[#B8986E]/80" />
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#B8986E]/40" />
                </div>
            </div>
            {/* Vertical spacer to push content past screen bottom for loop */}
            <div className="h-screen" />
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-[120] bg-black overflow-hidden flex flex-col"
            style={{ background: 'radial-gradient(ellipse 120% 80% at 30% 20%, #180838 0%, #06020f 50%, #000 100%)' }}
            onClick={onClose}
        >

            <StarCanvas />

            {/* Fades */}
            <div className="absolute top-0 left-0 right-0 h-40 z-20 pointer-events-none bg-gradient-to-b from-black to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-40 z-20 pointer-events-none bg-gradient-to-t from-black to-transparent" />

            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-30 px-5 py-2 rounded-full border border-white/10 bg-white/5 text-white/40 text-xs hover:text-white transition-colors backdrop-blur-md"
            >
                {language === 'th' ? 'ปิด ✕' : 'Close ✕'}
            </button>

            <div
                ref={containerRef}
                className="end-credits-scroller flex flex-col items-center w-full"
                style={{ '--credits-duration': `${scrollDuration}s` } as any}
                onClick={e => e.stopPropagation()}
            >
                {creditsContent}
                {creditsContent}
            </div>
        </div>
    );
}
