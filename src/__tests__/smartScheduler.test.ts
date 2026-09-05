import { describe, it, expect } from 'vitest';
import {
    allocateProductiveTaskDurations,
    generateForwardSmartSchedule,
    generateWeeklySmartSchedule,
    autoBalanceSchedule,
    getMindsetCardData,
    calculateDayEventCollisions,
    recalculateSequentialSchedule,
    isOccupationBlock
} from '../renderer/lib/smartScheduler';

describe('smartScheduler - Forward Planning & Auto-Balancing', () => {
    it('should allocate durations that strictly do not exceed the allotted time', () => {
        const tasks = [
            { title: 'Leetcode DSA practice' },
            { title: 'Fix auth bug' },
            { title: 'Write documentation' },
            { title: 'Team sync meeting' },
        ];

        const allottedMinutes = 240; // 4 hours
        const allocated = allocateProductiveTaskDurations(tasks, allottedMinutes);

        expect(allocated).toHaveLength(4);
        const totalAllocated = allocated.reduce((sum, t) => sum + t.duration, 0);
        expect(totalAllocated).toBeLessThanOrEqual(allottedMinutes);
        expect(totalAllocated).toBeGreaterThanOrEqual(180);
    });

    it('gives full allotted work time to user task when 2 hours is selected', () => {
        const tasks = [{ title: 'editing' }];
        const allottedMinutes = 120; // 2 hours

        const schedule = generateForwardSmartSchedule({
            tasks,
            allottedMinutes,
            startHour: 19, // 7 PM
            startMinute: 0,
            dateStr: '2026-08-31',
            includeDinner: true,
        });

        const editingTask = schedule.find((s) => s.title === 'editing');
        expect(editingTask).toBeDefined();
        // User requested 2 hours, so editing gets the full 2 hours (120 mins)
        expect(editingTask!.durationMinutes).toBe(120);

        const productiveMins = schedule
            .filter((item) => item.category !== 'meal' && item.category !== 'sleep' && item.category !== 'break')
            .reduce((sum, item) => sum + item.durationMinutes, 0);
        expect(productiveMins).toBe(120);
    });

    it('gives more priority and higher time to core productive/coding tasks', () => {
        const tasks = [
            { title: 'Build new feature backend and frontend' },
            { title: 'Email checking and admin' },
        ];

        const allottedMinutes = 180; // 3 hours
        const allocated = allocateProductiveTaskDurations(tasks, allottedMinutes);

        const codingTask = allocated.find((t) => t.title.includes('Build new feature'));
        const adminTask = allocated.find((t) => t.title.includes('Email'));

        expect(codingTask).toBeDefined();
        expect(adminTask).toBeDefined();
        expect(codingTask!.duration).toBeGreaterThan(adminTask!.duration);
    });

    it('generates forward schedule starting strictly in future from 18:00 (6 PM) onwards', () => {
        const tasks = [
            { title: 'Gaming stream' },
            { title: 'Leetcode practice' },
        ];

        // 6 hours available starting at 18:00 (6 PM)
        const schedule = generateForwardSmartSchedule({
            tasks,
            allottedMinutes: 360,
            startHour: 18,
            startMinute: 0,
            dateStr: '2026-08-31',
            includeBreakfast: true, // Should be omitted because 18:00 > 8:00 AM
            includeLunch: true,     // Should be omitted because 18:00 > 1:00 PM
            includeDinner: true,    // Included at 20:00 (8:00 PM)
        });

        expect(schedule.length).toBeGreaterThanOrEqual(2);
        // First task starts at 18:00
        expect(schedule[0].startHour).toBe(18);
        expect(schedule[0].startMinute).toBe(0);

        // No tasks in morning/lunch
        expect(schedule.every((item) => item.startHour >= 18 || item.startHour <= 2)).toBe(true);
        expect(schedule.some((item) => item.title.includes('Breakfast'))).toBe(false);
        expect(schedule.some((item) => item.title.includes('Lunch'))).toBe(false);
    });

    it('returns focus quote for evening routine ending before 10:30 PM and sleep quote for late night', () => {
        // Evening routine ending at 9 PM (21:00)
        const eveningSchedule: any[] = [
            { startHour: 19, startMinute: 0, durationMinutes: 120, category: 'development' },
        ];
        const eveningCard = getMindsetCardData(eveningSchedule, 2, 19);
        expect(eveningCard.type).toBe('productivity');
        expect(eveningCard.title).toContain('Focus & Execution');
        expect(eveningCard.tip).toContain('11 PM');

        // Late night routine ending at 11:30 PM (23:30)
        const lateSchedule: any[] = [
            { startHour: 22, startMinute: 0, durationMinutes: 90, category: 'development' },
        ];
        const lateCard = getMindsetCardData(lateSchedule, 1.5, 22);
        expect(lateCard.type).toBe('sleep');
        expect(lateCard.title).toContain('Rest & Recovery');
    });

    it('auto-balances other tasks when user increases a task duration without exceeding budget', () => {
        const items: any[] = [
            { id: '1', title: 'Task 1', category: 'development', startHour: 18, startMinute: 0, durationMinutes: 60 },
            { id: '2', title: 'Task 2', category: 'development', startHour: 19, startMinute: 0, durationMinutes: 60 },
            { id: '3', title: 'Task 3', category: 'development', startHour: 20, startMinute: 0, durationMinutes: 60 },
        ];

        const allottedMinutes = 180; // 3 hours

        // Increase Task 1 from 60 to 90 mins
        const balanced = autoBalanceSchedule(items, '1', 90, allottedMinutes, 18, 0);

        const totalWork = balanced.filter(i => i.category !== 'meal' && i.category !== 'sleep').reduce((sum, item) => sum + item.durationMinutes, 0);
        expect(totalWork).toBe(allottedMinutes);
        expect(balanced.find((i) => i.id === '1')!.durationMinutes).toBe(90);
    });

    it('gracefully handles colliding/overlapping tasks with side-by-side split columns', () => {
        const dayItems: any[] = [
            { id: 'video-editing', title: 'video editing', startHour: 19, startMinute: 0, durationMinutes: 180 }, // 7 PM - 10 PM
            { id: 'dinner', title: 'Dinner', startHour: 21, startMinute: 0, durationMinutes: 60 },                 // 9 PM - 10 PM
        ];

        const collisions = calculateDayEventCollisions(dayItems);
        const editingCollision = collisions.get('video-editing');
        const dinnerCollision = collisions.get('dinner');

        expect(editingCollision).toBeDefined();
        expect(dinnerCollision).toBeDefined();
        // Both belong to a 2-column collision cluster
        expect(editingCollision!.totalCols).toBe(2);
        expect(dinnerCollision!.totalCols).toBe(2);
        // They occupy distinct side-by-side columns (0 and 1)
        expect(editingCollision!.colIndex).not.toBe(dinnerCollision!.colIndex);
    });

    it('assigns single column (100% width) to non-overlapping tasks', () => {
        const dayItems: any[] = [
            { id: 'task-1', title: 'Task 1', startHour: 9, startMinute: 0, durationMinutes: 60 },  // 9 AM - 10 AM
            { id: 'task-2', title: 'Task 2', startHour: 11, startMinute: 0, durationMinutes: 60 }, // 11 AM - 12 PM
        ];

        const collisions = calculateDayEventCollisions(dayItems);
        expect(collisions.get('task-1')!.totalCols).toBe(1);
        expect(collisions.get('task-1')!.colIndex).toBe(0);
        expect(collisions.get('task-2')!.totalCols).toBe(1);
        expect(collisions.get('task-2')!.colIndex).toBe(0);
    });

    it('generates a full 7-day weekly schedule distributed across week dates', () => {
        const weekDates = [
            '2026-08-31',
            '2026-09-01',
            '2026-09-02',
            '2026-09-03',
            '2026-09-04',
            '2026-09-05',
            '2026-09-06',
        ];

        const tasks = [
            { title: 'Build OAuth backend', category: 'development' as const },
            { title: 'Refactor UI state', category: 'development' as const },
            { title: 'Write integration tests', category: 'development' as const },
            { title: 'Review pull requests', category: 'writing' as const },
        ];

        const weeklySchedule = generateWeeklySmartSchedule({
            weekDates,
            tasks,
            dailyAllottedHours: 4,
            defaultStartHour: 9,
            includeLunch: true,
            includeDinner: true,
            includeRestBlocks: true,
        });

        // Every day of the 7 days must have scheduled tasks
        for (const dStr of weekDates) {
            const dayItems = weeklySchedule.filter((item) => item.dateStr === dStr);
            expect(dayItems.length).toBeGreaterThan(0);
            expect(dayItems[0].startHour).toBe(9);
            // Ensure zero collisions on that day
            const dayCollisions = calculateDayEventCollisions(dayItems);
            for (const item of dayItems) {
                expect(dayCollisions.get(item.id)!.totalCols).toBe(1);
            }
        }
    });

    it('distributes total weekly hours across 5-day work week (Monday to Friday)', () => {
        const workWeekDates = [
            '2026-08-31', // Mon
            '2026-09-01', // Tue
            '2026-09-02', // Wed
            '2026-09-03', // Thu
            '2026-09-04', // Fri
        ];

        const tasks = [
            { title: 'System design study', category: 'development' as const },
            { title: 'Leetcode', category: 'development' as const },
            { title: 'Video editing', category: 'writing' as const },
        ];

        // 10 hours total across 5 work days = 2 hours (120 mins) per day
        const weeklySchedule = generateWeeklySmartSchedule({
            weekDates: workWeekDates,
            tasks,
            totalWeeklyHours: 10,
            defaultStartHour: 9,
            includeLunch: true,
            includeDinner: false,
            includeRestBlocks: false,
        });

        for (const dStr of workWeekDates) {
            const dayItems = weeklySchedule.filter((item) => item.dateStr === dStr);
            const workMins = dayItems
                .filter((item) => item.category !== 'meal' && item.category !== 'sleep' && item.category !== 'break')
                .reduce((sum, item) => sum + item.durationMinutes, 0);

            // Each day should have 120 minutes (2h) of work
            expect(workMins).toBe(120);
        }
    });

    it('allocates large deep work time to editing/coding and small time to admin tasks', () => {
        const tasks = [
            { title: 'Video Editing', category: 'development' as const },
            { title: 'Answer emails and check messages', category: 'meeting' as const },
        ];

        // 4 hours (240 mins) total budget
        const allocated = allocateProductiveTaskDurations(tasks, 240);

        const editingTask = allocated.find((t) => t.title.toLowerCase().includes('editing'))!;
        const emailTask = allocated.find((t) => t.title.toLowerCase().includes('email'))!;

        expect(editingTask).toBeDefined();
        expect(emailTask).toBeDefined();

        // Deep work task gets the majority of time (at least 3 hours / 180 mins)
        expect(editingTask.duration).toBeGreaterThanOrEqual(180);
        // Admin task gets small capped time (<= 45 mins)
        expect(emailTask.duration).toBeLessThanOrEqual(45);
        // Total equals allotted budget
        expect(editingTask.duration + emailTask.duration).toBe(240);
    });

    it('includes all 4 selected tasks in each scheduled day and excludes past time', () => {
        const weekDates = [
            '2026-08-31', // Mon (Today)
            '2026-09-01', // Tue
            '2026-09-02', // Wed
        ];

        const tasks = [
            { title: 'Code Review & PRs', category: 'writing' as const },
            { title: 'Leetcode & DSA', category: 'development' as const },
            { title: 'Video Editing', category: 'writing' as const },
            { title: 'System Design Study', category: 'development' as const },
        ];

        const weeklySchedule = generateWeeklySmartSchedule({
            weekDates,
            tasks,
            totalWeeklyHours: 12,
            defaultStartHour: 9,
            todayDateStr: '2026-08-31',
            todayCurrentHour: 20, // 8 PM (late evening)
            includeLunch: true,
            includeDinner: true,
            includeRestBlocks: true,
        });

        // For upcoming full day (Tue: 2026-09-01), all 4 tasks must be present in the day's schedule
        const tuesdayItems = weeklySchedule.filter((item) => item.dateStr === '2026-09-01');
        const tuesdayTaskTitles = tuesdayItems
            .filter((item) => item.category !== 'meal' && item.category !== 'sleep' && item.category !== 'break')
            .map((item) => item.title);

        expect(tuesdayTaskTitles).toContain('Code Review & PRs');
        expect(tuesdayTaskTitles).toContain('Leetcode & DSA');
        expect(tuesdayTaskTitles).toContain('Video Editing');
        expect(tuesdayTaskTitles).toContain('System Design Study');

        // On Monday (at 8 PM), no past events (at 9 AM, 11 AM, etc.) should exist
        const mondayItems = weeklySchedule.filter((item) => item.dateStr === '2026-08-31');
        for (const item of mondayItems) {
            expect(item.startHour).toBeGreaterThanOrEqual(21);
        }
    });

    it('penalizes unproductive activities (sleep, yt, insta, fiddling) and caps them to small duration', () => {
        const tasks = [
            { title: 'Leetcode & System Design', category: 'development' as const },
            { title: 'watch yt & doomscroll insta', category: 'other' as const },
            { title: 'fiddling around', category: 'other' as const },
        ];

        // 4 hours (240 mins) budget
        const allocated = allocateProductiveTaskDurations(tasks, 240);

        const deepWork = allocated.find((t) => t.title.includes('Leetcode'))!;
        const ytTask = allocated.find((t) => t.title.includes('watch yt'))!;
        const fiddleTask = allocated.find((t) => t.title.includes('fiddling'))!;

        expect(deepWork).toBeDefined();
        expect(ytTask).toBeDefined();
        expect(fiddleTask).toBeDefined();

        // Deep work gets vast majority of hours (>= 180 mins)
        expect(deepWork.duration).toBeGreaterThanOrEqual(180);
        // Unproductive activities get capped to <= 30 mins each
        expect(ytTask.duration).toBeLessThanOrEqual(30);
        expect(fiddleTask.duration).toBeLessThanOrEqual(30);

        // Sum equals 240 mins exactly
        const totalAllocated = allocated.reduce((s, i) => s + i.duration, 0);
        expect(totalAllocated).toBe(240);
    });

    it('injects core deep focus blocks when user provides only unproductive tasks', () => {
        const tasks = [{ title: 'sleep' }];
        // 4 hours (240 mins)
        const allocated = allocateProductiveTaskDurations(tasks, 240);

        const sleepTask = allocated.find((t) => t.title.toLowerCase().includes('sleep'))!;
        const coreWork = allocated.find((t) => t.title.toLowerCase().includes('deep work'))!;

        expect(sleepTask).toBeDefined();
        expect(coreWork).toBeDefined();

        // Daytime sleep does not take all 4 hours, capped to <= 30 mins
        expect(sleepTask.duration).toBeLessThanOrEqual(30);
        // Core deep work is prioritized
        expect(coreWork.duration).toBeGreaterThanOrEqual(120);
        // Total equals 240 mins
        const total = allocated.reduce((s, i) => s + i.duration, 0);
        expect(total).toBe(240);
    });

    it('places Lunch strictly at midday (12:30 PM) and never at 10 PM even when 80 hours weekly schedule is selected', () => {
        const weekDates = [
            '2026-09-01', // Tuesday
            '2026-09-02', // Wednesday
            '2026-09-03', // Thursday
            '2026-09-04', // Friday
            '2026-09-05', // Saturday
            '2026-09-06', // Sunday
            '2026-09-07', // Monday
        ];

        const tasks = [
            { title: 'Dev • produchive', category: 'development' as const, priority: 'high' as const },
            { title: 'Leetcode & Study Practice', category: 'writing' as const, priority: 'medium' as const },
            { title: 'explorer.exe', category: 'design' as const, priority: 'medium' as const },
        ];

        // 80 hours across 7 days (~11.4h / day)
        const weeklySchedule = generateWeeklySmartSchedule({
            weekDates,
            tasks,
            totalWeeklyHours: 80,
            defaultStartHour: 9, // 9 AM start
            includeLunch: true,
            includeDinner: true,
            includeRestBlocks: true,
        });

        expect(weeklySchedule.length).toBeGreaterThan(0);

        // For every scheduled day starting at 9 AM:
        // Lunch MUST be at 12:30 PM (startHour 12, startMinute 30) - NEVER 10 PM (22:00)
        for (const date of weekDates) {
            const dayItems = weeklySchedule.filter((item) => item.dateStr === date);
            const lunchItem = dayItems.find((item) => item.title.toLowerCase().includes('lunch'));
            expect(lunchItem).toBeDefined();
            expect(lunchItem!.startHour).toBe(12);
            expect(lunchItem!.startMinute).toBe(30);

            // Dinner must be around 19:30 (7:30 PM), never midnight
            const dinnerItem = dayItems.find((item) => item.title.toLowerCase().includes('dinner'));
            expect(dinnerItem).toBeDefined();
            expect(dinnerItem!.startHour).toBe(19);
            expect(dinnerItem!.startMinute).toBe(30);

            // No task should exceed 120 minutes per continuous block
            for (const item of dayItems) {
                if (item.category !== 'sleep') {
                    expect(item.durationMinutes).toBeLessThanOrEqual(120);
                }
            }
        }
    });

    it('schedules occupation blocks (job/school/college) from 9 AM to 5 PM with lunch, personal tasks after 5 PM', () => {
        const tasks = [
            { title: 'College classes', category: 'other' as const },
            { title: 'Leetcode practice', category: 'development' as const },
            { title: 'Gym workout', category: 'break' as const },
        ];

        expect(isOccupationBlock('College classes')).toBe(true);
        expect(isOccupationBlock('Leetcode practice')).toBe(false);
        expect(isOccupationBlock('office work')).toBe(true);
        expect(isOccupationBlock('school homework')).toBe(true);

        const schedule = generateForwardSmartSchedule({
            tasks,
            allottedMinutes: 600,
            startHour: 8,
            startMinute: 0,
            dateStr: '2026-09-04',
            includeLunch: true,
            includeDinner: true,
            includeRestBlocks: true,
        });

        expect(schedule.length).toBeGreaterThan(0);

        // Occupation morning session starts at 9:00 AM
        const morningSession = schedule.find((s) => s.title === 'College classes');
        expect(morningSession).toBeDefined();
        expect(morningSession!.startHour).toBe(9);
        expect(morningSession!.startMinute).toBe(0);
        expect(morningSession!.durationMinutes).toBe(210); // 9 AM to 12:30 PM

        // Lunch at 12:30 PM
        const lunch = schedule.find((s) => s.title.toLowerCase().includes('lunch'));
        expect(lunch).toBeDefined();
        expect(lunch!.startHour).toBe(12);
        expect(lunch!.startMinute).toBe(30);

        // Occupation afternoon session starts at 1:30 PM
        const afternoonSession = schedule.find((s) => s.title.includes('(Afternoon)'));
        expect(afternoonSession).toBeDefined();
        expect(afternoonSession!.startHour).toBe(13);
        expect(afternoonSession!.startMinute).toBe(30);
        expect(afternoonSession!.durationMinutes).toBe(210); // 1:30 PM to 5:00 PM

        // Personal tasks (Leetcode, Gym) should be scheduled AFTER 5:00 PM (17:00)
        // Exclude occupation blocks, meals, system breaks (like 'Evening Transition'), and sleep
        const personalTasks = schedule.filter(
            (s) => !s.title.includes('College') &&
                   s.category !== 'meal' &&
                   s.category !== 'sleep' &&
                   !s.title.includes('Transition') &&
                   !s.title.includes('Breakfast') &&
                   (s.title.includes('Leetcode') || s.title.includes('Gym'))
        );
        for (const pt of personalTasks) {
            const startMins = pt.startHour * 60 + pt.startMinute;
            expect(startMins).toBeGreaterThanOrEqual(1020); // >= 5:00 PM
        }

        // Dinner should still be around 7:30 PM
        const dinner = schedule.find((s) => s.title.toLowerCase().includes('dinner'));
        expect(dinner).toBeDefined();
        expect(dinner!.startHour).toBe(19);
        expect(dinner!.startMinute).toBe(30);
    });

    it('gives 100% priority to all user-entered tasks, never ignoring or dropping tasks even in late evening (9 PM)', () => {
        const tasks = [
            { title: 'Video Editing', category: 'design' as const },
            { title: 'to do leetcode', category: 'development' as const },
        ];

        const schedule = generateForwardSmartSchedule({
            tasks,
            allottedMinutes: 90, // 1.5 hours
            startHour: 21,       // 9:00 PM
            startMinute: 0,
            dateStr: '2026-09-03',
            includeDinner: true,
        });

        // Both user-entered tasks MUST be in the schedule (100% priority, zero ignored)
        const videoTask = schedule.find((s) => s.title === 'Video Editing');
        const leetcodeTask = schedule.find((s) => s.title === 'to do leetcode');

        expect(videoTask).toBeDefined();
        expect(leetcodeTask).toBeDefined();

        // Tasks must start at 9:00 PM (1260 mins)
        expect(videoTask!.startHour).toBe(21);
        expect(videoTask!.startMinute).toBe(0);

        // Sum of both user tasks must equal the requested 90 minutes
        const totalUserMinutes = videoTask!.durationMinutes + leetcodeTask!.durationMinutes;
        expect(totalUserMinutes).toBe(90);

        // Neither task was dropped or cut short
        expect(videoTask!.durationMinutes).toBe(45);
        expect(leetcodeTask!.durationMinutes).toBe(45);

        // Second task immediately follows first task
        expect(leetcodeTask!.startHour).toBe(21);
        expect(leetcodeTask!.startMinute).toBe(45);

        // Sleep block is adjusted after all user tasks finish
        const sleepTask = schedule.find((s) => s.category === 'sleep');
        expect(sleepTask).toBeDefined();
        const sleepStartMins = sleepTask!.startHour * 60 + sleepTask!.startMinute;
        expect(sleepStartMins).toBeGreaterThanOrEqual(1350); // >= 10:30 PM
    });
});

