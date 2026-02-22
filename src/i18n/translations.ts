export type Language = 'th' | 'en';

export const translations = {
    th: {
        // Header
        appTitle: 'Prada Princess ✨',
        all: 'ทั้งหมด',
        hide: '✓ ซ่อน',
        show: '○ แสดง',

        // Loading
        loading: 'กำลังโหลดข้อมูล...',
        error: 'ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบ Google Sheet URL',

        // Stats
        pending: 'รอดำเนินการ',
        done: 'เสร็จสิ้น',
        progress: 'กำลังดำเนินการ',
        completed: 'เสร็จสมบูรณ์',

        // Task list
        noTitle: 'ไม่มีชื่อเรื่อง',
        scrollToLoad: 'เลื่อนเพื่อโหลดเพิ่ม...',
        noTasks: 'ยังไม่มีรายการ',
        allDone: 'ทำครบหมดแล้ว!',
        summary: 'สรุปยอด',
        globalStats: 'ยอดรวมทุกแพลตฟอร์ม',
        totalStats: 'ยอดรวมทั้งหมด',
        igStats: 'ยอดรวม IG ทั้งหมด',
        tiktokStats: 'ยอดรวม TikTok ทั้งหมด',
        xStats: 'ยอดรวม X ทั้งหมด',
        facebookStats: 'ยอดรวม Facebook ทั้งหมด',
        youtubeStats: 'ยอดรวม YouTube ทั้งหมด',
        missionImpact: 'Mission Impact สถิติรวม',
        completedTasks: 'งานที่ทำเสร็จแล้ว',
        updateData: 'อัปเดตข้อมูล',
        totalLabel: 'รวมทั้งสิ้น',

        // Modal
        hashtagsLabel: '📝 Hashtags ที่ต้องใช้:',
        noHashtags: 'ไม่มี Hashtags',
        copied: '✓ คัดลอกแล้ว!',
        copyText: '📋 คัดลอกข้อความ',
        goPost: '🚀 ไปโพสต์เลย!',
        markDone: '✓ ทำเสร็จแล้ว',

        // Achievement
        achievementTitle: 'Fashion Week Champion!',
        achievementDesc: 'ขอแสดงความยินดี! คุณทำ Mission ครบแล้ว 🎉',
        downloadFrame: '⬇️ ดาวน์โหลดกรอบรูป',
        shareToX: '📱 แชร์ไป X',

        // Caption Generator
        generateCaption: '✨ สุ่มข้อความ',
        noPositiveMessages: 'ไม่มีข้อความจากชีต (โหลดไม่สำเร็จหรือชีตว่าง)',
        regenerate: '🔄',
        generatedMessage: 'ข้อความที่สร้าง:',
        copyMessageOnly: '📋 คัดลอกข้อความ',
        copyHashtagsOnly: '# คัดลอก Hashtags',
        copyBoth: '📋 คัดลอกทั้งหมด',
        copiedMessage: '✓ คัดลอกข้อความแล้ว!',
        copiedHashtags: '✓ คัดลอก Hashtags แล้ว!',
        copiedBoth: '✓ คัดลอกทั้งหมดแล้ว!',

        // Focus
        focusBadge: '⭐ สำคัญ',

        // Compact Copy Buttons
        copyMsgBtn: '📋 คัดลอกข้อความ',
        copyTagsBtn: '📋 คัดลอก #',
        copyAllBtn: '📋 คัดลอกทั้งหมด',
        copiedBtn: '✓ คัดลอกแล้ว!',

        // Modal Section Labels
        sectionHashtags: 'Hashtags',
        sectionMessage: 'สุ่มข้อความ',
        sectionCopyAll: 'คัดลอกทั้งหมด',
        sectionActions: 'การดำเนินการ',
        sectionTips: '💡 วิธีการใช้งาน',
        markDoneBtn: '✓ ทำสำเร็จแล้ว',
        undoDoneBtn: '↩ ยกเลิก',

        // Usage Tips per platform
        igTip1: '📝 คัดลอกข้อความ → ใส่ใน Comment IG',
        igTip2: '📸 คัดลอกข้อความ + # → สร้างโพสต์ / Reels',
        igTip3: '#️⃣ คัดลอก # เท่านั้น → ใส่ใน Stories',
        xTip1: '✍️ ข้อความ / # / ข้อความ+# → Reply หรือสร้างโพสต์บน X',
        ttTip1: '📝 คัดลอกข้อความ → ใส่ใน Comment TikTok',
        ttTip2: '🎬 คัดลอกข้อความ + # → สร้างโพสต์ / Clip',
        ytTip1: '📝 คัดลอกข้อความ → ใส่ใน Comment YouTube',
        ytTip2: '🎥 คัดลอกข้อความ + # → สร้าง Video / Short',
        fbTip1: '📝 คัดลอกข้อความ → ใส่ใน Comment Facebook',

        // Stats Labels & Descriptions
        totalLikesLabel: 'ถูกใจทั้งหมด',
        totalLikesDesc: 'รวมยอดถูกใจจากทุกแพลตฟอร์ม',
        commentsLabel: 'คอมเมนต์',
        commentsDesc: 'คอมเมนต์และตอบกลับ',
        sharesLabel: 'แชร์',
        sharesDesc: 'แชร์ โควต รีทวีต ส่งต่อ',
        quotesWord: 'โควต',
        savesLabel: 'บันทึก',
        savesDesc: 'บันทึกคอลเล็กชัน',
        viewsLabel: 'ยอดชม',
        viewsDesc: 'ยอดผู้เข้าชมวิดีโอ',
        statsSource: 'รวมจากทุกโพสต์ใน Google Sheet (ตามช่วง MIV/EMV)',

        // Phrases
        minimize: 'ย่อขนาด',
        globalStatsShort: 'ยอดรวม',
        sixteenDays: 'ตลอดงานอีเวนต์',
        phasePreDesc: '22 - 23 ก.พ. (ก่อนงานอีเวนต์)',
        phaseAirportDesc: '24 - 25 ก.พ. (เดินทาง/สนามบิน)',
        phaseShowDesc: '26 ก.พ. (วันโชว์หลัก)',
        phaseAftermathDesc: '27 ก.พ. - 9 มี.ค. (เก็บตก/Aftermath)',
        tapToHide: 'คลิกเพื่อย่อ',
        tapToExpand: 'คลิกเพื่อดูสถิติ',
        dashboardTip: '✦ ทิป: คลิกเพื่อสลับมุมมอง',

        // Short Phrases
        allLabel: 'ทั้งหมด',
        preLabel: 'Pre',
        airportLabel: 'Airport',
        showLabel: 'Show',
        aftermathLabel: 'After',
        sixteenDaysShort: '16 วัน',
        phasePreShort: '22-23 ก.พ.',
        phaseAirportShort: '24-25 ก.พ.',
        phaseShowShort: '26 ก.พ.',
        phaseAftermathShort: '27 ก.พ. - 9 มี.ค.',

        // Metrics Short
        likes: 'ถูกใจ',
        comments: 'คอมเมนต์',
        reposts: 'รีโพสต์',
        shares: 'แชร์',
        saves: 'บันทึก',
        views: 'ยอดชม',
        sends: 'ส่ง',
        replies: 'ตอบกลับ',
        view: 'ชม',

        // Platforms
        igLabel: 'Instagram/Reels',
        ttLabel: 'TikTok',
        xLabel: 'X',
        fbLabel: 'Facebook',
        ytLabel: 'YouTube/Short',
    },
    en: {
        // Header
        appTitle: 'Prada Princess ✨',
        all: 'All',
        hide: '✓ Hide',
        show: '○ Show',

        // Loading
        loading: 'Loading...',
        error: 'Failed to load data. Please check Google Sheet URL',

        // Stats
        pending: 'Pending',
        done: 'Done',
        progress: 'progress',
        completed: 'Completed',

        // Task list
        noTitle: 'No title',
        scrollToLoad: 'Scroll to load more...',
        noTasks: 'No tasks yet',
        allDone: 'All done!',
        summary: 'Summary',
        globalStats: 'Global Platform Stats',
        totalStats: 'Total Stats',
        igStats: 'Total IG Stats',
        tiktokStats: 'Total TikTok Stats',
        xStats: 'Total X Stats',
        facebookStats: 'Total Facebook Stats',
        youtubeStats: 'Total YouTube Stats',
        missionImpact: 'Mission Impact Stats',
        completedTasks: 'Completed Tasks',
        updateData: 'Update Data',
        totalLabel: 'Total',

        // Modal
        hashtagsLabel: '📝 Hashtags to use:',
        noHashtags: 'No hashtags',
        copied: '✓ Copied!',
        copyText: '📋 Copy text',
        goPost: '🚀 Go post!',
        markDone: '✓ Mark as done',

        // Achievement
        achievementTitle: 'Fashion Week Champion!',
        achievementDesc: 'Congratulations! You completed the Mission 🎉',
        downloadFrame: '⬇️ Download Frame',
        shareToX: '📱 Share to X',

        // Caption Generator
        generateCaption: '✨ Random Caption',
        noPositiveMessages: 'No messages from sheet (load failed or sheet empty)',
        regenerate: '🔄',
        generatedMessage: 'Generated Message:',
        copyMessageOnly: '📋 Copy Message',
        copyHashtagsOnly: '# Copy Hashtags',
        copyBoth: '📋 Copy All',
        copiedMessage: '✓ Message Copied!',
        copiedHashtags: '✓ Hashtags Copied!',
        copiedBoth: '✓ All Copied!',

        // Focus
        focusBadge: '⭐ Focus',

        // Compact Copy Buttons
        copyMsgBtn: '📋 Copy Msg',
        copyTagsBtn: '📋 Copy #',
        copyAllBtn: '📋 Copy All',
        copiedBtn: '✓ Copied!',

        // Modal Section Labels
        sectionHashtags: 'Hashtags',
        sectionMessage: 'Random Caption',
        sectionCopyAll: 'Copy All',
        sectionActions: 'Actions',
        sectionTips: '💡 How to use',
        markDoneBtn: '✓ Mark Done',
        undoDoneBtn: '↩ Undo',

        // Usage Tips per platform
        igTip1: '📝 Copy message → paste as IG Comment',
        igTip2: '📸 Copy message + # → create Post / Reels',
        igTip3: '#️⃣ Copy # only → paste in Stories',
        xTip1: '✍️ Message / # / Message+# → Reply or Post on X',
        ttTip1: '📝 Copy message → paste as TikTok Comment',
        ttTip2: '🎬 Copy message + # → create Post / Clip',
        ytTip1: '📝 Copy message → paste as YouTube Comment',
        ytTip2: '🎥 Copy message + # → create Video / Short',
        fbTip1: '📝 Copy message → paste as Facebook Comment',

        // Stats Labels & Descriptions
        totalLikesLabel: 'Total Likes',
        totalLikesDesc: 'Total likes across all platforms',
        commentsLabel: 'Comments',
        commentsDesc: 'Comments and replies',
        sharesLabel: 'Shares',
        sharesDesc: 'Shares, quotes, and retweets',
        quotesWord: 'quotes',
        savesLabel: 'Saves',
        savesDesc: 'Saves and bookmarks',
        viewsLabel: 'Views',
        viewsDesc: 'Total video views',
        statsSource: 'Sum of all posts from Google Sheet (by MIV/EMV period)',

        // Phrases
        minimize: 'Minimize',
        globalStatsShort: 'Total',
        sixteenDays: 'Full Event',
        phasePreDesc: '22 - 23 Feb (Pre-event)',
        phaseAirportDesc: '24 - 25 Feb (Airport)',
        phaseShowDesc: '26 Feb (Main Show)',
        phaseAftermathDesc: '27 Feb - 9 Mar (Aftermath)',
        tapToHide: 'Click to hide',
        tapToExpand: 'Click to view',
        dashboardTip: '✦ Tip: Click to switch views',

        // Short Phrases
        allLabel: 'All',
        preLabel: 'Pre',
        airportLabel: 'Airport',
        showLabel: 'Show',
        aftermathLabel: 'After',
        sixteenDaysShort: '16 Days',
        phasePreShort: '22-23 Feb',
        phaseAirportShort: '24-25 Feb',
        phaseShowShort: '26 Feb',
        phaseAftermathShort: '27 Feb - 9 Mar',

        // Metrics Short
        likes: 'Likes',
        comments: 'Comments',
        reposts: 'Reposts',
        shares: 'Shares',
        saves: 'Saves',
        views: 'Views',
        sends: 'Sends',
        replies: 'Replies',
        view: 'View',

        // Platforms
        igLabel: 'Instagram/Reels',
        ttLabel: 'TikTok',
        xLabel: 'X',
        fbLabel: 'Facebook',
        ytLabel: 'YouTube/Short',
    },
} as const;

export type TranslationKey = keyof typeof translations.th;
