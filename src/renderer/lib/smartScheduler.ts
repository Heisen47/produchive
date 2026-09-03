import { PlannedRoutineItem } from '../components/Routine';

export interface TaskToSchedule {
    id?: string;
    title: string;
    category?: PlannedRoutineItem['category'];
    priority?: 'high' | 'medium' | 'low';
    duration?: number;
    subtitle?: string;
}

export interface OptimalSlot {
    preferredHour: number;
    preferredMinute: number;
    durationMinutes: number;
    inferredCategory: PlannedRoutineItem['category'];
    timeWindow: 'morning' | 'lunch' | 'afternoon' | 'evening' | 'dinner' | 'night';
}

/**
 * Maps task titles to realistic human daily circadian time slots.
 */
export const inferOptimalSlot = (title: string, customCategory?: PlannedRoutineItem['category']): OptimalSlot => {
    const t = title.toLowerCase().trim();

    // ─── 1. MEALS & NUTRITION ───
    if (t.includes('breakfast') || t.includes('morning coffee') || t.includes('morning tea') || t.includes('morning meal')) {
        return { preferredHour: 8, preferredMinute: 0, durationMinutes: 45, inferredCategory: 'meal', timeWindow: 'morning' };
    }
    if (t.includes('lunch') || t.includes('afternoon meal') || t.includes('brunch') || t.includes('midday meal')) {
        return { preferredHour: 13, preferredMinute: 0, durationMinutes: 60, inferredCategory: 'meal', timeWindow: 'lunch' };
    }
    if (t.includes('dinner') || t.includes('evening meal') || t.includes('supper') || t.includes('night food')) {
        return { preferredHour: 20, preferredMinute: 0, durationMinutes: 60, inferredCategory: 'meal', timeWindow: 'dinner' };
    }
    if (t.includes('snack') || t.includes('tea break') || t.includes('coffee break') || t.includes('recharge')) {
        return { preferredHour: 16, preferredMinute: 30, durationMinutes: 30, inferredCategory: 'break', timeWindow: 'afternoon' };
    }

    // ─── 2. EXERCISE, REST & SLEEP ───
    if (t.includes('gym') || t.includes('workout') || t.includes('exercise') || t.includes('run') || t.includes('jog') || t.includes('fitness') || t.includes('cardio') || t.includes('yoga')) {
        return { preferredHour: 18, preferredMinute: 0, durationMinutes: 60, inferredCategory: 'break', timeWindow: 'evening' };
    }
    if (t.includes('walk') || t.includes('stretch') || t.includes('meditation') || t.includes('unwind')) {
        return { preferredHour: 18, preferredMinute: 30, durationMinutes: 30, inferredCategory: 'break', timeWindow: 'evening' };
    }
    if (t.includes('sleep') || t.includes('bed') || t.includes('night rest')) {
        return { preferredHour: 23, preferredMinute: 0, durationMinutes: 60, inferredCategory: 'sleep', timeWindow: 'night' };
    }
    if (t.includes('nap') || t.includes('power nap')) {
        return { preferredHour: 14, preferredMinute: 30, durationMinutes: 30, inferredCategory: 'break', timeWindow: 'afternoon' };
    }
    if (t.includes('rest') || t.includes('break') || t.includes('pause')) {
        return { preferredHour: 16, preferredMinute: 0, durationMinutes: 30, inferredCategory: 'break', timeWindow: 'afternoon' };
    }

    // ─── 3. HIGH-COGNITIVE MORNING TASKS (Problem Solving, DSA, Math, Heavy Code) ───
    if (t.includes('leetcode') || t.includes('dsa') || t.includes('algorithm') || t.includes('competitive') || t.includes('math') || t.includes('exam') || t.includes('study') || t.includes('prep')) {
        return { preferredHour: 9, preferredMinute: 0, durationMinutes: 60, inferredCategory: customCategory || 'development', timeWindow: 'morning' };
    }

    // ─── 4. CORE DEVELOPMENT & ENGINEERING ───
    if (t.includes('produchive') || t.includes('feature') || t.includes('backend') || t.includes('api') || t.includes('frontend') || t.includes('bug') || t.includes('refactor') || t.includes('code') || t.includes('dev')) {
        return { preferredHour: 11, preferredMinute: 0, durationMinutes: 60, inferredCategory: customCategory || 'development', timeWindow: 'morning' };
    }

    // ─── 5. MEETINGS & COLLABORATION ───
    if (t.includes('meeting') || t.includes('sync') || t.includes('standup') || t.includes('call') || t.includes('1:1') || t.includes('interview')) {
        return { preferredHour: 10, preferredMinute: 0, durationMinutes: 45, inferredCategory: 'meeting', timeWindow: 'morning' };
    }

    // ─── 6. CREATIVE, MEDIA & WRITING ───
    if (t.includes('video') || t.includes('edit') || t.includes('youtube') || t.includes('thumbnail') || t.includes('render') || t.includes('film')) {
        return { preferredHour: 15, preferredMinute: 0, durationMinutes: 60, inferredCategory: customCategory || 'design', timeWindow: 'afternoon' };
    }
    if (t.includes('design') || t.includes('ui') || t.includes('ux') || t.includes('figma') || t.includes('prototype')) {
        return { preferredHour: 14, preferredMinute: 0, durationMinutes: 60, inferredCategory: customCategory || 'design', timeWindow: 'afternoon' };
    }
    if (t.includes('write') || t.includes('doc') || t.includes('blog') || t.includes('article') || t.includes('notes')) {
        return { preferredHour: 16, preferredMinute: 0, durationMinutes: 60, inferredCategory: customCategory || 'writing', timeWindow: 'afternoon' };
    }
    if (t.includes('email') || t.includes('admin') || t.includes('review') || t.includes('pr') || t.includes('git')) {
        return { preferredHour: 17, preferredMinute: 0, durationMinutes: 45, inferredCategory: 'other', timeWindow: 'afternoon' };
    }

    // Default morning/afternoon development slot
    return { preferredHour: 10, preferredMinute: 0, durationMinutes: 60, inferredCategory: customCategory || 'development', timeWindow: 'morning' };
};

/**
 * Allocates distinct, productivity-prioritized durations across a list of tasks
 * such that the sum of durations strictly does not exceed totalAllottedMinutes.
 */
/**
 * Detects low-value, unproductive, distraction, or daytime idle/sleep tasks.
 */
