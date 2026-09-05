import { describe, it, expect, vi } from 'vitest';
import {
    generateProductivityAnalysis,
    extractActivityIdentity,
    stripBrowserSuffix,
    formatDomainOnly,
    cleanActivityTitle,
    sanitizeCategoryList,
    resolveModelDisplayName,
    judgeActivityProductivityWithLLM,
} from '../renderer/lib/productivityAnalysisService';

describe('productivityAnalysisService', () => {
    it('throws error if activities list is empty', async () => {
        await expect(
            generateProductivityAnalysis({ activities: [] })
        ).rejects.toThrow('No activities recorded to analyze.');
    });

    it('strips browser window title suffixes cleanly', () => {
        expect(stripBrowserSuffix('LeetCode 494 - Google Chrome')).toBe('LeetCode 494');
        expect(stripBrowserSuffix('Target Sum - LeetCode - Microsoft Edge')).toBe('Target Sum - LeetCode');
        expect(stripBrowserSuffix('Research Paper — Mozilla Firefox')).toBe('Research Paper');
        expect(stripBrowserSuffix('YouTube - Brave')).toBe('YouTube');
    });

    it('distinguishes educational YouTube study videos from casual entertainment', () => {
        const studyVideo = extractActivityIdentity(
            'chrome.exe',
            'MIT OpenCourseWare - Linear Algebra Lecture 1 - YouTube - Google Chrome'
        );
        expect(studyVideo.isProductive).toBe(true);
        expect(studyVideo.isDistracting).toBe(false);
        expect(studyVideo.displayName).toContain('YouTube (Study)');

        const entertainmentVideo = extractActivityIdentity(
            'chrome.exe',
            'MrBeast - $1,000,000 Challenge - YouTube - Google Chrome'
        );
        expect(entertainmentVideo.isProductive).toBe(false);
        expect(entertainmentVideo.isDistracting).toBe(true);
        expect(entertainmentVideo.displayName).toContain('YouTube:');
    });

    it('identifies social media and entertainment as distracting', () => {
        const reddit = extractActivityIdentity('chrome.exe', 'r/funny - Reddit - Google Chrome');
        expect(reddit.isDistracting).toBe(true);
        expect(reddit.displayName).toContain('Reddit');

        const twitter = extractActivityIdentity('msedge.exe', 'Home / X - Microsoft Edge');
        expect(twitter.isDistracting).toBe(true);
        expect(twitter.displayName).toContain('X');
    });

    it('severely penalizes 90 mins on YouTube entertainment and gives low rating (<= 4)', async () => {
        const activities = [
            {
                title: 'Funny Cat Fails 2026 - YouTube - Google Chrome',
                owner: { name: 'chrome.exe' },
                duration: 90 * 60 * 1000, // 90 mins YouTube
            },
            {
                title: 'Dashboard.tsx - produchive - Antigravity IDE',
                owner: { name: 'Antigravity IDE.exe' },
                duration: 10 * 60 * 1000, // 10 mins Code
            },
        ];

        const report = await generateProductivityAnalysis({
            activities,
            routines: [],
            goals: ['Ship v3.0.3'],
        });

        expect(report).toBeDefined();
        expect(report.rating).toBeLessThanOrEqual(4);
        expect(report.verdict).toBe('unproductive');
        expect(report.explanation).toContain('Heavy distraction');
        expect(report.categorization.distracting.some((d) => d.includes('YouTube'))).toBe(true);
        expect(report.categorization.productive.some((p) => p.includes('Antigravity IDE'))).toBe(true);
    });

    it('rewards 90 mins of educational coursework on YouTube with high rating (>= 7)', async () => {
        const activities = [
            {
                title: 'Data Structures and Algorithms Crash Course Tutorial - YouTube - Google Chrome',
                owner: { name: 'chrome.exe' },
                duration: 90 * 60 * 1000, // 90 mins study video
            },
            {
                title: 'Target Sum - LeetCode - Google Chrome',
                owner: { name: 'chrome.exe' },
                duration: 15 * 60 * 1000, // 15 mins LeetCode
            },
        ];

        const report = await generateProductivityAnalysis({
            activities,
            routines: [],
            goals: ['Study Algorithms'],
        });

        expect(report).toBeDefined();
        expect(report.rating).toBeGreaterThanOrEqual(7);
        expect(report.verdict).toBe('productive');
        expect(report.categorization.productive.some((p) => p.includes('YouTube (Study)'))).toBe(true);
        expect(report.categorization.productive.some((p) => p.includes('LeetCode'))).toBe(true);
        expect(report.categorization.distracting.length).toBe(0);
    });

    it('uses engine completions when engine is provided and handles valid JSON', async () => {
        const mockEngine = {
            chat: {
                completions: {
                    create: vi.fn().mockResolvedValue({
                        choices: [
                            {
                                message: {
                                    content: JSON.stringify({
                                        rating: 9,
                                        verdict: 'productive',
                                        explanation: 'Excellent deep work in development tools.',
                                        tips: ['Take short breaks to stay fresh.'],
                                        categorization: {
                                            productive: ['VS Code: main.ts'],
                                            neutral: [],
                                            distracting: [],
                                        },
                                    }),
                                },
                            },
                        ],
                    }),
                },
            },
        };

        const activities = [
            {
                title: 'main.ts - produchive - Visual Studio Code',
                owner: { name: 'Code.exe' },
                duration: 90000,
            },
        ];

        const report = await generateProductivityAnalysis({
            activities,
            engine: mockEngine,
        });

        expect(mockEngine.chat.completions.create).toHaveBeenCalled();
        expect(report.rating).toBe(9);
        expect(report.verdict).toBe('productive');
        expect(report.explanation).toBe('Excellent deep work in development tools.');
        expect(report.categorization.productive).toContain('VS Code: main.ts');
    });

    it('gracefully falls back to heuristic if engine fails', async () => {
        const mockFailingEngine = {
            chat: {
                completions: {
                    create: vi.fn().mockRejectedValue(new Error('Out of WebGPU memory')),
                },
            },
        };

        const activities = [
            {
                title: 'Coding in VS Code',
                owner: { name: 'Code.exe' },
                duration: 60000,
            },
        ];

        const report = await generateProductivityAnalysis({
            activities,
            engine: mockFailingEngine,
        });

        expect(report).toBeDefined();
        expect(report.rating).toBeGreaterThanOrEqual(1);
    });

    it('sanitizes full URLs and OAuth handlers down to domain names only', () => {
        const fullUrlWithParams = 'GitHub: fastprep.io/__/auth/handler?apiKey=AIzaSyCxpzLLpIdFvU8PBHUZaYysnxhWPX-uiSg&appName=%5BDEFAULT%5D&authType=signInViaPopup&redirectUrl=https%3A%2F%2Ffastprep.io%2Fpurchase-servers&v=12.12.0&eventId=4076297685&providerId=github.com';
        expect(formatDomainOnly(fullUrlWithParams)).toBe('fastprep.io');

        const oauthCallback = 'fastprep.io/__/auth/handler?code=b65c004609c8f82c2ac4&iss=https%3A%2F%2Fgithub.com%2Flogin';
        expect(formatDomainOnly(oauthCallback)).toBe('fastprep.io');

        const httpsUrl = 'https://fastprep.io/study/problems/rate-limiter';
        expect(formatDomainOnly(httpsUrl)).toBe('fastprep.io');

        const redundantLabel = 'LeetCode: leetcode';
        expect(formatDomainOnly(redundantLabel)).toBe('LeetCode');

        const regularTitle = 'LeetCode: Partition Equal Subset Sum';
        expect(formatDomainOnly(regularTitle)).toBe('LeetCode: Partition Equal Subset Sum');
    });

    it('sanitizes embedded URLs in explanation paragraphs and deduplicates category chips', () => {
        const rawExplanation = 'Strong focus today! You made high progress in LeetCode: leetcode, GitHub: fastprep.io/__/auth/handler?apiKey=AIzaSyCxpzLLpIdFvU8PBHUZaYysnxhWPX-uiSg&appName=%5BDEFAULT%5D&authType=signInViaPopup&redirectUrl=https%3A%2F%2Ffastprep.io%2Fpurchase-servers&v=12.12.0&eventId=4076297685&providerId=github.com, GitHub: fastprep.io/__/auth/handler?code=b65c004609c8f82c2ac4&iss=https%3A%2F%2Fgithub.com%2Flogin with solid objective alignment.';
        const cleaned = formatDomainOnly(rawExplanation);

        expect(cleaned).not.toContain('apiKey=');
        expect(cleaned).not.toContain('auth/handler');
        expect(cleaned).not.toContain('providerId=github.com');
        expect(cleaned).toContain('fastprep.io');
        expect(cleaned).toContain('LeetCode');

        const rawList = [
            'GitHub: fastprep.io/__/auth/handler?apiKey=123',
            'GitHub: fastprep.io/__/auth/handler?code=456',
            'LeetCode: leetcode',
            'LeetCode: Partition Equal Subset Sum',
        ];
        const sanitizedList = sanitizeCategoryList(rawList);
        expect(sanitizedList).toEqual([
            'fastprep.io',
            'LeetCode',
            'LeetCode: Partition Equal Subset Sum',
        ]);
    });

    it('classifies company technical interview problems as productive study rather than game distractions', () => {
        const interviewTab = extractActivityIdentity(
            'chrome.exe',
            'Roblox: Rate Limiter Sliding Window With Per-Entity Limits (Roblox Phone Screen & Onsite Interview) - Coding Interview Problem | FastPrep - Google Chrome'
        );

        expect(interviewTab.isProductive).toBe(true);
        expect(interviewTab.isDistracting).toBe(false);
        expect(interviewTab.category).toBe('development');
        expect(interviewTab.displayName).toContain('FastPrep');
        expect(interviewTab.displayName).not.toBe('Roblox');
    });

    it('generates report with clean domains and without URL leakage when analyzing OAuth tabs', async () => {
        const activities = [
            {
                title: 'fastprep.io/__/auth/handler?apiKey=AIzaSyCxpzLLpIdFvU8PBHUZaYysnxhWPX-uiSg&appName=%5BDEFAULT%5D&authType=signInViaPopup&redirectUrl=https%3A%2F%2Ffastprep.io%2Fpurchase-servers&v=12.12.0&eventId=4076297685&providerId=github.com - Google Chrome',
                owner: { name: 'chrome.exe' },
                duration: 15 * 60 * 1000,
            },
            {
                title: 'Roblox: Rate Limiter Sliding Window With Per-Entity Limits (Roblox Phone Screen & Onsite Interview) - Coding Interview Problem | FastPrep - Google Chrome',
                owner: { name: 'chrome.exe' },
                duration: 30 * 60 * 1000,
            },
        ];

        const report = await generateProductivityAnalysis({
            activities,
            routines: [],
            goals: ['Interview Preparation'],
        });

        expect(report.verdict).toBe('productive');
        expect(report.explanation).not.toContain('apiKey=');
        expect(report.explanation).not.toContain('auth/handler');
        expect(report.explanation).toContain('fastprep.io');
        expect(report.categorization.distracting.length).toBe(0);
        expect(report.categorization.productive).toContain('fastprep.io');
    });

    it('resolves model display names cleanly for share card presentation', () => {
        expect(resolveModelDisplayName('DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC')).toBe('DeepSeek R1 1.5B (Local WebGPU)');
        expect(resolveModelDisplayName('Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC')).toBe('Qwen 2.5 Coder 7B (Local WebGPU)');
        expect(resolveModelDisplayName('Llama-3.2-3B-Instruct-q4f16_1-MLC')).toBe('Llama 3.2 3B (Local WebGPU)');
        expect(resolveModelDisplayName(undefined, false)).toBe('Produchive On-Device Engine');
        expect(resolveModelDisplayName(undefined, true)).toBe('WebLLM Local AI (On-Device)');
    });

    it('attaches modelName to generated productivity analysis for shareable cards', async () => {
        const activities = [
            {
                title: 'Coding - VSCode',
                owner: { name: 'Code.exe' },
                duration: 60 * 60 * 1000,
            }
        ];

        const report = await generateProductivityAnalysis({
            activities,
            routines: [],
            goals: ['Ship Code'],
        });

        expect(report.modelName).toBeDefined();
        expect(typeof report.modelName).toBe('string');
        expect(report.modelName).toContain('Produchive On-Device Engine');
    });

    it('uses LLM as the brain to determine if an activity is productive', async () => {
        const mockEngine = {
            chat: {
                completions: {
                    create: vi.fn().mockResolvedValue({
                        choices: [
                            {
                                message: {
                                    content: JSON.stringify({
                                        verdict: 'productive',
                                        category: 'development',
                                        confidence: 96,
                                        reason: 'FastPrep coding interview preparation directly aligns with software engineering goals',
                                    }),
                                },
                            },
                        ],
                    }),
                },
            },
        };

        const judgment = await judgeActivityProductivityWithLLM(
            { appName: 'chrome.exe', title: 'FastPrep: Minimum Cost to Purchase Servers - Google Chrome' },
            ['Software Engineer Interview Prep'],
            mockEngine
        );

        expect(mockEngine.chat.completions.create).toHaveBeenCalled();
        expect(judgment.isProductive).toBe(true);
        expect(judgment.isDistracting).toBe(false);
        expect(judgment.verdict).toBe('productive');
        expect(judgment.category).toBe('development');
        expect(judgment.reason).toContain('FastPrep');
    });

    it('uses LLM as the brain to determine if an activity is distracting', async () => {
        const mockEngine = {
            chat: {
                completions: {
                    create: vi.fn().mockResolvedValue({
                        choices: [
                            {
                                message: {
                                    content: JSON.stringify({
                                        verdict: 'distracting',
                                        category: 'break',
                                        confidence: 99,
                                        reason: 'Non-work entertainment during work block',
                                    }),
                                },
                            },
                        ],
                    }),
                },
            },
        };

        const judgment = await judgeActivityProductivityWithLLM(
            { appName: 'chrome.exe', title: 'Funny Cat Fails 2026 - YouTube - Google Chrome' },
            ['Ship v3.0.4 Code'],
            mockEngine
        );

        expect(mockEngine.chat.completions.create).toHaveBeenCalled();
        expect(judgment.isProductive).toBe(false);
        expect(judgment.isDistracting).toBe(true);
        expect(judgment.verdict).toBe('distracting');
        expect(judgment.category).toBe('break');
    });

    it('falls back gracefully to heuristic intelligence when LLM engine is unavailable', async () => {
        const judgment = await judgeActivityProductivityWithLLM(
            { appName: 'Code.exe', title: 'Dashboard.tsx - produchive' },
            ['Develop Produchive App'],
            null
        );

        expect(judgment.isProductive).toBe(true);
        expect(judgment.isDistracting).toBe(false);
        expect(judgment.verdict).toBe('productive');
        expect(judgment.category).toBe('development');
        expect(judgment.evaluatedBy).toBe('Produchive On-Device Engine');
    });
});

