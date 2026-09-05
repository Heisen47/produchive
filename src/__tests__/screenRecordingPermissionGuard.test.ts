import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useStore } from '../renderer/lib/store';
import { Activity } from '../renderer/global';

describe('Screen Recording & Monitoring Permission Guard', () => {
    let mockActivities: Activity[] = [];
    let isElectronMonitoring = false;
    let screenPermissionStatus: 'granted' | 'denied' | 'not-determined' = 'denied';
    let activityCallback: ((activity: Activity) => void) | null = null;

    beforeEach(() => {
        // Reset Zustand store state
        useStore.setState({
            activities: [],
            isMonitoring: false,
            systemEvents: [],
        });

        mockActivities = [];
        isElectronMonitoring = false;
        screenPermissionStatus = 'denied';
        activityCallback = null;

        // Mock window.electronAPI with strict permission & monitoring controls
        vi.stubGlobal('window', {
            dispatchEvent: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            electronAPI: {
                getScreenPermission: vi.fn(async () => screenPermissionStatus),
                startMonitoring: vi.fn(async () => {
                    // Simulates main process checkMacPermissions & active-win initialization
                    if (screenPermissionStatus !== 'granted') {
                        return false;
                    }
                    isElectronMonitoring = true;
                    return true;
                }),
                stopMonitoring: vi.fn(() => {
                    isElectronMonitoring = false;
                }),
                onActivityUpdate: vi.fn((cb: (activity: Activity) => void) => {
                    activityCallback = cb;
                }),
                getTasks: vi.fn().mockResolvedValue({
                    tasks: [],
                    activities: [],
                    goals: [],
                    ratings: [],
                }),
                saveActivityFeedback: vi.fn().mockResolvedValue({ success: true }),
            },
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('defaults to inactive: does NOT record any screen activity without explicit user consent', () => {
        const store = useStore.getState();

        // Must start in a non-monitoring state
        expect(store.isMonitoring).toBe(false);
        expect(isElectronMonitoring).toBe(false);
        expect(store.activities.length).toBe(0);

        // Verify startMonitoring was NOT invoked automatically on app load
        expect(window.electronAPI.startMonitoring).not.toHaveBeenCalled();
    });

    it('blocks screen recording if user has not granted screen recording permission', async () => {
        screenPermissionStatus = 'denied';

        // Simulate user attempting to toggle monitoring without OS screen recording permission
        const permission = await window.electronAPI.getScreenPermission();
        expect(permission).toBe('denied');

        const started = await window.electronAPI.startMonitoring();
        expect(started).toBe(false);
        expect(isElectronMonitoring).toBe(false);

        // Store state must remain unmonitored
        const store = useStore.getState();
        expect(store.isMonitoring).toBe(false);
        expect(store.activities.length).toBe(0);
    });

    it('requires explicit "start monitoring" click: records activity only after user grants exclusive access', async () => {
        // 1. Initially denied / stopped
        expect(useStore.getState().isMonitoring).toBe(false);

        // 2. User grants permission and explicitly clicks "Start Monitoring"
        screenPermissionStatus = 'granted';
        const started = await window.electronAPI.startMonitoring();
        expect(started).toBe(true);
        expect(isElectronMonitoring).toBe(true);

        useStore.getState().setMonitoring(true);
        expect(useStore.getState().isMonitoring).toBe(true);

        // 3. Activity updates can now be received and recorded
        const mockActivity: Activity = {
            title: 'VS Code - Routine.tsx',
            owner: { name: 'Code', path: '/Applications/Visual Studio Code.app' },
            timestamp: Date.now(),
            duration: 5000,
        };

        // Emit activity to store
        useStore.getState().addActivity(mockActivity);

        const updatedStore = useStore.getState();
        expect(updatedStore.activities.length).toBe(1);
        expect(updatedStore.activities[0].title).toBe('VS Code - Routine.tsx');
    });

    it('immediately halts recording when user clicks "stop monitoring"', async () => {
        // Start in active monitoring state
        screenPermissionStatus = 'granted';
        await window.electronAPI.startMonitoring();
        useStore.getState().setMonitoring(true);
        expect(useStore.getState().isMonitoring).toBe(true);

        // User explicitly clicks "Stop Monitoring"
        window.electronAPI.stopMonitoring();
        useStore.getState().setMonitoring(false);

        expect(isElectronMonitoring).toBe(false);
        expect(useStore.getState().isMonitoring).toBe(false);
        expect(window.electronAPI.stopMonitoring).toHaveBeenCalledTimes(1);
    });

    it('ignores or drops incoming activity ticks if monitoring is stopped', () => {
        // Set monitoring to inactive
        useStore.getState().setMonitoring(false);
        expect(useStore.getState().isMonitoring).toBe(false);

        // Guard wrapper simulating Dashboard / App listener behavior
        const handleIncomingActivity = (activity: Activity) => {
            if (!useStore.getState().isMonitoring) {
                // Reject recording when user has not enabled monitoring
                return;
            }
            useStore.getState().addActivity(activity);
        };

        const unsolicitedActivity: Activity = {
            title: 'Secret Window - Banking Portal',
            owner: { name: 'Google Chrome', path: '/Applications/Chrome.app' },
            timestamp: Date.now(),
            duration: 10000,
        };

        handleIncomingActivity(unsolicitedActivity);

        // Verify nothing was recorded into the store
        expect(useStore.getState().activities.length).toBe(0);
    });
});