export const isUnproductiveOrLeisure = (title: string, category?: string): boolean => {
    const low = title.toLowerCase().trim();
    if (category === 'break' || category === 'meal') return false;

    // Video editing / production is productive deep work, not passive consumption
    if (low.includes('edit') || low.includes('production') || low.includes('render') || low.includes('film') || low.includes('thumbnail')) {
        return false;
    }

    return (
        low === 'sleep' ||
        low.includes('sleeping') ||
        low.includes('lay in bed') ||
        low.includes('nap') ||
        low.includes('fiddling') ||
        low.includes('fiddle') ||
        low.includes('fidget') ||
        low.includes('scroll') ||
        low.includes('doomscroll') ||
        low.includes('insta') ||
        low.includes('instagram') ||
        low.includes('tiktok') ||
        low.includes('reels') ||
        low.includes('shorts') ||
        low.includes('yt') ||
        low.includes('youtube') ||
        low.includes('netflix') ||
        low.includes('anime') ||
        low.includes('tv') ||
        low.includes('movie') ||
        low.includes('binge') ||
        low.includes('chill') ||
        low.includes('lounging') ||
        low.includes('procrastinat') ||
        low.includes('waste') ||
        low.includes('gaming') ||
        low.includes('games') ||
        low.includes('play games') ||
        low.includes('valorant') ||
        low.includes('fortnite') ||
        low.includes('roblox') ||
        low.includes('gta') ||
        low.includes('steam') ||
        low.includes('twitch') ||
        low.includes('reddit') ||
        low.includes('twitter') ||
        low.includes('x.com') ||
        low.includes('facebook') ||
        low.includes('random browse') ||
        low.includes('browsing')
    );
};

/**
 * Allocates productive minutes across a list of user tasks using weighted smart heuristic.
 * Highly values deep cognitive tasks (coding, study, editing) with large blocks (60-180m),
 * gives low values and small capped time (15-30m) to unproductive tasks (yt, insta, sleep, fiddling),
 * and caps admin tasks (30-45m).
 */
export const allocateProductiveTaskDurations = (
    tasks: { title: string; category?: PlannedRoutineItem['category']; priority?: 'high' | 'medium' | 'low' }[],
    totalAllottedMinutes: number
): { title: string; category: PlannedRoutineItem['category']; priority: PlannedRoutineItem['priority']; duration: number; isUnproductive?: boolean; isDeepWork?: boolean }[] => {
    if (!tasks || tasks.length === 0) return [];
    if (totalAllottedMinutes <= 0) totalAllottedMinutes = 240; // Default 4h

    // 1. Calculate weight for each task based on cognitive depth, impact & productivity
    let taskList = [...tasks];

    // If user provided only unproductive/idle activities, inject productive anchor blocks to preserve user growth
    const allUnproductive = taskList.every((t) => isUnproductiveOrLeisure(t.title, t.category));
    if (allUnproductive && totalAllottedMinutes >= 90) {
        taskList = [
            { title: 'Core Deep Work & Focus Block', category: 'development', priority: 'high' },
            ...(totalAllottedMinutes >= 180 ? [{ title: 'Skill Building & Project Study', category: 'writing' as const, priority: 'medium' as const }] : []),
            ...taskList,
        ];
    }

    const scoredTasks = taskList.map((t) => {
        const slot = inferOptimalSlot(t.title, t.category);
        const cat = t.category || slot.inferredCategory;
        const lowTitle = t.title.toLowerCase();
        const isUnproductive = isUnproductiveOrLeisure(t.title, cat);

        let weight = 2.0;
        let isDeepWork = false;
        let isAdmin = false;

        if (isUnproductive) {
            // Unproductive tasks (sleep, yt, insta, fiddling) receive ultra-low weight
            weight = 0.25;
        } else if (
            cat === 'development' ||
            lowTitle.includes('code') ||
            lowTitle.includes('leetcode') ||
            lowTitle.includes('feature') ||
            lowTitle.includes('dsa') ||
            lowTitle.includes('backend') ||
            lowTitle.includes('frontend') ||
            lowTitle.includes('algorithm') ||
            lowTitle.includes('video') ||
            lowTitle.includes('edit') ||
            lowTitle.includes('editing') ||
            lowTitle.includes('study') ||
            lowTitle.includes('exam') ||
            lowTitle.includes('project') ||
            lowTitle.includes('build') ||
            lowTitle.includes('architect') ||
            lowTitle.includes('learn')
        ) {
            // High cognitive depth / deep work tasks get highest weight (long focus blocks)
            weight = 5.0;
            isDeepWork = true;
        } else if (
            cat === 'design' ||
            cat === 'writing' ||
            lowTitle.includes('design') ||
            lowTitle.includes('doc') ||
            lowTitle.includes('article') ||
            lowTitle.includes('research') ||
            lowTitle.includes('write') ||
            lowTitle.includes('plan')
        ) {
            weight = 3.0;
            isDeepWork = true;
        } else if (
            cat === 'meeting' ||
            lowTitle.includes('meeting') ||
            lowTitle.includes('sync') ||
            lowTitle.includes('email') ||
            lowTitle.includes('admin') ||
            lowTitle.includes('call') ||
            lowTitle.includes('chat') ||
            lowTitle.includes('catchup') ||
            lowTitle.includes('social') ||
            lowTitle.includes('chore')
        ) {
            weight = 1.0;
            isAdmin = true;
        }

        if (t.priority === 'high') weight *= 1.4;
        else if (t.priority === 'low') weight *= 0.6;

        return {
            title: t.title,
            category: cat,
            priority: (t.priority || (isDeepWork ? 'high' : isUnproductive ? 'low' : 'medium')) as PlannedRoutineItem['priority'],
            weight,
            isDeepWork,
            isAdmin,
            isUnproductive,
        };
    });

    const totalWeight = scoredTasks.reduce((sum, t) => sum + t.weight, 0);

    // 2. Initial duration allocation in 30-minute steps (clean slot alignment)
    let allocated = scoredTasks.map((t) => {
        let rawMins = (t.weight / totalWeight) * totalAllottedMinutes;
        // Unproductive activities get capped to max 15-30m
        if (t.isUnproductive) {
            rawMins = Math.min(rawMins, 30);
        } else if (t.isAdmin && scoredTasks.length > 1) {
            rawMins = Math.min(rawMins, 45);
        }
        // Snap to nearest 30 mins (minimum 15 mins for short/admin/unproductive, 30 mins for deep work)
        const step = (t.isUnproductive || t.isAdmin) ? 15 : 30;
        let snapped = Math.max(step, Math.round(rawMins / step) * step);
        return {
            ...t,
            duration: snapped,
        };
    });

    // 3. Rebalance so sum(durations) === totalAllottedMinutes
    let currentTotal = allocated.reduce((sum, t) => sum + t.duration, 0);

    // If total exceeds allotted budget, decrement 15m/30m from unproductive or lowest weight items first
    while (currentTotal > totalAllottedMinutes) {
        const candidates = allocated
            .map((item, idx) => ({ ...item, idx }))
            .filter((item) => item.duration > 15)
            .sort((a, b) => {
                if (a.isUnproductive !== b.isUnproductive) return a.isUnproductive ? -1 : 1;
                return (b.duration / b.weight) - (a.duration / a.weight);
            });

        if (candidates.length === 0) break;
        const dec = Math.min(15, currentTotal - totalAllottedMinutes);
        allocated[candidates[0].idx].duration -= dec;
        currentTotal -= dec;
    }

    // If total is less than allotted budget, give extra 15m/30m strictly to deep work and productive tasks
    while (totalAllottedMinutes - currentTotal >= 15) {
        const candidates = allocated
            .map((item, idx) => ({ ...item, idx }))
            .filter((item) => !item.isUnproductive && (!item.isAdmin || item.duration < 45))
            .sort((a, b) => b.weight - a.weight);

        const inc = Math.min(15, totalAllottedMinutes - currentTotal);
        if (candidates.length === 0) {
            allocated[0].duration += inc;
            currentTotal += inc;
        } else {
            allocated[candidates[0].idx].duration += inc;
            currentTotal += inc;
        }
    }

    // Sort order: Deep work first (Morning/Afternoon), Unproductive / Leisure last (Evening)
    allocated.sort((a, b) => {
        if (a.isUnproductive !== b.isUnproductive) return a.isUnproductive ? 1 : -1;
        return b.weight - a.weight;
    });

    return allocated.map(({ title, category, priority, duration, isUnproductive, isDeepWork }) => ({
        title,
        category,
        priority,
        duration,
        isUnproductive,
        isDeepWork,
    }));
};

