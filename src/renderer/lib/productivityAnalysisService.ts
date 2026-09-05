import { inferActivityDetails } from './activityAutoTracker';

export interface ProductivityAnalysis {
    rating: number;
    verdict: 'productive' | 'neutral' | 'unproductive';
    explanation: string;
    tips: string[];
    categorization: {
        productive: string[];
        neutral: string[];
        distracting: string[];
    };
    timestamp?: number;
    modelName?: string;
}

export interface AnalysisInput {
    activities: Array<{
        title: string;
        owner: { name: string };
        duration?: number;
    }>;
    routines?: Array<{
        dateStr: string;
        title: string;
        category: string;
        completed?: boolean;
        durationMinutes: number;
        isAutoDetected?: boolean;
        detectedApp?: string;
    }>;
    goals?: string[];
    selectedRole?: string;
    customPrompt?: string;
    focusSessions?: Array<{
        startedAt: number | string;
        durationSeconds?: number;
        scene: string;
    }>;
    engine?: any;
    modelName?: string;
}

export interface ActivityIdentity {
    displayName: string;
    appName: string;
    category: 'development' | 'research' | 'writing' | 'design' | 'meeting' | 'study' | 'break' | 'system' | 'meal' | 'sleep' | 'other';
    isProductive: boolean;
    isDistracting: boolean;
    cleanContext: string;
}

const STUDY_KEYWORDS = [
    'lecture', 'tutorial', 'course', 'crash course', 'guide', 'learn', 'study',
    'mit opencourseware', 'khan academy', 'freecodecamp', 'geeksforgeeks',
    'algorithm', 'calculus', 'linear algebra', 'physics', 'chemistry', 'biology',
    'history', 'math', 'mathematics', 'computer science', 'programming', 'coding',
    'system design', 'data structure', 'leetcode', 'interview prep', 'walkthrough',
    'seminar', 'documentation', 'python', 'javascript', 'typescript', 'react',
    'c++', 'rust', 'golang', 'docker', 'kubernetes', 'aws', 'machine learning',
    'deep learning', 'exam preparation', 'notes', 'revision'
];

const DISTRACTING_PLATFORMS = [
    'netflix', 'twitch', 'reddit', 'tiktok', 'instagram', 'facebook',
    'twitter', 'x.com', 'pinterest', '9gag', 'prime video', 'disney+',
    'disney plus', 'hulu', 'roblox', 'steam', 'epic games', 'discord'
];

export const stripBrowserSuffix = (rawTitle: string): string => {
    let clean = (rawTitle || '').trim();
    clean = clean.replace(/\s*[-—|]\s*(Google Chrome|Microsoft Edge|Mozilla Firefox|Brave|Opera|Arc|Vivaldi|Chromium).*$/i, '');
    clean = clean.replace(/\s*[-—|]\s*(Personal|Work|Profile \d+).*$/i, '');
    return clean.trim();
};

