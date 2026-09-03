export interface PlannedRoutineItem {
    id: string;
    title: string;
    category: 'development' | 'research' | 'meeting' | 'design' | 'writing' | 'break' | 'meal' | 'sleep' | 'other';
    priority: 'high' | 'medium' | 'low';
    dayIndex: number; // 0 (Mon) - 6 (Sun)
    dateStr: string; // YYYY-MM-DD
    startHour: number; // 0 - 23
    startMinute: number; // 0, 15, 30, 45
    durationMinutes: number; // e.g. 30, 60, 90, 120
    completed: boolean;
    subtitle?: string;
    attendees?: string;
    taskId?: string; // Optional direct link to a Task
    isAutoDetected?: boolean;
    detectedApp?: string;
    detectedTitle?: string;
    detectionConfidence?: number;
    actualDurationSeconds?: number;
    detectionFeedback?: 'accurate' | 'inaccurate' | null;
    detectionFeedbackComment?: string;
    feedbackAt?: number;
}

export interface ActivityGuess {
    category: string;
    label: string;
    confidence: number;
    topApp: string;
    topTitle: string;
    totalSeconds: number;
    appBreakdown: Array<{ name: string; seconds: number }>;
}
