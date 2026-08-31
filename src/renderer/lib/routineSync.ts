import { PlannedRoutineItem } from '../components/Routine';
import { findSmartSlotForSingleTask, distributeSmartSchedule } from './smartScheduler';

const formatDateStr = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Automatically slots any task or goal created in the app into the Routine master calendar
 * using realistic circadian human scheduling (meals at lunchtime/dinnertime, leetcode/dev in morning, creative in afternoon).
 */
export const syncTaskToRoutineCalendar = (title: string, customCategory?: PlannedRoutineItem['category']) => {
    if (!title || !title.trim()) return;

    try {
        const saved = localStorage.getItem('produchive_master_routines');
        const routines: PlannedRoutineItem[] = saved ? JSON.parse(saved) : [];

        const now = new Date();
        const todayStr = formatDateStr(now);

        // Check if an item with this title is already scheduled today
        const exists = routines.some(
            (r) => r.dateStr === todayStr && r.title.trim().toLowerCase() === title.trim().toLowerCase()
        );
        if (exists) return;

        const newRoutine = findSmartSlotForSingleTask(title, todayStr, routines, customCategory);

        routines.push(newRoutine);
        localStorage.setItem('produchive_master_routines', JSON.stringify(routines));
        window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
    } catch (e) {
        console.error('Failed to sync task to Routine calendar:', e);
    }
};

/**
 * Syncs multiple goals/tasks (e.g. from Welcome modal or Goal list) with full multi-task distribution.
 */
export const syncMultipleGoalsToRoutineCalendar = (goals: string[]) => {
    if (!goals || goals.length === 0) return;

    try {
        const saved = localStorage.getItem('produchive_master_routines');
        const routines: PlannedRoutineItem[] = saved ? JSON.parse(saved) : [];

        const now = new Date();
        const todayStr = formatDateStr(now);

        const newTasksToSchedule = goals
            .filter((g) => g && g.trim())
            .filter(
                (g) =>
                    !routines.some(
                        (r) => r.dateStr === todayStr && r.title.trim().toLowerCase() === g.trim().toLowerCase()
                    )
            )
            .map((g) => ({ title: g.trim() }));

        if (newTasksToSchedule.length === 0) return;

        const distributed = distributeSmartSchedule(newTasksToSchedule, todayStr, routines);
        const updated = [...routines, ...distributed];

        localStorage.setItem('produchive_master_routines', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
    } catch (e) {
        console.error('Failed to distribute goals to Routine calendar:', e);
    }
};