/**
 * Mindset Quotes for Productivity & Recovery.
 */
export const PRODUCTIVITY_QUOTES = [
    {
        quote: "Focus on being productive instead of busy. Deep work brings extraordinary results.",
        author: "Tim Ferriss",
    },
    {
        quote: "Small daily improvements compounded over time lead to world-class mastery.",
        author: "Robin Sharma",
    },
    {
        quote: "Action is the foundational key to all success. Complete your high-priority blocks first.",
        author: "Pablo Picasso",
    },
    {
        quote: "Discipline is choosing between what you want now and what you want most.",
        author: "Abraham Lincoln",
    },
    {
        quote: "Your energy is your greatest currency. Balance intense sprints with restorative breaks.",
        author: "Jim Loehr",
    },
];

export const SLEEP_RECOVERY_QUOTES = [
    {
        quote: "Sleep is the greatest legal performance enhancing drug that most people are neglecting.",
        author: "Dr. Matthew Walker",
    },
    {
        quote: "Quality rest tonight fuels breakthrough clarity and unstoppable focus tomorrow.",
        author: "Arianna Huffington",
    },
    {
        quote: "A well-rested mind solves in minutes what an exhausted mind struggles with for hours.",
        author: "James Clear",
    },
];

/**
 * Returns a context-aware mindset quote and advice based on when the planned routine finishes.
 */
export const getMindsetCardData = (schedule: PlannedRoutineItem[], allottedHours: number, defaultStartHour: number) => {
    const lastItem = schedule.length > 0 ? schedule[schedule.length - 1] : null;
    const endMins = lastItem ? lastItem.startHour * 60 + lastItem.startMinute + lastItem.durationMinutes : defaultStartHour * 60;
    const endHour = Math.floor(endMins / 60) % 24;
    const isLateNight = endMins >= 1350 || endHour >= 22 || endHour <= 4; // 10:30 PM+ or late night

    if (isLateNight) {
        const quote = SLEEP_RECOVERY_QUOTES[Math.floor(Math.random() * SLEEP_RECOVERY_QUOTES.length)];
        return {
            type: 'sleep',
            title: 'Rest & Recovery Mindset',
            badge: 'Essential Rest',
            quote: quote.quote,
            author: quote.author,
            tip: '🌙 Late session: Target 7-8h restful sleep after wrapping up to recharge mental stamina.',
        };
    } else {
        const quote = PRODUCTIVITY_QUOTES[Math.floor(Math.random() * PRODUCTIVITY_QUOTES.length)];
        const formattedEnd = `${endHour % 12 || 12} ${endHour >= 12 ? 'PM' : 'AM'}`;
        return {
            type: 'productivity',
            title: 'Focus & Execution Mindset',
            badge: 'High Performance',
            quote: quote.quote,
            author: quote.author,
            tip: `⚡ Wrap up by ${formattedEnd} — plenty of free time before bed (11 PM)!`,
        };
    }
};

export interface ForwardScheduleOptions {
    tasks: { title: string; category?: PlannedRoutineItem['category']; priority?: 'high' | 'medium' | 'low' }[];
    allottedMinutes: number;
    startHour: number;
    startMinute?: number;
    dateStr: string;
    includeBreakfast?: boolean;
    includeLunch?: boolean;
    includeRestBlocks?: boolean;
    includeDinner?: boolean;
}

/**
 * Detects if a task represents a fixed occupation block (job, school, college, office).
 * These tasks occupy 9 AM - 5 PM with a lunch break in between.
 */
export const isOccupationBlock = (title: string): boolean => {
    const t = title.toLowerCase().trim();
    const occupationKeywords = [
        'job', 'office', 'work shift', '9 to 5', '9-5', '9to5',
        'school', 'college', 'uni', 'university', 'class', 'classes', 'lecture', 'lectures',
        'internship', 'intern', 'placement', 'corporate', 'day job',
        'clinic', 'hospital shift', 'teaching', 'tutoring hours',
    ];
    return occupationKeywords.some((kw) => {
        if (kw === 'uni') {
            return t === 'uni' || t.startsWith('uni ') || t.endsWith(' uni') || t.includes(' uni ');
        }
        return t.includes(kw);
    });
};

