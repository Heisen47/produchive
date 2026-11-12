/**
 * Guided tour manifest.
 *
 * Every step is tagged with `since`: the app version that introduced the feature it
 * shows. After an update, the "What's new" tour is built from the steps whose `since`
 * is newer than the version the user last saw a tour on (see tourLogic.ts).
 *
 * When you ship a feature, add a step here (to the main tour or a page tour) with
 * `since` set to the release version it goes out in, and put a matching
 * `data-tour="…"` attribute on the element it points at.
 */

/** App views, matching App.tsx `currentView`. */
export type TourView = 'dashboard' | 'analytics' | 'routine' | 'ai' | 'focusroom';

/** Side effects a step needs before its target exists or is visible. */
/** 'liveMonitor' opens the Live tab on Analytics, where the app list with block buttons lives. */
export type TourPrep = 'openSidebar' | 'liveMonitor';

export interface TourStep {
    /** Stable id, unique across the whole manifest. */
    id: string;
    /** Value of the `data-tour` attribute to spotlight. Omit for a centred card. */
    target?: string;
    /** View the target lives on. The tour switches there before looking for it. */
    view?: TourView;
    title: string;
    body: string;
    /** Version that introduced this feature (semver, e.g. "3.2.0"). */
    since: string;
    /** Preferred side for the card; the engine flips it when there's no room. */
    placement?: 'top' | 'bottom' | 'left' | 'right';
    prep?: TourPrep;
    /** If the target never mounts: show the card centred ('center', default) or skip the step ('skip'). */
    ifMissing?: 'center' | 'skip';
}

export interface TourDefinition {
    id: string;
    title: string;
    steps: TourStep[];
}

/** The first-install path: the core loop, one idea per step. */
export const MAIN_TOUR: TourDefinition = {
    id: 'main',
    title: 'Tour of Produchive',
    steps: [
        {
            id: 'main.hello',
            title: "Hi, I'm Jogu",
            body: "I'll show you around Produchive. It takes about a minute, and you can leave anytime.",
            since: '3.0.0',
        },
        {
            id: 'main.sidebar',
            target: 'nav',
            prep: 'openSidebar',
            placement: 'right',
            title: 'Your pages live here',
            body: 'Move your pointer to the left edge to open the sidebar. Pin it if you want it to stay open.',
            since: '3.0.0',
        },
        {
            id: 'main.monitoring',
            target: 'start-monitoring',
            view: 'dashboard',
            placement: 'bottom',
            title: 'Start here: track your day',
            body: 'Press Start Monitoring and Produchive notes which apps you use and for how long. It all stays on this computer.',
            since: '3.0.0',
        },
        {
            id: 'main.analyze',
            target: 'analyze-ai',
            view: 'dashboard',
            placement: 'top',
            title: 'Get a quick verdict',
            body: 'Analyze with AI sorts what you did today into productive and distracting, and gives you a score.',
            since: '3.0.0',
        },
        {
            id: 'main.streak',
            target: 'streak-card',
            view: 'dashboard',
            placement: 'bottom',
            title: 'Climb the ranks',
            body: 'Come back each day to grow your streak and rank up from Ember to Luminary. Hover the badge to see the ladder.',
            since: '3.0.33',
        },
        {
            id: 'main.ai-model',
            target: 'ai-model',
            placement: 'bottom',
            title: 'Pick your AI',
            body: 'Download a free model that runs on your computer, or connect a cloud provider with your own API key.',
            since: '3.2.0',
        },
        {
            id: 'main.block',
            target: 'app-blocker',
            view: 'analytics',
            prep: 'liveMonitor',
            placement: 'top',
            title: 'Block distracting apps',
            body: 'Every app you use shows up here. Press the lock next to one and Produchive hides it while you work.',
            since: '3.0.0',
        },
        {
            id: 'main.plan-day',
            target: 'plan-your-day',
            view: 'routine',
            placement: 'bottom',
            title: 'Set your goals for the day',
            body: "Tell the AI planner what you want to get done. It builds a schedule around your energy, meals and breaks.",
            since: '3.0.0',
        },
        {
            id: 'main.focus-rooms',
            target: 'focus-modes',
            view: 'focusroom',
            placement: 'top',
            title: 'Focus with company',
            body: 'Study in a calm 3D room on your own, or invite friends to study with you.',
            since: '3.3.0',
        },
        {
            id: 'main.insights',
            target: 'insights-day-picker',
            view: 'ai',
            placement: 'bottom',
            title: 'Let the AI judge your day',
            body: 'Generate a report for a day or week. The AI judge scores you out of 10 against your goals and says what to try next.',
            since: '3.2.0',
        },
        {
            id: 'main.wardrobe',
            target: 'wardrobe',
            view: 'focusroom',
            placement: 'bottom',
            title: 'Dress up your character',
            body: 'Pick an outfit, a hat or a little companion. Everyone in your room sees your look.',
            since: '3.3.0',
        },
        {
            id: 'main.catfood',
            target: 'catfood',
            placement: 'top',
            title: 'Keep me fed',
            body: 'Every 30-minute study session earns catfood. Feed me here, or I get hungry and grumpy.',
            since: '3.2.0',
        },
        {
            id: 'main.help',
            target: 'help-menu',
            placement: 'top',
            title: "That's the tour",
            body: 'Open Help anytime to replay it or get a quick tour of the page you\'re on. Have a good session!',
            since: '3.3.2',
        },
    ],
};

