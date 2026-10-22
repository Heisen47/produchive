import { describe, it, expect } from 'vitest';
import {
  mergeTasksArrays,
  mergeRoutinesArrays,
  mergeGoalsArrays,
} from '../renderer/lib/syncDataEngine';
import { PlannedRoutineItem } from '../renderer/types/routine';

describe('Sync Data Engine Merge Logic', () => {
  describe('mergeTasksArrays', () => {
    const localTasks = [
      { id: '1', text: 'Task 1', completed: false, created: 100 },
      { id: '2', text: 'Task 2', completed: false, created: 200 },
    ];

    it('merges new remote tasks and deduplicates existing ones', () => {
      const remoteTasks = [
        { id: '2', text: 'Task 2 Updated', completed: true, created: 250 },
        { id: '3', text: 'Task 3', completed: false, created: 300 },
      ];

      const res = mergeTasksArrays(localTasks, remoteTasks, 'merge');
      expect(res.added).toBe(1);
      expect(res.updated).toBe(1);
      expect(res.merged).toHaveLength(3);

      const t2 = res.merged.find((t) => t.id === '2');
      expect(t2?.completed).toBe(true);
      expect(t2?.text).toBe('Task 2 Updated');

      const t3 = res.merged.find((t) => t.id === '3');
      expect(t3).toBeDefined();
    });

    it('handles overwrite mode by completely replacing local tasks', () => {
      const remoteTasks = [
        { id: '99', text: 'Fresh Task', completed: false, created: 999 },
      ];

      const res = mergeTasksArrays(localTasks, remoteTasks, 'overwrite');
      expect(res.merged).toEqual(remoteTasks);
      expect(res.added).toBe(1);
      expect(res.updated).toBe(0);
    });
  });

  describe('mergeRoutinesArrays', () => {
    const localRoutines: PlannedRoutineItem[] = [
      {
        id: 'r1',
        title: 'Morning Yoga',
        dateStr: '2026-10-08',
        dayIndex: 0,
        startHour: 7,
        startMinute: 0,
        durationMinutes: 30,
        category: 'break',
        priority: 'medium',
        completed: false,
      },
    ];

    it('merges new routines and updates matching routines', () => {
      const remoteRoutines: PlannedRoutineItem[] = [
        {
          id: 'r1',
          title: 'Morning Yoga',
          dateStr: '2026-10-08',
          dayIndex: 0,
          startHour: 7,
          startMinute: 0,
          durationMinutes: 45, // updated duration
          category: 'break',
          priority: 'medium',
          completed: true, // completed
        },
        {
          id: 'r2',
          title: 'Code Review',
          dateStr: '2026-10-08',
          dayIndex: 0,
          startHour: 10,
          startMinute: 0,
          durationMinutes: 60,
          category: 'development',
          priority: 'high',
          completed: false,
        },
      ];

      const res = mergeRoutinesArrays(localRoutines, remoteRoutines, 'merge');
      expect(res.added).toBe(1);
      expect(res.updated).toBe(1);
      expect(res.merged).toHaveLength(2);

      const r1 = res.merged.find((r) => r.id === 'r1');
      expect(r1?.completed).toBe(true);
      expect(r1?.durationMinutes).toBe(45);
    });
  });

  describe('mergeGoalsArrays', () => {
    it('unions unique goals case-insensitively without duplicates', () => {
      const local = ['Workout', 'Read 20 pages'];
      const remote = ['read 20 pages', 'Drink water', 'Workout '];

      const res = mergeGoalsArrays(local, remote, 'merge');
      expect(res.added).toBe(1);
      expect(res.merged).toEqual(['Workout', 'Read 20 pages', 'Drink water']);
    });

    it('overwrites in overwrite mode', () => {
      const local = ['Old Goal'];
      const remote = ['New Goal'];
      const res = mergeGoalsArrays(local, remote, 'overwrite');
      expect(res.merged).toEqual(['New Goal']);
    });
  });
});
