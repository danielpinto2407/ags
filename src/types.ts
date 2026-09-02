export type Role = 'student' | 'coach';

export const DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'] as const;
export type Day = (typeof DAYS)[number];

export type Screen =
  | 'home'
  | 'routines'
  | 'exerciseDetail'
  | 'progress'
  | 'profile'
  | 'students'
  | 'studentDetail'
  | 'programRoutine'
  | 'exerciseLibrary';

export interface Exercise {
  id: string;
  name: string;
  series: number;
  reps: string;
  weight: string;
  workDuration?: string;
  rest: string;
  emoji: string;
  muscles: string;
  instructions: string;
  tips: string;
  difficulty: 'Principiante' | 'Intermedio' | 'Avanzado';
  videoUrl?: string;
}

export type RoutineMap = Record<Day, Exercise[]>;

export interface Student {
  id: string;
  name: string;
  plan: string;
  avatar: string;
  age: number;
  weight: string;
  goal: string;
  streak: number;
  weeklyProgress: number;
  lastActive: string;
  status: 'active' | 'resting' | 'inactive';
}

export interface Coach {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  studentsCount: number;
}

export interface ProgressEntry {
  day: string;
  completed: number;
  total: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  date?: string;
}