/** Optional "learn more" tours, one per page. Started from the Help menu. */
export const PAGE_TOURS: Record<TourView, TourDefinition> = {
    dashboard: {
        id: 'page.dashboard',
        title: 'Dashboard tour',
        steps: [
            {
                id: 'dashboard.metrics',
                target: 'dashboard-metrics',
                view: 'dashboard',
                placement: 'bottom',
                title: 'Today at a glance',
                body: 'Time tracked, your most used app and your focus score. Click a card to open the live monitor.',
                since: '3.0.0',
            },
            {
                id: 'dashboard.schedule',
                target: 'dashboard-schedule',
                view: 'dashboard',
                placement: 'top',
                title: "Today's schedule",
                body: "The plan you made on the Routine page shows up here, so you always know what's next.",
                since: '3.0.0',
            },
            {
                id: 'dashboard.activity',
                target: 'dashboard-activity',
                view: 'dashboard',
                placement: 'top',
                title: 'Where your time went',
                body: 'Every app you used today, ranked by time. Press Analyze with AI for a quick read on it.',
                since: '3.0.0',
            },
            {
                id: 'dashboard.sync',
                target: 'device-sync',
                placement: 'bottom',
                title: 'Bring your data along',
                body: 'Sync between your computers with end-to-end encryption, through Google Drive or a folder you choose.',
                since: '3.1.0',
            },
            {
                id: 'dashboard.notifications',
                target: 'notification-center',
                placement: 'top',
                title: 'Notification Center',
                body: "Nudges, reminders and diagnostics land here. Check it if something didn't work as expected.",
                since: '3.0.2',
            },
            {
                id: 'dashboard.jogu-toggle',
                target: 'jogu-toggle',
                placement: 'top',
                title: 'Need some quiet?',
                body: 'Hide me here while you work. You can bring me back anytime.',
                since: '3.2.0',
            },
        ],
    },
    analytics: {
        id: 'page.analytics',
        title: 'Analytics tour',
        steps: [
            {
                id: 'analytics.charts',
                target: 'analytics-charts',
                view: 'analytics',
                placement: 'top',
                title: 'Your habits over time',
                body: 'See which apps take your time, how it changes through the day, and how this week compares.',
                since: '3.0.0',
            },
            {
                id: 'analytics.block',
                target: 'app-blocker',
                view: 'analytics',
                prep: 'liveMonitor',
                placement: 'top',
                title: 'Block distracting apps',
                body: 'Press the lock next to an app and Produchive hides it while you work. Press it again to unblock.',
                since: '3.0.0',
            },
        ],
    },
    routine: {
        id: 'page.routine',
        title: 'Routine tour',
        steps: [
            {
                id: 'routine.toolbar',
                target: 'routine-toolbar',
                view: 'routine',
                placement: 'bottom',
                title: 'Move around your calendar',
                body: 'Jump between days and switch between day, work week and full week views.',
                since: '3.0.0',
            },
            {
                id: 'routine.plan',
                target: 'plan-your-day',
                view: 'routine',
                placement: 'bottom',
                title: 'Let the AI plan it',
                body: 'Add your tasks and the planner fits them around your energy. Review the draft before you save it.',
                since: '3.0.32',
            },
            {
                id: 'routine.sync',
                target: 'routine-sync',
                view: 'routine',
                placement: 'bottom',
                title: 'Same plan on every computer',
                body: 'Your routine syncs with end-to-end encryption, so only your devices can read it.',
                since: '3.1.0',
            },
        ],
    },
    ai: {
        id: 'page.ai',
        title: 'AI Insights tour',
        steps: [
            {
                id: 'ai.day-picker',
                target: 'insights-day-picker',
                view: 'ai',
                placement: 'bottom',
                title: 'Pick a day or the whole week',
                body: 'Each day shows its score once you have a report. Choose the week for the bigger picture.',
                since: '3.2.0',
            },
            {
                id: 'ai.generate',
                target: 'insights-generate',
                view: 'ai',
                placement: 'bottom',
                title: 'Generate a report',
                body: 'The AI reads your tracked time and plan, then scores your focus and suggests what to try next.',
                since: '3.2.0',
                // Only shown once there's tracked time to review.
                ifMissing: 'skip',
            },
            {
                id: 'ai.heatmap',
                target: 'insights-heatmap',
                view: 'ai',
                placement: 'top',
                title: 'Your year at a glance',
                body: 'Each square is a day. The brighter it is, the more time you tracked. Hover one for details.',
                since: '3.0.0',
            },
        ],
    },
    focusroom: {
        id: 'page.focusroom',
        title: 'Focus Rooms tour',
        steps: [
            {
                id: 'focusroom.wardrobe',
                target: 'wardrobe',
                view: 'focusroom',
                placement: 'bottom',
                title: 'Dress up your character',
                body: 'Change your body, outfit, hats and companion. The basics are free; Premium adds more items.',
                since: '3.3.0',
            },
            {
                id: 'focusroom.solo',
                target: 'focus-solo',
                view: 'focusroom',
                placement: 'top',
                title: 'Solo room',
                body: 'Study in a 3D cafe, library or classroom next to friendly NPCs. Free for everyone.',
                since: '3.3.0',
            },
            {
                id: 'focusroom.friends',
                target: 'focus-friends',
                view: 'focusroom',
                placement: 'top',
                title: 'Study with friends',
                body: 'Create a room, share the code and study together in real time. Part of Premium.',
                since: '3.3.0',
            },
            {
                id: 'focusroom.community',
                target: 'focus-community',
                view: 'focusroom',
                placement: 'top',
                title: 'Community rooms',
                body: 'Drop into a shared room and study next to other Produchive users. No chat, just focus. Part of Premium.',
                since: '3.3.0',
                ifMissing: 'skip',
            },
        ],
    },
};

export const ALL_TOURS: TourDefinition[] = [MAIN_TOUR, ...Object.values(PAGE_TOURS)];