/**
 * Forward Smart Schedule Generator.
 * Allocates the full user-allotted time to their work tasks, placing relevant breaks/meals
 * cleanly without stealing their work budget, and strictly in future hours.
 *
 * If an occupation block (job/school/college/uni/office) is detected among tasks, it reserves
 * 9 AM - 5 PM for that occupation with a lunch break, and schedules all other tasks
 * before 9 AM or after 5 PM.
 */
export const generateForwardSmartSchedule = ({
    tasks,
    allottedMinutes,
    startHour,
    startMinute = 0,
    dateStr,
    includeBreakfast = false,
    includeLunch = true,
    includeRestBlocks = true,
    includeDinner = true,
}: ForwardScheduleOptions): PlannedRoutineItem[] => {
    if (!tasks || tasks.length === 0) {
        if (!includeLunch && !includeDinner && !includeBreakfast) return [];
    }

    const dayIndex = new Date(dateStr).getDay();
    const initialStartMins = startHour * 60 + startMinute;
    const schedule: PlannedRoutineItem[] = [];

    let currentMins = initialStartMins;

    const appendItem = (item: {
        title: string;
        category: PlannedRoutineItem['category'];
        priority?: PlannedRoutineItem['priority'];
        duration: number;
        subtitle?: string;
    }) => {
        const sH = Math.floor(currentMins / 60) % 24;
        const sM = currentMins % 60;
        schedule.push({
            id: `item-${Date.now()}-${schedule.length}-${Math.random().toString(36).substring(2, 6)}`,
            title: item.title,
            category: item.category,
            priority: item.priority || 'medium',
            dayIndex,
            dateStr,
            startHour: sH,
            startMinute: sM,
            durationMinutes: item.duration,
            completed: false,
            subtitle: item.subtitle,
        });
        currentMins += item.duration;
    };

    // ─── OCCUPATION BLOCK PATH ───
    // If any task is a job/school/college/uni/office block, reserve 9 AM - 5 PM for it
    const occupationTask = (tasks || []).find((t) => isOccupationBlock(t.title));
    if (occupationTask) {
        const otherTasks = (tasks || []).filter((t) => t !== occupationTask && !isOccupationBlock(t.title));
        const occupationCategory = occupationTask.category || 'other';

        // Pre-occupation: only breakfast before 9 AM
        if (includeBreakfast && initialStartMins <= 510) {
            currentMins = Math.max(currentMins, 480); // 8:00 AM
            appendItem({
                title: 'Morning Routine & Breakfast',
                category: 'meal',
                priority: 'medium',
                duration: 45,
                subtitle: 'Healthy breakfast, shower & prep',
            });
        }

        // Occupation Morning Session: 9:00 AM - 12:30 PM (210 mins)
        currentMins = 540; // 9:00 AM
        appendItem({
            title: occupationTask.title,
            category: occupationCategory,
            priority: occupationTask.priority || 'high',
            duration: 210,
            subtitle: 'Morning session',
        });

        // Small lunch break at normal lunch time: 12:30 PM - 1:30 PM (60 mins)
        currentMins = 750; // 12:30 PM
        appendItem({
            title: 'Lunch Break',
            category: 'meal',
            priority: 'medium',
            duration: 60,
            subtitle: 'Midday meal & rest',
        });

        // Occupation Afternoon Session: 1:30 PM - 5:00 PM (210 mins)
        currentMins = 810; // 1:30 PM
        appendItem({
            title: `${occupationTask.title} (Afternoon)`,
            category: occupationCategory,
            priority: occupationTask.priority || 'high',
            duration: 210,
            subtitle: 'Afternoon session',
        });

        // Post-occupation: 5:00 PM onwards - schedule remaining personal tasks
        currentMins = 1020; // 5:00 PM

        if (includeRestBlocks) {
            appendItem({
                title: 'Evening Transition & Decompress',
                category: 'break',
                priority: 'medium',
                duration: 30,
                subtitle: 'Shift from work mode to personal time',
            });
        }

        // Allocate remaining personal tasks between 5:30 PM and dinner
        const DINNER_TIME_OCC = 1170; // 7:30 PM
        if (otherTasks.length > 0) {
            const availableEvening = DINNER_TIME_OCC - currentMins;
            if (availableEvening >= 30) {
                const personalAllocated = allocateProductiveTaskDurations(otherTasks, availableEvening);
                for (const task of personalAllocated) {
                    if (currentMins >= DINNER_TIME_OCC) break;
                    const taskDuration = Math.min(task.duration, DINNER_TIME_OCC - currentMins);
                    if (taskDuration < 15) break;
                    appendItem({
                        title: task.title,
                        category: task.category,
                        priority: task.priority,
                        duration: taskDuration,
                        subtitle: 'Personal time',
                    });
                }
            }
        }

        // Dinner: 7:30 PM
        if (includeDinner) {
            currentMins = Math.max(currentMins, DINNER_TIME_OCC);
            appendItem({
                title: 'Dinner & Family Relaxation',
                category: 'meal',
                priority: 'medium',
                duration: 60,
                subtitle: 'Family & nourishing dinner',
            });
        }

        // All remaining personal tasks after dinner - 100% priority on user-entered tasks
        const unscheduledOtherTasks = otherTasks.filter((t) => !schedule.some((s) => s.title === t.title));
        if (unscheduledOtherTasks.length > 0) {
            const postDinnerAllocated = allocateProductiveTaskDurations(
                unscheduledOtherTasks,
                Math.max(60, unscheduledOtherTasks.length * 30)
            );
            for (const task of postDinnerAllocated) {
                appendItem({
                    title: task.title,
                    category: task.category,
                    priority: task.priority,
                    duration: task.duration,
                    subtitle: 'Evening personal time',
                });
            }
        }

        // Night Sleep Block: starts after all tasks are completed
        if (!schedule.some((s) => s.category === 'sleep')) {
            currentMins = Math.max(currentMins, 1380); // 11:00 PM or later
            appendItem({
                title: 'Night Sleep & Recovery',
                category: 'sleep',
                priority: 'high',
                duration: 60,
                subtitle: 'Essential 7-8 hrs rest for peak performance',
            });
        }

        return schedule;
    }

    // ─── STANDARD PATH (No occupation block detected) ───

    // 1. Allocate the FULL allottedMinutes to the user's productive tasks
    const rawAllocated = allocateProductiveTaskDurations(tasks, allottedMinutes);

    // If any single continuous block exceeds 120m, split into focused work blocks so meals & breaks fit realistically
    const allocatedWorkTasks: typeof rawAllocated = [];
    for (const t of rawAllocated) {
        if (t.duration > 120 && !t.isUnproductive) {
            let rem = t.duration;
            let part = 1;
            while (rem > 0) {
                const chunk = Math.min(120, rem);
                allocatedWorkTasks.push({
                    ...t,
                    title: part === 1 ? t.title : `${t.title} (Part ${part})`,
                    duration: chunk,
                });
                rem -= chunk;
                part++;
            }
        } else {
            allocatedWorkTasks.push(t);
        }
    }

    const workQueue = [...allocatedWorkTasks];

    // ─── ZONE 1: MORNING ROUTINE & FOCUS (Start -> 12:30 PM) ───
    if (includeBreakfast && initialStartMins <= 510) {
        currentMins = Math.max(currentMins, 480); // 8:00 AM
        appendItem({
            title: 'Morning Routine & Breakfast ☕',
            category: 'meal',
            priority: 'medium',
            duration: 45,
            subtitle: 'Healthy breakfast, shower & prep',
        });
    }

    // Schedule morning work tasks up to 12:30 PM (750 mins)
    const LUNCH_TIME = 750; // 12:30 PM
    while (workQueue.length > 0 && currentMins < LUNCH_TIME && initialStartMins < LUNCH_TIME) {
        const nextTask = workQueue[0];
        const availableBeforeLunch = LUNCH_TIME - currentMins;

        if (availableBeforeLunch < 20) {
            break;
        }

        if (nextTask.duration <= availableBeforeLunch) {
            workQueue.shift();
            appendItem({
                title: nextTask.title,
                category: nextTask.category,
                priority: nextTask.priority,
                duration: nextTask.duration,
                subtitle: nextTask.category === 'development' ? 'Deep Work Block' : 'Scheduled Plan',
            });
            if (includeRestBlocks && LUNCH_TIME - currentMins >= 45 && workQueue.length > 0) {
                appendItem({
                    title: 'Morning Stretch & Hydration 💧',
                    category: 'break',
                    priority: 'medium',
                    duration: 15,
                    subtitle: 'Quick stretch, posture reset & water',
                });
            }
        } else {
            workQueue.shift();
            const morningPartDuration = Math.max(30, Math.floor(availableBeforeLunch / 15) * 15);
            const remainingDuration = nextTask.duration - morningPartDuration;

            appendItem({
                title: nextTask.title,
                category: nextTask.category,
                priority: nextTask.priority,
                duration: morningPartDuration,
                subtitle: nextTask.category === 'development' ? 'Deep Work Block' : 'Scheduled Plan',
            });

            if (remainingDuration >= 15) {
                workQueue.unshift({
                    ...nextTask,
                    title: nextTask.title.includes('(Part') ? nextTask.title : `${nextTask.title} (Continuation)`,
                    duration: remainingDuration,
                });
            }
            break;
        }
    }

    // ─── ZONE 2: MIDDAY NOURISHMENT & LUNCH (Strictly 12:30 PM - 1:30 PM) ───
    if (includeLunch && initialStartMins <= 780) {
        currentMins = Math.max(currentMins, LUNCH_TIME); // 12:30 PM
        appendItem({
            title: 'Lunch Break & Mindful Rest 🥗',
            category: 'meal',
            priority: 'medium',
            duration: 60,
            subtitle: 'Nutritious meal & mental reset',
        });
    }

    const isEveningStart = initialStartMins >= 1080; // >= 6:00 PM
    const isLateEveningStart = initialStartMins >= 1140; // >= 7:00 PM
    const isNightStart = initialStartMins >= 1260; // >= 9:00 PM (Dinner is already past; user tasks start immediately)

    // ─── ZONE 3: AFTERNOON / EARLY EVENING (1:30 PM - Dinner) ───
    const DINNER_TIME = isLateEveningStart ? 1260 : 1170; // 9:00 PM or 7:30 PM
    if (currentMins < 810 && initialStartMins <= 810) {
        currentMins = 810; // 1:30 PM
    }

    let workCount = 0;
    while (workQueue.length > 0 && currentMins < DINNER_TIME && !isNightStart) {
        const nextTask = workQueue[0];
        const availableBeforeDinner = DINNER_TIME - currentMins;

        if (availableBeforeDinner < 20) {
            break;
        }

        if (nextTask.duration <= availableBeforeDinner) {
            workQueue.shift();
            workCount++;
            appendItem({
                title: nextTask.title,
                category: nextTask.category,
                priority: nextTask.priority,
                duration: nextTask.duration,
                subtitle: nextTask.category === 'development' ? 'Deep Work Block' : 'Scheduled Plan',
            });

            if (includeRestBlocks && workCount === 1 && DINNER_TIME - currentMins >= 60) {
                appendItem({
                    title: isEveningStart ? 'Mental Refresh & Stretch 🧘' : 'Afternoon Recharge & Coffee ☕',
                    category: 'break',
                    priority: 'medium',
                    duration: 30,
                    subtitle: 'Hydration & short walk',
                });
            }
        } else {
            workQueue.shift();
            const afternoonPartDuration = Math.max(30, Math.floor(availableBeforeDinner / 15) * 15);
            const remainingDuration = nextTask.duration - afternoonPartDuration;

            appendItem({
                title: nextTask.title,
                category: nextTask.category,
                priority: nextTask.priority,
                duration: afternoonPartDuration,
                subtitle: nextTask.category === 'development' ? 'Deep Work Block' : 'Scheduled Plan',
            });

            if (remainingDuration >= 15) {
                workQueue.unshift({
                    ...nextTask,
                    title: nextTask.title.includes('(Continuation') ? nextTask.title : `${nextTask.title} (Evening Session)`,
                    duration: remainingDuration,
                });
            }
            break;
        }
    }

    // ─── ZONE 4: EVENING WALK, DINNER & NIGHT RECOVERY ───
    // Only schedule Dinner if start was before 9:00 PM. For late starts (>= 9:00 PM), dinner has passed and user tasks start immediately.
    if (includeDinner && initialStartMins < 1260) {
        currentMins = Math.max(currentMins, isLateEveningStart ? 1260 : 1170); // 9:00 PM or 7:30 PM
        appendItem({
            title: 'Dinner & Family Relaxation 🍽️',
            category: 'meal',
            priority: 'medium',
            duration: 60,
            subtitle: 'Family & nourishing dinner',
        });
    }

    // ─── ZONE 5: EVENING REVIEW & REMAINING USER TASKS ───
    // 100% priority on user-entered tasks: ALL tasks in workQueue MUST be scheduled with full duration!
    if (currentMins < 1260 && initialStartMins < 1260 && includeDinner) {
        currentMins = Math.max(currentMins, 1320); // 10:00 PM (after dinner)
    }

    while (workQueue.length > 0) {
        const nextTask = workQueue.shift()!;
        appendItem({
            title: nextTask.title,
            category: nextTask.category,
            priority: nextTask.priority,
            duration: nextTask.duration,
            subtitle: nextTask.category === 'development' ? 'Deep Work Block' : 'Scheduled Plan',
        });
    }

    // Night Sleep Block: starts after all work tasks are completed (at least 11:00 PM or after late tasks finish)
    if (!schedule.some((s) => s.category === 'sleep')) {
        currentMins = Math.max(currentMins, 1380); // 11:00 PM or later
        appendItem({
            title: 'Night Sleep & Recovery 🌙',
            category: 'sleep',
            priority: 'high',
            duration: 60,
            subtitle: 'Essential 7-8 hrs rest for peak performance',
        });
    }

    return schedule;
};

