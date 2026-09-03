export type StudentStatus = 'active' | 'resting' | 'inactive';

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
  status: StudentStatus;
}
