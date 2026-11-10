export type ExerciseDifficulty = 'Principiante' | 'Intermedio' | 'Avanzado';

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
  difficulty: ExerciseDifficulty;
  videoUrl?: string;
}