/**
 * Automatically balances and resizes tasks when the user adjusts a single task duration
 * so the total work time always equals the user-allotted work budget,
 * without showing errors or blocking the user.
 */
export const autoBalanceSchedule = (
    items: PlannedRoutineItem[],
    changedItemId: string,
    newDuration: number,
    allottedMinutes: number,
    startHour = 9,
    startMinute = 0
): PlannedRoutineItem[] => {
    const updated = items.map((item) => (item.id === changedItemId ? { ...item, durationMinutes: newDuration } : { ...item }));
    const workItems = updated.filter((item) => item.category !== 'meal' && item.category !== 'sleep' && item.category !== 'break');
    const maxWorkBudget = allottedMinutes;
    let currentWorkTotal = workItems.reduce((sum, item) => sum + item.durationMinutes, 0);

    if (currentWorkTotal > maxWorkBudget) {
        // Decrease other tasks to absorb the increase
        let excess = currentWorkTotal - maxWorkBudget;
        while (excess > 0) {
            const candidates = updated.filter(
                (item) =>
                    item.id !== changedItemId &&
                    item.category !== 'meal' &&
                    item.category !== 'sleep' &&
                    item.durationMinutes > 15
            );

            if (candidates.length === 0) {
                // If other tasks cannot reduce further, clamp the changed task
                const target = updated.find((item) => item.id === changedItemId);
                if (target) {
                    target.durationMinutes = Math.max(15, target.durationMinutes - excess);
                }
                break;
            }

            // Sort by largest duration first
            candidates.sort((a, b) => b.durationMinutes - a.durationMinutes);
            const step = Math.min(15, excess);
            candidates[0].durationMinutes -= step;
            excess -= step;
        }
    } else if (maxWorkBudget - currentWorkTotal >= 15) {
        // Distribute remaining budget to highest priority other tasks
        let deficit = maxWorkBudget - currentWorkTotal;
        while (deficit >= 15) {
            const candidates = updated.filter(
                (item) =>
                    item.id !== changedItemId &&
                    item.category !== 'meal' &&
                    item.category !== 'sleep' &&
                    item.durationMinutes < 120
            );

            if (candidates.length === 0) break;
            candidates.sort((a, b) => a.durationMinutes - b.durationMinutes);
            candidates[0].durationMinutes += 15;
            deficit -= 15;
        }
    }

    return recalculateSequentialSchedule(updated, startHour, startMinute);
};