export const cleanActivityTitle = (rawTitle: string): { cleanTitle: string; domain: string | null } => {
    let clean = stripBrowserSuffix(rawTitle);

    // 1. Strip query string parameters (?key=val...) and hash
    if (clean.includes('?')) {
        clean = clean.split('?')[0].trim();
    }
    if (clean.includes('#')) {
        clean = clean.split('#')[0].trim();
    }

    // 2. Extract domain if clean contains an http(s) URL or domain path
    let domain: string | null = null;
    const httpMatch = clean.match(/https?:\/\/([^\s/?#:]+)/i);
    if (httpMatch) {
        domain = httpMatch[1].replace(/^www\./i, '');
    } else {
        const domainMatch = clean.match(/(?:^|[:\s])([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(?:\/|$)/i);
        if (domainMatch) {
            domain = domainMatch[1].replace(/^www\./i, '');
        }
    }

    // If the title was a full URL or path or contained a domain URL, simplify it to domain
    if (domain && (clean.startsWith('http') || clean.includes('/') || clean.toLowerCase().includes(domain.toLowerCase()))) {
        const withoutPrefix = clean.replace(/^(?:GitHub|GitLab|Web|Browser|Google Chrome|Edge|Firefox):\s*/i, '').trim();
        if (withoutPrefix.startsWith('http') || withoutPrefix.includes('/') || withoutPrefix === domain) {
            clean = domain;
        }
    }

    // 3. Strip any other embedded URLs
    clean = clean.replace(/https?:\/\/([^\s/]+)[^\s]*/gi, '$1');

    return { cleanTitle: clean.trim(), domain };
};

export const formatDomainOnly = (text: string): string => {
    if (!text) return '';
    let res = text.trim();

    // 1. If string has full HTTP(S) URLs: replace each URL with just its hostname
    res = res.replace(/https?:\/\/([^\s/?#:]+)(?::\d+)?(?:\/[^\s,)]*)?/gi, '$1');

    // 2. If preceded by a generic prefix like "GitHub:", "Web:", "Google Chrome:", etc.
    // e.g. "GitHub: fastprep.io/__/auth/handler?apiKey=..." -> "fastprep.io"
    // e.g. "Web: fastprep.io/..." -> "fastprep.io"
    // e.g. "Web: fastprep.io" -> "fastprep.io"
    res = res.replace(/^(?:GitHub|GitLab|Web|Browser|Google Chrome|Chrome|Edge|Firefox):\s*([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(?:\/[^\s,)]*)?$/i, '$1');

    // 3. Replace any standalone domain path in text: e.g. "fastprep.io/__/auth/handler?apiKey=..." -> "fastprep.io"
    // Does not match email addresses like user@domain.com because of (?<!@)
    res = res.replace(/(?<!@)\b([a-zA-Z0-9-]+\.[a-zA-Z]{2,})\/[^\s,)]*/gi, '$1');

    // 4. If there's an embedded prefix like "GitHub: fastprep.io" where the domain isn't github.com:
    // e.g. "GitHub: fastprep.io" -> "fastprep.io"
    res = res.replace(/\bGitHub:\s*([a-zA-Z0-9-]+\.[a-zA-Z]{2,})\b/gi, (match, d) => {
        return d.toLowerCase().includes('github') ? 'GitHub' : d;
    });

    // 5. Strip leftover query strings (?key=val...)
    res = res.replace(/\?[a-zA-Z0-9_=&%.-]+/g, '');

    // 6. Clean up redundant prefixes like "LeetCode: leetcode" -> "LeetCode", "FastPrep: fastprep" -> "FastPrep"
    res = res.replace(/\b([A-Za-z0-9]+):\s*\1\b/gi, '$1');

    // 7. Deduplicate consecutive repeated domains (e.g. "fastprep.io, fastprep.io" -> "fastprep.io")
    res = res.replace(/\b([a-zA-Z0-9.-]+)(,\s*\1\b)+/gi, '$1');

    // Clean up spaces
    res = res.replace(/\s{2,}/g, ' ').trim();
    return res;
};

export const sanitizeCategoryList = (items: string[]): string[] => {
    if (!Array.isArray(items)) return [];
    const formatted = items.map(formatDomainOnly).filter(Boolean);
    return Array.from(new Set(formatted));
};

export const resolveModelDisplayName = (modelIdOrName?: string, hasEngine?: boolean): string => {
    const raw = modelIdOrName || (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedModelId') : null);
    if (!raw) {
        return hasEngine ? 'WebLLM Local AI (On-Device)' : 'Produchive On-Device Engine';
    }

    const lower = raw.toLowerCase();
    if (lower.includes('deepseek') && lower.includes('r1')) return 'DeepSeek R1 1.5B (Local WebGPU)';
    if (lower.includes('qwen') && lower.includes('coder')) return 'Qwen 2.5 Coder 7B (Local WebGPU)';
    if (lower.includes('qwen') && lower.includes('1.5b')) return 'Qwen 2.5 1.5B (Local WebGPU)';
    if (lower.includes('llama') && lower.includes('3.2') && lower.includes('3b')) return 'Llama 3.2 3B (Local WebGPU)';
    if (lower.includes('llama') && lower.includes('3.2') && lower.includes('1b')) return 'Llama 3.2 1B (Local WebGPU)';
    if (lower.includes('gemma')) return 'Gemma 2 2B (Local WebGPU)';
    if (lower.includes('smollm')) return 'SmolLM2 1.7B (Local WebGPU)';
    if (lower.includes('phi')) return 'Phi 3.5 Mini (Local WebGPU)';
    if (lower.includes('tinyllama')) return 'TinyLlama 1.1B (Local WebGPU)';

    const clean = raw
        .replace(/-MLC$/i, '')
        .replace(/-q\d.*$/i, '')
        .replace(/-Instruct/i, '')
        .replace(/_/g, ' ')
        .trim();
    return clean ? `${clean} (Local WebGPU)` : 'WebLLM Local AI (On-Device)';
};

export const extractActivityIdentity = (
    appName: string,
    rawTitle: string,
    effectiveGoals: string[] = []
): ActivityIdentity => {
    const rawAppName = appName || 'Unknown';
    const appLower = rawAppName.toLowerCase();
    const { cleanTitle, domain } = cleanActivityTitle(rawTitle);
    const titleLower = (cleanTitle || rawTitle || '').toLowerCase();
    const plannedTitles = effectiveGoals.map((g) => g.toLowerCase().trim()).filter(Boolean);

    const isBrowser =
        appLower.includes('chrome') ||
        appLower.includes('msedge') ||
        appLower.includes('edge') ||
        appLower.includes('firefox') ||
        appLower.includes('brave') ||
        appLower.includes('safari') ||
        appLower.includes('opera') ||
        appLower.includes('arc') ||
        appLower.includes('vivaldi');

    if (isBrowser) {
        // FastPrep or technical interview prep check (avoids false-positive gaming distraction e.g. Roblox interview)
        const isTechInterviewOrStudy =
            titleLower.includes('fastprep') ||
            titleLower.includes('coding interview') ||
            titleLower.includes('interview problem') ||
            titleLower.includes('phone screen') ||
            titleLower.includes('onsite interview') ||
            titleLower.includes('sliding window') ||
            titleLower.includes('rate limiter') ||
            titleLower.includes('system design');

        if (isTechInterviewOrStudy) {
            let label = cleanTitle;
            label = label.replace(/\s*[-—|]\s*FastPrep.*$/i, '').replace(/\|\s*FastPrep/i, '').trim();
            if (!label || label === 'fastprep.io' || label.startsWith('fastprep')) {
                label = 'fastprep.io';
            } else if (label.length > 35) {
                label = label.substring(0, 32) + '...';
            }
            return {
                displayName: label === 'fastprep.io' ? 'fastprep.io' : `FastPrep: ${label}`,
                appName: 'Web Browser',
                category: 'development',
                isProductive: true,
                isDistracting: false,
                cleanContext: 'Coding Interview Prep',
            };
        }

        if (titleLower.includes('youtube')) {
            const videoTitle = cleanTitle.replace(/\s*[-—|]\s*YouTube.*$/i, '').trim();
            const isStudy = STUDY_KEYWORDS.some((kw) => titleLower.includes(kw)) ||
                plannedTitles.some((t) => t && (titleLower.includes(t) || videoTitle.toLowerCase().includes(t)));

            if (isStudy) {
                return {
                    displayName: videoTitle ? `YouTube (Study): ${videoTitle}` : 'YouTube (Educational Lecture)',
                    appName: 'Google Chrome',
                    category: 'study',
                    isProductive: true,
                    isDistracting: false,
                    cleanContext: videoTitle || 'Study Video',
                };
            }

            return {
                displayName: videoTitle ? `YouTube: ${videoTitle}` : 'YouTube (Entertainment)',
                appName: 'Google Chrome',
                category: 'break',
                isProductive: false,
                isDistracting: true,
                cleanContext: videoTitle || 'Video Stream',
            };
        }

        const isTwitterOrX =
            titleLower.includes('twitter') ||
            titleLower.includes('x.com') ||
            /\/\s*x(\s*[-—|]|$)/i.test(cleanTitle) ||
            /\bhome\s*\/\s*x\b/i.test(cleanTitle);

        if (isTwitterOrX) {
            const cleanSite = cleanTitle.replace(/\s*[-—|]\s*(X|Twitter).*$/i, '').trim();
            return {
                displayName: cleanSite ? `X / Twitter: ${cleanSite}` : 'X / Twitter',
                appName: 'Web Browser',
                category: 'break',
                isProductive: false,
                isDistracting: true,
                cleanContext: cleanSite || 'Social Media',
            };
        }

        for (const dist of DISTRACTING_PLATFORMS) {
            if (titleLower.includes(dist)) {
                const cleanSite = cleanTitle.replace(new RegExp(`\\s*[-—|]\\s*${dist}.*$`, 'i'), '').trim();
                const distCapitalized = dist.charAt(0).toUpperCase() + dist.slice(1);
                return {
                    displayName: cleanSite ? `${distCapitalized}: ${cleanSite}` : distCapitalized,
                    appName: 'Web Browser',
                    category: 'break',
                    isProductive: false,
                    isDistracting: true,
                    cleanContext: cleanSite || distCapitalized,
                };
            }
        }

        if (titleLower.includes('leetcode') || titleLower.includes('hackerrank') || titleLower.includes('codeforces')) {
            const problem = cleanTitle.replace(/\s*[-—|]\s*(LeetCode|HackerRank|Codeforces).*$/i, '').trim();
            return {
                displayName: problem ? `LeetCode: ${problem}` : 'LeetCode',
                appName: 'Web Browser',
                category: 'development',
                isProductive: true,
                isDistracting: false,
                cleanContext: problem || 'Coding Practice',
            };
        }

        if (titleLower.includes('github') || titleLower.includes('gitlab') || titleLower.includes('stackoverflow')) {
            const repo = cleanTitle.replace(/\s*[-—|]\s*(GitHub|GitLab|Stack Overflow).*$/i, '').trim();
            return {
                displayName: repo ? `GitHub: ${repo}` : 'GitHub',
                appName: 'Web Browser',
                category: 'development',
                isProductive: true,
                isDistracting: false,
                cleanContext: repo || 'Software Repo',
            };
        }

        if (domain) {
            return {
                displayName: domain,
                appName: 'Web Browser',
                category: 'research',
                isProductive: true,
                isDistracting: false,
                cleanContext: domain,
            };
        }

        if (titleLower.includes('docs.google.com') || titleLower.includes('notion') || titleLower.includes('obsidian')) {
            return {
                displayName: cleanTitle ? `Docs: ${cleanTitle}` : 'Google Docs / Notion',
                appName: 'Web Browser',
                category: 'writing',
                isProductive: true,
                isDistracting: false,
                cleanContext: cleanTitle || 'Documentation',
            };
        }

        if (
            titleLower.includes('coursera') ||
            titleLower.includes('edx') ||
            titleLower.includes('udemy') ||
            titleLower.includes('canvas') ||
            titleLower.includes('blackboard') ||
            titleLower.includes('arxiv') ||
            titleLower.includes('overleaf')
        ) {
            return {
                displayName: cleanTitle ? `Study: ${cleanTitle}` : 'Online Course / Academic Research',
                appName: 'Web Browser',
                category: 'study',
                isProductive: true,
                isDistracting: false,
                cleanContext: cleanTitle || 'Academic Platform',
            };
        }

        const matchesPlan = plannedTitles.some((t) => t && titleLower.includes(t));
        return {
            displayName: cleanTitle ? `Web: ${cleanTitle}` : 'Web Research',
            appName: 'Web Browser',
            category: matchesPlan ? 'research' : 'other',
            isProductive: matchesPlan,
            isDistracting: false,
            cleanContext: cleanTitle || 'Web Research',
        };
    }

    const isIdeOrTerminal =
        appLower === 'code' ||
        appLower.startsWith('code.') ||
        appLower.includes('visual studio') ||
        appLower.includes('vscode') ||
        appLower.includes('cursor') ||
        appLower.includes('antigravity') ||
        appLower.includes('intellij') ||
        appLower.includes('webstorm') ||
        appLower.includes('pycharm') ||
        appLower.includes('sublime') ||
        appLower.includes('terminal') ||
        appLower.includes('warp');

    if (isIdeOrTerminal) {
        let ideName = 'IDE';
        if (appLower.includes('antigravity')) ideName = 'Antigravity IDE';
        else if (appLower.includes('code') || appLower.includes('visual studio')) ideName = 'VS Code';
        else if (appLower.includes('cursor')) ideName = 'Cursor';
        else if (appLower.includes('terminal') || appLower.includes('warp')) ideName = 'Terminal';

        const cleanIdeTitle = cleanTitle.replace(new RegExp(`\\s*[-—|]\\s*(${rawAppName}|Visual Studio Code|Cursor|Antigravity IDE).*$`, 'i'), '').trim();

        return {
            displayName: cleanIdeTitle ? `${ideName}: ${cleanIdeTitle}` : ideName,
            appName: ideName,
            category: 'development',
            isProductive: true,
            isDistracting: false,
            cleanContext: cleanIdeTitle || 'Coding Session',
        };
    }

    const inferred = inferActivityDetails(rawAppName, rawTitle);
    const cleanApp = rawAppName.replace(/\.exe$/i, '');
    const isDistraction = inferred.category === 'break';
    const isProd =
        inferred.category === 'development' ||
        inferred.category === 'research' ||
        inferred.category === 'writing' ||
        inferred.category === 'design' ||
        inferred.category === 'meeting';

    return {
        displayName: cleanTitle && cleanTitle !== rawAppName ? `${cleanApp}: ${cleanTitle}` : cleanApp,
        appName: cleanApp,
        category: inferred.category,
        isProductive: isProd,
        isDistracting: isDistraction,
        cleanContext: cleanTitle || cleanApp,
    };
};

export interface ActivityProductivityJudgment {
    activityTitle: string;
    appName: string;
    verdict: 'productive' | 'neutral' | 'distracting';
    isProductive: boolean;
    isDistracting: boolean;
    category: string;
    confidence: number;
    reason: string;
    evaluatedBy: string;
}

const activityJudgmentCache = new Map<string, { judgment: ActivityProductivityJudgment; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export const judgeActivityProductivityWithLLM = async (
    activity: { appName: string; title: string; duration?: number },
    goals: string[] = [],
    engine?: any
): Promise<ActivityProductivityJudgment> => {
    const rawAppName = activity.appName || 'Unknown';
    const rawTitle = activity.title || '';
    const { cleanTitle } = cleanActivityTitle(rawTitle);
    const effectiveTitle = cleanTitle || rawTitle || rawAppName;

    const cacheKey = `${rawAppName}::${effectiveTitle}::${goals.join('|')}`;
    const cached = activityJudgmentCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return cached.judgment;
    }

    if (engine) {
        try {
            const goalsText = goals.length > 0
                ? goals.map((g, i) => `Goal ${i + 1}: "${g}"`).join('\n')
                : 'Focus on productive work, coding, and learning';

            const prompt = `You are the AI cognitive brain of Produchive.
Your job is to determine whether the user's activity is PRODUCTIVE, NEUTRAL, or DISTRACTING in relation to their goals.

User Goals:
${goalsText}

Activity to Evaluate:
- Application: "${rawAppName}"
- Window / Tab Title: "${effectiveTitle}"

Evaluation Guidelines:
1. If the activity directly advances the user's goals, learning, coding, documentation, or meaningful work, classify it as "productive".
2. If the activity is entertainment, social media, casual video streaming, gaming, or aimless distraction, classify it as "distracting".
3. If the activity is general utility, administration, search navigation, or ambiguous tool usage, classify it as "neutral".
4. Assign the best category from: "development", "research", "writing", "design", "meeting", "study", "break", "system", "other".
5. Provide a confidence score (1-100) and concise reason explaining your determination.

Respond ONLY with valid JSON:
{
  "verdict": "productive" | "neutral" | "distracting",
  "category": "development" | "research" | "writing" | "design" | "meeting" | "study" | "break" | "system" | "other",
  "confidence": number,
  "reason": "concise explanation"
}`;

            const completion = await engine.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are an objective AI productivity brain that determines whether window activities are productive or distracting against goals. Output valid JSON only.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
            });

            const content = completion.choices[0]?.message?.content || '';
            const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            const verdict: 'productive' | 'neutral' | 'distracting' =
                ['productive', 'neutral', 'distracting'].includes(parsed.verdict?.toLowerCase())
                    ? (parsed.verdict.toLowerCase() as 'productive' | 'neutral' | 'distracting')
                    : 'neutral';

            const validCategories = ['development', 'research', 'writing', 'design', 'meeting', 'study', 'break', 'system', 'other'];
            const category = validCategories.includes(parsed.category?.toLowerCase())
                ? parsed.category.toLowerCase()
                : verdict === 'productive' ? 'development' : verdict === 'distracting' ? 'break' : 'other';

            const judgment: ActivityProductivityJudgment = {
                activityTitle: formatDomainOnly(effectiveTitle),
                appName: rawAppName,
                verdict,
                isProductive: verdict === 'productive',
                isDistracting: verdict === 'distracting',
                category,
                confidence: typeof parsed.confidence === 'number' ? Math.min(100, Math.max(1, parsed.confidence)) : 90,
                reason: formatDomainOnly(parsed.reason || `Judged as ${verdict} by AI brain.`),
                evaluatedBy: resolveModelDisplayName(undefined, true),
            };

            activityJudgmentCache.set(cacheKey, { judgment, cachedAt: Date.now() });
            return judgment;
        } catch (err) {
            console.warn('[productivityAnalysisService] LLM activity judgment failed, falling back to local heuristic:', err);
        }
    }

    // Heuristic fallback when LLM engine is unavailable
    const identity = extractActivityIdentity(rawAppName, rawTitle, goals);
    const verdict: 'productive' | 'neutral' | 'distracting' = identity.isProductive
        ? 'productive'
        : identity.isDistracting
        ? 'distracting'
        : 'neutral';

    const judgment: ActivityProductivityJudgment = {
        activityTitle: formatDomainOnly(identity.displayName),
        appName: rawAppName,
        verdict,
        isProductive: identity.isProductive,
        isDistracting: identity.isDistracting,
        category: identity.category,
        confidence: 80,
        reason: identity.cleanContext || (identity.isProductive ? 'Aligned with productive work' : identity.isDistracting ? 'Non-work entertainment' : 'Neutral tool activity'),
        evaluatedBy: resolveModelDisplayName(undefined, false),
    };

    activityJudgmentCache.set(cacheKey, { judgment, cachedAt: Date.now() });
    return judgment;
};

const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
};

export async function generateProductivityAnalysis(input: AnalysisInput): Promise<ProductivityAnalysis> {
    const {
        activities = [],
        routines = [],
        goals = [],
        selectedRole = 'General Student',
        customPrompt = '',
        focusSessions = [],
        engine,
    } = input;

    if (!activities || activities.length === 0) {
        throw new Error('No activities recorded to analyze.');
    }

    const todayStr = (() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    })();

    const todayCalendarItems = (routines || []).filter(
        (r) => r.dateStr === todayStr && !r.isAutoDetected && r.category !== 'meal' && r.category !== 'break' && r.category !== 'sleep'
    );
    const todayCalendarTitles = todayCalendarItems.map((r) => r.title.trim()).filter(Boolean);
    const effectiveGoals = todayCalendarTitles.length > 0 ? todayCalendarTitles : goals;

    const aggregatedItems = new Map<string, { duration: number; identity: ActivityIdentity }>();

    activities.forEach((a) => {
        const appName = a.owner?.name || 'Unknown';
        const title = a.title || '';
        const duration = a.duration || 0;
        const identity = extractActivityIdentity(appName, title, effectiveGoals);

        const key = identity.displayName;
        const prev = aggregatedItems.get(key) || { duration: 0, identity };
        prev.duration += duration;
        aggregatedItems.set(key, prev);
    });

    const categorizedApps = {
        productive: new Set<string>(),
        neutral: new Set<string>(),
        distracting: new Set<string>(),
    };

    let totalDurationMs = 0;
    let productiveDurationMs = 0;
    let distractingDurationMs = 0;

    aggregatedItems.forEach(({ duration, identity }) => {
        totalDurationMs += duration;
        if (identity.isDistracting) {
            categorizedApps.distracting.add(identity.displayName);
            distractingDurationMs += duration;
        } else if (identity.isProductive) {
            categorizedApps.productive.add(identity.displayName);
            productiveDurationMs += duration;
        } else {
            categorizedApps.neutral.add(identity.displayName);
            productiveDurationMs += duration * 0.35;
        }
    });

    if (engine) {
        try {
            const sortedItems = Array.from(aggregatedItems.values())
                .sort((a, b) => b.duration - a.duration)
                .slice(0, 15);

            const activitySummary = sortedItems
                .map((item, idx) => {
                    const ctx = item.identity.cleanContext ? ` (Context: ${item.identity.cleanContext})` : '';
                    return `${idx + 1}. "${item.identity.displayName}" | Application: ${item.identity.appName} | Duration: ${formatDuration(item.duration)}${ctx}`;
                })
                .join('\n');

            const goalsText = effectiveGoals.length > 0
                ? effectiveGoals.map((g, i) => `Goal ${i + 1}: "${g}"`).join('\n')
                : 'Focus on coding, learning, and productive tasks';

            let focusSessionText = '';
            if (focusSessions.length > 0) {
                const totalFocusSec = focusSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
                focusSessionText = `\nFocus Study Sessions (Total: ${formatDuration(totalFocusSec * 1000)})`;
            }

            let routineSummaryText = '';
            const todayRoutines = (routines || []).filter((r) => r.dateStr === todayStr);
            if (todayRoutines.length > 0) {
                const scheduled = todayRoutines.filter((r) => !r.isAutoDetected);
                const scheduledLines = scheduled
                    .map((r) => `- [${r.completed ? 'COMPLETED' : 'PENDING'}] ${r.title} (${r.durationMinutes}m) [${r.category}]`)
                    .join('\n');
                routineSummaryText = `Scheduled Routine Calendar:\n${scheduledLines || '- None'}`;
            }

            const prompt = `You are the AI cognitive brain of Produchive.
Your task is to analyze the user's recorded windows, browser tabs, and applications against their stated goals and determine whether each activity can be considered PRODUCTIVE, NEUTRAL, or DISTRACTING.

User Goals & Targeted Work:
${goalsText}
${routineSummaryText ? `\n${routineSummaryText}` : ''}

Recorded Activities:
${activitySummary}
${focusSessionText}

CRITICAL COGNITIVE JUDGMENT RULES:
1. Use your brain to evaluate the true nature and context of each activity against the user's goals:
   - Activities that actively advance the user's goals, technical learning, software engineering, writing, problem-solving, or coursework MUST be determined as "productive".
   - Non-work entertainment, social media (Twitter/X, Reddit, TikTok, Instagram), gaming, or casual video streaming unrelated to goals MUST be determined as "distracting".
   - Necessary background tools, system utilities, communication, or search navigation that are ambiguous or operational MUST be determined as "neutral".
2. Group EVERY recorded activity into the appropriate list in "categorization":
   - "productive": array of exact activity names you judged as productive.
   - "neutral": array of exact activity names you judged as neutral.
   - "distracting": array of exact activity names you judged as distracting.
3. Determine an overall rating (1-10) and verdict ("productive", "neutral", "unproductive") reflecting the proportion of time spent on activities you determined as productive vs distracting:
   - If extensive time was spent on activities you judged as distracting (e.g. >= 40% of time), the rating must be low (1-4) with verdict 'unproductive'.
   - If time was dominated by activities you judged as productive, rating should be high (7-10) with verdict 'productive'.
4. Provide a clear, honest explanation calling out the specific activities and explaining WHY your cognitive judgment classified them as productive or distracting.
5. Provide actionable coaching tips.

Respond ONLY with this JSON structure:
{
  "rating": number (1-10),
  "verdict": "productive" | "neutral" | "unproductive",
  "explanation": "concise explanation calling out exact activities and why your AI brain judged them productive or distracting",
  "tips": ["actionable tip 1", "actionable tip 2"],
  "categorization": {
    "productive": ["exact activity names from the list"],
    "neutral": ["exact activity names from the list"],
    "distracting": ["exact activity names from the list"]
  }
}`;

            const completion = await engine.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are an objective AI productivity brain that determines whether activities are productive or distracting against goals. Return JSON only.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.2,
            });

            const responseText = completion.choices[0]?.message?.content || '';
            const jsonString = responseText.replace(/```json\n?|\n?```/g, '').trim();
            const result = JSON.parse(jsonString);

            let parsedRating = typeof result.rating === 'number' ? result.rating : parseInt(result.rating, 10);
            if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 10) {
                parsedRating = 6;
            }

            const validVerdicts = ['productive', 'neutral', 'unproductive'];
            const parsedVerdict = validVerdicts.includes(result.verdict?.toLowerCase())
                ? (result.verdict.toLowerCase() as 'productive' | 'neutral' | 'unproductive')
                : parsedRating >= 7 ? 'productive' : parsedRating >= 4 ? 'neutral' : 'unproductive';

            return {
                rating: parsedRating,
                verdict: parsedVerdict,
                explanation: formatDomainOnly(result.explanation || 'Analysis complete.'),
                tips: (Array.isArray(result.tips) && result.tips.length > 0 ? result.tips : ['Keep up your focus momentum!']).map(formatDomainOnly),
                categorization: {
                    productive: sanitizeCategoryList(result.categorization?.productive || Array.from(categorizedApps.productive)),
                    neutral: sanitizeCategoryList(result.categorization?.neutral || Array.from(categorizedApps.neutral)),
                    distracting: sanitizeCategoryList(result.categorization?.distracting || Array.from(categorizedApps.distracting)),
                },
                timestamp: Date.now(),
                modelName: resolveModelDisplayName(input.modelName, true),
            };
        } catch (llmErr) {
            console.warn('[productivityAnalysisService] LLM completion failed, falling back to tab-level heuristic:', llmErr);
        }
    }

    // 2. Intelligent tab-aware heuristic analysis
    let score = 5;
    if (totalDurationMs > 0) {
        const distractionRatio = distractingDurationMs / totalDurationMs;
        const productiveRatio = productiveDurationMs / totalDurationMs;

        if (distractionRatio >= 0.7) {
            score = Math.max(1, Math.round(3 * (1 - distractionRatio)));
        } else if (distractionRatio >= 0.4) {
            score = Math.max(2, Math.min(5, Math.round(productiveRatio * 7)));
        } else {
            score = Math.min(10, Math.max(4, Math.round(productiveRatio * 10)));
        }
    }

    const verdict: 'productive' | 'neutral' | 'unproductive' =
        score >= 7 ? 'productive' : score >= 4 ? 'neutral' : 'unproductive';

    const topProductive = sanitizeCategoryList(Array.from(categorizedApps.productive)).slice(0, 3);
    const topDistracting = sanitizeCategoryList(Array.from(categorizedApps.distracting)).slice(0, 3);

    let explanation = '';
    if (verdict === 'productive') {
        explanation = topProductive.length > 0
            ? `Strong focus today! You made high progress in ${topProductive.join(', ')} with solid objective alignment.`
            : `Great focus maintained across your active workspaces with high productive adherence.`;
    } else if (verdict === 'neutral') {
        explanation = topDistracting.length > 0
            ? `Balanced output with noticeable distractions. Time in ${topDistracting[0]} countered your progress in ${topProductive[0] || 'work tasks'}.`
            : `Moderate productivity today with occasional context switching between tasks.`;
    } else {
        explanation = topDistracting.length > 0
            ? `Heavy distraction detected: extensive time spent on ${topDistracting.join(', ')} significantly impacted your planned goals.`
            : `Off-task activity and context switches dominated your schedule today.`;
    }

    const tips: string[] = [];
    if (topDistracting.length > 0) {
        tips.push(`Block or limit time on ${topDistracting[0]} during deep work blocks.`);
    }
    if (topProductive.length > 0) {
        tips.push(`Schedule key work in ${topProductive[0]} during morning circadian peaks.`);
    }
    if (effectiveGoals.length === 0) {
        tips.push('Set targets in your Routine Calendar for exact task adherence tracking.');
    } else {
        tips.push('Take a 5-minute breather between intense coding and study sessions.');
    }

    return {
        rating: score,
        verdict,
        explanation: formatDomainOnly(explanation),
        tips: tips.map(formatDomainOnly),
        categorization: {
            productive: sanitizeCategoryList(Array.from(categorizedApps.productive)),
            neutral: sanitizeCategoryList(Array.from(categorizedApps.neutral)),
            distracting: sanitizeCategoryList(Array.from(categorizedApps.distracting)),
        },
        timestamp: Date.now(),
        modelName: resolveModelDisplayName(input.modelName, false),
    };
}
