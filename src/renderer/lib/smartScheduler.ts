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