/**
 * Recalculates start hours and start minutes for a sequence of planned items
 * when user edits individual task durations in the schedule preview.
 */
export const recalculateSequentialSchedule = (
    items: PlannedRoutineItem[],
    startHour = 9,
    startMinute = 0
): PlannedRoutineItem[] => {
    let currentTotalMins = startHour * 60 + startMinute;
    return items.map((item) => {
        const startH = Math.floor(currentTotalMins / 60) % 24;
        const startM = currentTotalMins % 60;
        currentTotalMins += item.durationMinutes;
        return {
            ...item,
            startHour: startH,
            startMinute: startM,
        };
    });
};

export interface EventCollisionInfo {
    colIndex: number;
    totalCols: number;
}

/**
 * Calculates side-by-side positioning for overlapping/colliding routine tasks on the same day.
 * Prevents any task from overshadowing another task.
 */
export const calculateDayEventCollisions = (
    dayItems: PlannedRoutineItem[]
): Map<string, EventCollisionInfo> => {
    const collisionMap = new Map<string, EventCollisionInfo>();
    if (!dayItems || dayItems.length === 0) return collisionMap;

    // Filter valid items and calculate start/end minutes
    const itemsWithTimes = dayItems.map((item) => {
        const start = item.startHour * 60 + item.startMinute;
        const end = start + Math.max(15, item.durationMinutes);
        return { item, start, end };
    });

    // Sort by start time ascending, then by duration descending
    itemsWithTimes.sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start;
        return (b.end - b.start) - (a.end - a.start);
    });

    // Build connected collision clusters
    const clusters: typeof itemsWithTimes[] = [];
    let currentCluster: typeof itemsWithTimes = [];
    let clusterEnd = -1;

    for (const entry of itemsWithTimes) {
        if (currentCluster.length === 0) {
            currentCluster.push(entry);
            clusterEnd = entry.end;
        } else if (entry.start < clusterEnd) {
            // Overlaps with the current cluster
            currentCluster.push(entry);
            clusterEnd = Math.max(clusterEnd, entry.end);
        } else {
            // New cluster
            clusters.push(currentCluster);
            currentCluster = [entry];
            clusterEnd = entry.end;
        }
    }
    if (currentCluster.length > 0) {
        clusters.push(currentCluster);
    }

    // Assign column indices within each cluster
    for (const cluster of clusters) {
        if (cluster.length === 1) {
            collisionMap.set(cluster[0].item.id, { colIndex: 0, totalCols: 1 });
            continue;
        }

        // Column tracking: stores the end time of the last item in that column
        const columnEnds: number[] = [];
        const itemColAssignments: { id: string; colIndex: number }[] = [];

        for (const entry of cluster) {
            let placedCol = -1;
            for (let c = 0; c < columnEnds.length; c++) {
                if (columnEnds[c] <= entry.start) {
                    columnEnds[c] = entry.end;
                    placedCol = c;
                    break;
                }
            }

            if (placedCol === -1) {
                columnEnds.push(entry.end);
                placedCol = columnEnds.length - 1;
            }

            itemColAssignments.push({ id: entry.item.id, colIndex: placedCol });
        }

        const totalCols = columnEnds.length;
        for (const assign of itemColAssignments) {
            collisionMap.set(assign.id, {
                colIndex: assign.colIndex,
                totalCols,
            });
        }
    }

    return collisionMap;
};

