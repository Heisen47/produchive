import { Activity } from '../global';

export interface InstantEvaluation {
    id: string;
    rating: number;
    verdict: 'productive' | 'neutral' | 'unproductive';
    explanation: string;
    timestamp: number;
    timestampReadable: string;
    appName: string;
    title: string;
    goal: string;
}

export const evaluateActivityAgainstGoals = (
    activity: Activity | null,
    goals: string[],
    role: string = 'Software Engineer'
): InstantEvaluation => {
    const timestamp = Date.now();
    const timestampReadable = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const appName = activity?.owner?.name || 'Unknown App';
    const title = activity?.title || 'Active Window';
    const mainGoal = goals.length > 0 ? goals[0] : 'General Productivity';

    const textToMatch = `${appName} ${title} ${role}`.toLowerCase();
    const goalText = mainGoal.toLowerCase();

    // Check goal alignment keywords
    const goalWords = goalText.split(/\s+/).filter(w => w.length > 3);
    const hasGoalKeywordMatch = goalWords.some(word => textToMatch.includes(word));

    const isTechRole = role.toLowerCase().includes('engineer') || role.toLowerCase().includes('developer') || role.toLowerCase().includes('computer');
    const isDesignRole = role.toLowerCase().includes('design') || role.toLowerCase().includes('artist') || role.toLowerCase().includes('ui');
    const isStudentRole = role.toLowerCase().includes('student') || role.toLowerCase().includes('law') || role.toLowerCase().includes('medical');

    const lowerApp = appName.toLowerCase();
    const lowerTitle = title.toLowerCase();

    let rating = 7;
    let verdict: 'productive' | 'neutral' | 'unproductive' = 'neutral';
    let explanation = `Activity in ${appName} matches general workflow.`;

    // High productivity patterns
    if (
        (isTechRole && (lowerApp.includes('code') || lowerApp.includes('terminal') || lowerApp.includes('git') || lowerApp.includes('intellij') || lowerApp.includes('postman'))) ||
        (isDesignRole && (lowerApp.includes('figma') || lowerApp.includes('photoshop') || lowerApp.includes('blender') || lowerApp.includes('illustrator'))) ||
        (isStudentRole && (lowerApp.includes('pdf') || lowerApp.includes('word') || lowerApp.includes('notion') || lowerApp.includes('obsidian') || lowerApp.includes('docs'))) ||
        hasGoalKeywordMatch
    ) {
        rating = Math.floor(Math.random() * 2) + 9; // 9 or 10
        verdict = 'productive';
        explanation = `Highly productive! ${appName} directly advances your goal: "${mainGoal}".`;
    }
    // Moderate / neutral productivity patterns
    else if (
        lowerApp.includes('chrome') || lowerApp.includes('brave') || lowerApp.includes('edge') || lowerApp.includes('firefox') || lowerApp.includes('safari') || lowerApp.includes('browser')
    ) {
        if (lowerTitle.includes('stackoverflow') || lowerTitle.includes('github') || lowerTitle.includes('docs') || lowerTitle.includes('mdn') || lowerTitle.includes('chatgpt') || lowerTitle.includes('claude') || lowerTitle.includes('tutorial')) {
            rating = 8;
            verdict = 'productive';
            explanation = `Research & Documentation in ${appName} aligns with your active goals.`;
        } else if (lowerTitle.includes('youtube') || lowerTitle.includes('netflix') || lowerTitle.includes('reddit') || lowerTitle.includes('twitter') || lowerTitle.includes('x.com')) {
            rating = 3;
            verdict = 'unproductive';
            explanation = `Media consumption detected in ${appName}. Re-align focus toward: "${mainGoal}".`;
        } else {
            rating = 6;
            verdict = 'neutral';
            explanation = `Web browsing in ${appName} evaluated as neutral relative to goal "${mainGoal}".`;
        }
    }
    // Distracting patterns
    else if (
        lowerApp.includes('steam') || lowerApp.includes('discord') || lowerApp.includes('spotify') || lowerApp.includes('game') || lowerApp.includes('whatsapp')
    ) {
        rating = Math.floor(Math.random() * 2) + 2; // 2 or 3
        verdict = 'unproductive';
        explanation = `Distracting application (${appName}) active. Redirect focus to your goal: "${mainGoal}".`;
    } else {
        rating = 7;
        verdict = 'productive';
        explanation = `Active window (${appName}) logged for goal: "${mainGoal}".`;
    }

    return {
        id: crypto.randomUUID(),
        rating,
        verdict,
        explanation,
        timestamp,
        timestampReadable,
        appName,
        title,
        goal: mainGoal
    };
};
