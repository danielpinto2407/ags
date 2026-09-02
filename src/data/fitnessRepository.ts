import {
  MOCK_ACHIEVEMENTS,
  MOCK_COACH,
  MOCK_EXERCISES,
  MOCK_PROGRESS,
  MOCK_ROUTINES,
  MOCK_STUDENTS,
} from '@/data/mockData';
import type { Achievement, Coach, Day, Exercise, ProgressEntry, RoutineMap, Student } from '@/types';

const ROUTINES_STORAGE_KEY = 'ags-glutehouse-routines';
const routineListeners = new Set<() => void>();

const cloneRoutines = (routines: RoutineMap): RoutineMap => Object.fromEntries(
  Object.entries(routines).map(([day, exercises]) => [day, [...exercises]])
) as RoutineMap;

const loadRoutines = (): RoutineMap => {
  if (typeof window === 'undefined') return cloneRoutines(MOCK_ROUTINES);

  try {
    const storedRoutines = window.localStorage.getItem(ROUTINES_STORAGE_KEY);
    return storedRoutines ? JSON.parse(storedRoutines) as RoutineMap : cloneRoutines(MOCK_ROUTINES);
  } catch {
    return cloneRoutines(MOCK_ROUTINES);
  }
};

let routines = loadRoutines();

export const fitnessRepository = {
  getExercises(): Exercise[] {
    return MOCK_EXERCISES;
  },
  getStudents(): Student[] {
    return MOCK_STUDENTS;
  },
  getCoach(): Coach {
    return MOCK_COACH;
  },
  getProgress(): ProgressEntry[] {
    return MOCK_PROGRESS;
  },
  getAchievements(): Achievement[] {
    return MOCK_ACHIEVEMENTS;
  },
  getRoutine(day: Day): Exercise[] {
    return [...routines[day]];
  },
  getRoutines(): RoutineMap {
    return cloneRoutines(routines);
  },
  subscribeToRoutines(listener: () => void): () => void {
    routineListeners.add(listener);
    return () => routineListeners.delete(listener);
  },
  getRoutinesSnapshot(): RoutineMap {
    return routines;
  },
  saveRoutines(nextRoutines: RoutineMap): void {
    routines = cloneRoutines(nextRoutines);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(routines));
    }
    routineListeners.forEach((listener) => listener());
  },
};