/**
 * Resolves all time collisions on a day by sequencing overlapping tasks forward.
 * Ensures zero tasks overlap in time.
 */
export const resolveCollisionsSequentially = (
    dayItems: PlannedRoutineItem[]
): PlannedRoutineItem[] => {
    if (!dayItems || dayItems.length <= 1) return dayItems;

    // Sort items by start time ascending, then by duration descending
    const sorted = [...dayItems].sort((a, b) => {
        const aStart = a.startHour * 60 + a.startMinute;
        const bStart = b.startHour * 60 + b.startMinute;
        if (aStart !== bStart) return aStart - bStart;
        return (b.durationMinutes || 0) - (a.durationMinutes || 0);
    });

    let currentEndMins = 0;
    const resolved: PlannedRoutineItem[] = [];

    for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        let itemStartMins = item.startHour * 60 + item.startMinute;

        // If this item starts before the previous item finishes, sequence it right after
        if (i > 0 && itemStartMins < currentEndMins) {
            itemStartMins = currentEndMins;
        }

        const sH = Math.floor(itemStartMins / 60) % 24;
        const sM = itemStartMins % 60;
        const duration = Math.max(15, item.durationMinutes || 30);

        resolved.push({
            ...item,
            startHour: sH,
            startMinute: sM,
            durationMinutes: duration,
        });

        currentEndMins = itemStartMins + duration;
    }

    return resolved;
};

/**
 * Intelligent Schedule Distribution Engine.
 * Takes a list of tasks and distributes them across appropriate morning, lunch, afternoon, evening, and dinner hours.
 */
export const distributeSmartSchedule = (
    tasks: TaskToSchedule[],
    dateStr: string,
    existingRoutines: PlannedRoutineItem[] = [],
    startHourConstraint = 8,
    endHourConstraint = 23
): PlannedRoutineItem[] => {
    if (!tasks || tasks.length === 0) return [];

    const dayIndex = new Date(dateStr).getDay();
    const busySlots = new Set<number>();

    // Mark existing routines as busy
    existingRoutines
        .filter((r) => r.dateStr === dateStr)
        .forEach((r) => {
            const startH = r.startHour;
            const endH = r.startHour + Math.ceil((r.startMinute + r.durationMinutes) / 60);
            for (let h = startH; h < endH; h++) {
                busySlots.add(h);
            }
        });

    // Classify all incoming tasks
    const classifiedTasks = tasks.map((task, idx) => {
        const slot = inferOptimalSlot(task.title, task.category);
        return {
            originalIndex: idx,
            task,
            slot,
            duration: task.duration || slot.durationMinutes,
            category: task.category || slot.inferredCategory,
            priority: task.priority || 'medium',
        };
    });

    // Sort order:
    // 1. Fixed anchor times (Meals like lunch/dinner/breakfast, rest/recharge, sleep, gym)
    // 2. High priority tasks
    // 3. Natural chronologic order of preferred time
    const fixedKeywords = ['lunch', 'dinner', 'breakfast', 'recharge', 'walk', 'gym', 'workout', 'sleep', 'rest', 'coffee', 'tea'];
    classifiedTasks.sort((a, b) => {
        const aIsFixed = fixedKeywords.some((k) => a.task.title.toLowerCase().includes(k));
        const bIsFixed = fixedKeywords.some((k) => b.task.title.toLowerCase().includes(k));
        if (aIsFixed && !bIsFixed) return -1;
        if (!aIsFixed && bIsFixed) return 1;

        const prioRank = { high: 1, medium: 2, low: 3 };
        if (prioRank[a.priority] !== prioRank[b.priority]) {
            return prioRank[a.priority] - prioRank[b.priority];
        }

        return a.slot.preferredHour - b.slot.preferredHour;
    });

    // Available candidate hours by window
    const windowCandidates: Record<OptimalSlot['timeWindow'], number[]> = {
        morning: [8, 9, 10, 11, 12],
        lunch: [13, 12],
        afternoon: [14, 15, 16, 17],
        evening: [18, 19],
        dinner: [20, 19, 21],
        night: [22, 23],
    };

    const scheduledItems: PlannedRoutineItem[] = [];

    // Schedule each task into its ideal or best-fit available window
    for (const item of classifiedTasks) {
        const preferredH = item.slot.preferredHour;
        let chosenHour: number | null = null;
        let chosenMinute = item.slot.preferredMinute;

        // Try exact preferred hour first if free
        if (!busySlots.has(preferredH) && preferredH >= startHourConstraint && preferredH <= endHourConstraint) {
            chosenHour = preferredH;
        } else {
            // Try window candidates
            const candidates = windowCandidates[item.slot.timeWindow] || [];
            for (const h of candidates) {
                if (!busySlots.has(h) && h >= startHourConstraint && h <= endHourConstraint) {
                    chosenHour = h;
                    break;
                }
            }

            // If window full, find closest free hour
            if (chosenHour === null) {
                for (let offset = 1; offset <= 14; offset++) {
                    const nextH = preferredH + offset;
                    const prevH = preferredH - offset;

                    if (nextH <= endHourConstraint && !busySlots.has(nextH) && nextH >= startHourConstraint) {
                        chosenHour = nextH;
                        break;
                    }
                    if (prevH >= startHourConstraint && !busySlots.has(prevH) && prevH <= endHourConstraint) {
                        chosenHour = prevH;
                        break;
                    }
                }
            }
        }

        // Fallback to startHourConstraint if somehow still unassigned
        if (chosenHour === null) {
            chosenHour = startHourConstraint;
            while (busySlots.has(chosenHour) && chosenHour < endHourConstraint) {
                chosenHour++;
            }
        }

        // Mark this slot as busy
        const spanHours = Math.max(1, Math.ceil((chosenMinute + item.duration) / 60));
        for (let h = chosenHour; h < chosenHour + spanHours; h++) {
            busySlots.add(h);
        }

        scheduledItems.push({
            id: item.task.id || `smart-routine-${Date.now()}-${item.originalIndex}-${Math.random().toString(36).substring(2, 5)}`,
            title: item.task.title.trim(),
            category: item.category,
            priority: item.priority,
            dayIndex,
            dateStr,
            startHour: chosenHour,
            startMinute: chosenMinute,
            durationMinutes: item.duration,
            completed: false,
            subtitle: item.task.subtitle || (item.category === 'development' ? 'Deep Work Block' : 'Scheduled Plan'),
        });
    }

    // Sort final items chronologically
    scheduledItems.sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));
    return scheduledItems;
};

