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
export const allocateProductiveTaskDurations = (
    tasks: { title: string; category?: PlannedRoutineItem['category']; priority?: 'high' | 'medium' | 'low' }[],
    totalAllottedMinutes: number
): { title: string; category: PlannedRoutineItem['category']; priority: PlannedRoutineItem['priority']; duration: number }[] => {
    if (!tasks || tasks.length === 0) return [];
    if (totalAllottedMinutes <= 0) totalAllottedMinutes = 240; // Default 4h

    // 1. Calculate weight for each task based on cognitive depth & productivity
    const scoredTasks = tasks.map((t) => {
        const slot = inferOptimalSlot(t.title, t.category);
        const cat = t.category || slot.inferredCategory;
        const lowTitle = t.title.toLowerCase();

        let weight = 2.0;
        // Deep work / high cognitive tasks get highest weight
        if (
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
            lowTitle.includes('study') ||
            lowTitle.includes('exam')
        ) {
            weight = 3.5;
        } else if (
            cat === 'design' ||
            cat === 'writing' ||
            lowTitle.includes('design') ||
            lowTitle.includes('doc') ||
            lowTitle.includes('article') ||
            lowTitle.includes('research')
        ) {
            weight = 2.5;
        } else if (
            cat === 'meeting' ||
            lowTitle.includes('meeting') ||
            lowTitle.includes('sync') ||
            lowTitle.includes('email') ||
            lowTitle.includes('admin') ||
            lowTitle.includes('call')
        ) {
            weight = 1.2;
        }

        if (t.priority === 'high') weight *= 1.2;
        else if (t.priority === 'low') weight *= 0.8;

        return {
            title: t.title,
            category: cat,
            priority: (t.priority || 'high') as PlannedRoutineItem['priority'],
            weight,
        };
    });

    const totalWeight = scoredTasks.reduce((sum, t) => sum + t.weight, 0);

    // 2. Initial duration allocation in 15-minute steps
    let allocated = scoredTasks.map((t) => {
        const rawMins = (t.weight / totalWeight) * totalAllottedMinutes;
        // Snap to nearest 15 mins (minimum 15 mins)
        let snapped = Math.max(15, Math.round(rawMins / 15) * 15);
        return {
            ...t,
            duration: snapped,
        };
    });

    // 3. Rebalance so sum(durations) <= totalAllottedMinutes
    let currentTotal = allocated.reduce((sum, t) => sum + t.duration, 0);

    // If total exceeds allotted budget, decrement 15m from largest / lowest weight items
    while (currentTotal > totalAllottedMinutes) {
        const candidates = allocated
            .map((item, idx) => ({ ...item, idx }))
            .filter((item) => item.duration > 15)
            .sort((a, b) => (b.duration / b.weight) - (a.duration / a.weight));

        if (candidates.length === 0) break;
        allocated[candidates[0].idx].duration -= 15;
        currentTotal -= 15;
    }

    // If total is significantly less than allotted budget, give extra 15m to highest weight items (cap at 120m)
    while (totalAllottedMinutes - currentTotal >= 15) {
        const candidates = allocated
            .map((item, idx) => ({ ...item, idx }))
            .filter((item) => item.duration < 120)
            .sort((a, b) => b.weight - a.weight);

        if (candidates.length === 0) break;
        allocated[candidates[0].idx].duration += 15;
        currentTotal += 15;
    }

    return allocated.map(({ title, category, priority, duration }) => ({
        title,
        category,
        priority,
        duration,
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
        quote: "Your future is created by what you do today, not tomorrow.",
        author: "Robert Kiyosaki",
    },
];

export const SLEEP_QUOTES = [
    {
        quote: "Sleep is the ultimate cognitive enhancer. Rest tonight, dominate tomorrow.",
        author: "Peak Performance Habit",
    },
    {
        quote: "Rest is not idleness; it is the fuel for tomorrow's brilliance.",
        author: "Marcus Aurelius",
    },
    {
        quote: "Deep work requires deep recovery. Protect your sleep like your code.",
        author: "Productivity Law",
    },
    {
        quote: "A well-rested mind solves in 20 minutes what an exhausted mind struggles with for 3 hours.",
        author: "Cognitive Focus",
    },
    {
        quote: "Take rest; a field that has rested gives a bountiful crop.",
        author: "Ovid",
    },
    {
        quote: "Sleep is the best meditation and the multiplier of mental stamina.",
        author: "Dalai Lama",
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
        const quote = SLEEP_QUOTES[Math.floor(Math.random() * SLEEP_QUOTES.length)];
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
 * Forward Smart Schedule Generator.
 * Allocates the full user-allotted time to their work tasks, placing relevant breaks/meals
 * cleanly without stealing their work budget, and strictly in future hours.
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
    const startMins = startHour * 60 + startMinute;
    const endMins = startMins + allottedMinutes;

    // 1. Identify relevant fixed meals/breaks that fall strictly within [startMins, endMins + 60]
    const breakBlocks: { title: string; category: PlannedRoutineItem['category']; preferredMins: number; duration: number; subtitle: string }[] = [];

    // Breakfast: 8:00 AM (480 mins, 45 mins)
    if (includeBreakfast && startMins <= 480 && endMins >= 525) {
        breakBlocks.push({
            title: 'Breakfast & Morning Routine ☕',
            category: 'meal',
            preferredMins: Math.max(startMins, 480),
            duration: 45,
            subtitle: 'Healthy breakfast & mindset prep',
        });
    }

    // Lunch: 1:00 PM (780 mins, 60 mins)
    if (includeLunch && startMins <= 780 && endMins >= 840) {
        breakBlocks.push({
            title: 'Lunch Break & Recharge 🥗',
            category: 'meal',
            preferredMins: Math.max(startMins, 780),
            duration: 60,
            subtitle: 'Healthy meal & fresh air',
        });
    }

    // Rest Blocks (Afternoon recharge & Evening walk)
    if (includeRestBlocks) {
        if (startMins <= 990 && endMins >= 1020) { // 4:30 PM (990 mins)
            breakBlocks.push({
                title: 'Afternoon Recharge & Coffee ☕',
                category: 'break',
                preferredMins: Math.max(startMins, 990),
                duration: 30,
                subtitle: 'Hydration & quick stretch',
            });
        }
        if (startMins <= 1110 && endMins >= 1140) { // 6:30 PM (1110 mins)
            breakBlocks.push({
                title: 'Evening Walk & Unwind 🌿',
                category: 'break',
                preferredMins: Math.max(startMins, 1110),
                duration: 30,
                subtitle: 'Fresh air & mental recovery',
            });
        }
    }

    // Dinner: 8:00 PM (1200 mins, 60 mins)
    if (includeDinner && startMins <= 1200 && (endMins >= 1200 || startMins >= 1140)) {
        breakBlocks.push({
            title: 'Dinner & Relaxation 🍽️',
            category: 'meal',
            preferredMins: Math.max(startMins, 1200),
            duration: 60,
            subtitle: 'Family / Rest & nourishment',
        });
    }

    // 2. Allocate the FULL allottedMinutes to the user's productive tasks (do not steal work budget for meals)
    const allocatedWorkTasks = allocateProductiveTaskDurations(tasks, allottedMinutes);

    // 3. Sequentially build the schedule from startMins forward
    const schedule: PlannedRoutineItem[] = [];
    let currentMins = startMins;
    const taskQueue = [...allocatedWorkTasks];
    const breakQueue = [...breakBlocks].sort((a, b) => a.preferredMins - b.preferredMins);

    while (taskQueue.length > 0 || breakQueue.length > 0) {
        // Check if next item should be a break that was reached
        if (breakQueue.length > 0 && breakQueue[0].preferredMins <= currentMins) {
            const nextBreak = breakQueue.shift()!;
            const sH = Math.floor(currentMins / 60) % 24;
            const sM = currentMins % 60;
            schedule.push({
                id: `break-${Date.now()}-${schedule.length}-${Math.random().toString(36).substring(2, 5)}`,
                title: nextBreak.title,
                category: nextBreak.category,
                priority: 'medium',
                dayIndex,
                dateStr,
                startHour: sH,
                startMinute: sM,
                durationMinutes: nextBreak.duration,
                completed: false,
                subtitle: nextBreak.subtitle,
            });
            currentMins += nextBreak.duration;
            continue;
        }

        // If there's a task in queue, schedule it
        if (taskQueue.length > 0) {
            const nextTask = taskQueue.shift()!;
            const sH = Math.floor(currentMins / 60) % 24;
            const sM = currentMins % 60;
            schedule.push({
                id: `task-${Date.now()}-${schedule.length}-${Math.random().toString(36).substring(2, 5)}`,
                title: nextTask.title,
                category: nextTask.category,
                priority: nextTask.priority,
                dayIndex,
                dateStr,
                startHour: sH,
                startMinute: sM,
                durationMinutes: nextTask.duration,
                completed: false,
                subtitle: nextTask.category === 'development' ? 'Deep Work Block' : 'Scheduled Plan',
            });
            currentMins += nextTask.duration;
            continue;
        }

        // If remaining break in queue
        if (breakQueue.length > 0) {
            const nextBreak = breakQueue.shift()!;
            const sH = Math.floor(currentMins / 60) % 24;
            const sM = currentMins % 60;
            schedule.push({
                id: `break-${Date.now()}-${schedule.length}-${Math.random().toString(36).substring(2, 5)}`,
                title: nextBreak.title,
                category: nextBreak.category,
                priority: 'medium',
                dayIndex,
                dateStr,
                startHour: sH,
                startMinute: sM,
                durationMinutes: nextBreak.duration,
                completed: false,
                subtitle: nextBreak.subtitle,
            });
            currentMins += nextBreak.duration;
        }
    }

    // 4. Night Sleep indicator only if schedule finishes late into night (>= 23:00 / 11 PM or midnight)
    if (currentMins >= 1380 && !schedule.some((s) => s.category === 'sleep')) {
        const sH = Math.floor(currentMins / 60) % 24;
        const sM = currentMins % 60;
        schedule.push({
            id: `sleep-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            title: 'Night Sleep & Recovery 🌙',
            category: 'sleep',
            priority: 'high',
            dayIndex,
            dateStr,
            startHour: sH,
            startMinute: sM,
            durationMinutes: 60,
            completed: false,
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
    
    // Find all work tasks (excluding meal/sleep)
    const workItems = updated.filter((item) => item.category !== 'meal' && item.category !== 'sleep');
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