/**
 * Finds the single best open slot for a newly added task without clashing with existing routines.
 */
export const findSmartSlotForSingleTask = (
    title: string,
    dateStr: string,
    existingRoutines: PlannedRoutineItem[],
    category?: PlannedRoutineItem['category']
): PlannedRoutineItem => {
    const slot = inferOptimalSlot(title, category);
    const dayIndex = new Date(dateStr).getDay();
    const busyHours = new Set(
        existingRoutines.filter((r) => r.dateStr === dateStr).map((r) => r.startHour)
    );

    const now = new Date();
    const isToday = dateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const minHour = isToday ? Math.max(now.getHours() + 1, 8) : 8;

    let targetHour = slot.preferredHour;

    // If preferred hour is already past or busy, find next available window
    if (targetHour < minHour || busyHours.has(targetHour)) {
        const windowCandidates: Record<OptimalSlot['timeWindow'], number[]> = {
            morning: [8, 9, 10, 11, 12],
            lunch: [13, 12],
            afternoon: [14, 15, 16, 17],
            evening: [18, 19],
            dinner: [20, 19, 21],
            night: [22, 23],
        };

        const candidates = (windowCandidates[slot.timeWindow] || []).filter((h) => h >= minHour && !busyHours.has(h));
        if (candidates.length > 0) {
            targetHour = candidates[0];
        } else {
            targetHour = minHour;
            while (busyHours.has(targetHour) && targetHour < 22) {
                targetHour++;
            }
        }
    }

    return {
        id: `task-sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: title.trim(),
        category: category || slot.inferredCategory,
        priority: 'high',
        dayIndex,
        dateStr,
        startHour: targetHour,
        startMinute: slot.preferredMinute,
        durationMinutes: slot.durationMinutes,
        completed: false,
        subtitle: 'Created from Tasks & Goals',
    };
};

export interface WeeklyScheduleOptions {
    weekDates: string[]; // Active dates to schedule (e.g. Mon-Fri or Mon-Sun)
    tasks: TaskToSchedule[];
    totalWeeklyHours?: number; // Total weekly work budget across all active days (e.g. 10 hours)
    dailyAllottedHours?: number; // Fallback daily work budget
    defaultStartHour?: number; // e.g. 9 AM
    todayDateStr?: string;
    todayCurrentHour?: number;
    includeBreakfast?: boolean;
    includeLunch?: boolean;
    includeRestBlocks?: boolean;
    includeDinner?: boolean;
}

/**
 * Generates an intelligent, non-colliding weekly schedule across selected week dates.
 * Divides total weekly work hours across active days (e.g. 10h total across 5 work days = 2h/day).
 */
export const generateWeeklySmartSchedule = (
    options: WeeklyScheduleOptions
): PlannedRoutineItem[] => {
    const {
        weekDates,
        tasks,
        totalWeeklyHours,
        dailyAllottedHours,
        defaultStartHour = 9,
        todayDateStr = '',
        todayCurrentHour = 8,
        includeBreakfast = false,
        includeLunch = true,
        includeRestBlocks = true,
        includeDinner = true,
    } = options;

    if (!weekDates || weekDates.length === 0) return [];

    const fullWeeklySchedule: PlannedRoutineItem[] = [];
    const pool = [...tasks];

    // Filter active week dates: exclude strictly past dates (< todayDateStr)
    const validWeekDates = todayDateStr
        ? weekDates.filter((dStr) => dStr >= todayDateStr)
        : weekDates;

    if (validWeekDates.length === 0) return [];

    // Calculate daily work minutes from total weekly budget across the remaining valid dates
    const dailyMinutes = totalWeeklyHours !== undefined
        ? Math.max(30, Math.round((totalWeeklyHours * 60) / validWeekDates.length))
        : Math.max(30, (dailyAllottedHours || 4) * 60);

    // For each date, generate a clean forward smart schedule with all user tasks included
    for (let i = 0; i < validWeekDates.length; i++) {
        const dateStr = validWeekDates[i];
        const isToday = dateStr === todayDateStr;

        let dayStartHour = defaultStartHour;
        let dayAllottedMinutes = dailyMinutes;

        // If today, only schedule future available hours (excluding past times)
        if (isToday) {
            const nextAvailableHour = todayCurrentHour + 1;
            if (nextAvailableHour >= 22) {
                // If it's already late night (>= 10 PM), skip today
                continue;
            }
            if (nextAvailableHour > defaultStartHour) {
                dayStartHour = nextAvailableHour;
                const remainingMinutesToday = Math.max(30, (23 - dayStartHour) * 60);
                dayAllottedMinutes = Math.min(dailyMinutes, remainingMinutesToday);
            }
        }

        const finalDayTasks: TaskToSchedule[] =
            pool.length > 0
                ? [...pool]
                : [
                      { title: 'Core Focus & Deep Work', category: 'development' },
                      { title: 'Task Execution & Review', category: 'writing' },
                  ];

        const daySchedule = generateForwardSmartSchedule({
            tasks: finalDayTasks,
            allottedMinutes: dayAllottedMinutes,
            startHour: dayStartHour,
            startMinute: 0,
            dateStr,
            includeBreakfast: isToday && dayStartHour > 10 ? false : includeBreakfast,
            includeLunch: isToday && dayStartHour > 14 ? false : includeLunch,
            includeRestBlocks: isToday && dayStartHour > 18 ? false : includeRestBlocks,
            includeDinner: isToday && dayStartHour > 20 ? false : includeDinner,
        });

        fullWeeklySchedule.push(...daySchedule);
    }

    return fullWeeklySchedule;
};

