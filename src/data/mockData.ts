import type { Exercise, Student, Coach, ProgressEntry, Achievement, RoutineMap } from '@/types';

export const MOCK_EXERCISES: Exercise[] = [
  {
    id: 'ex-1', name: 'Hip Thrust con Barra', series: 4, reps: '12-15 reps', weight: '40 kg', rest: '90s', emoji: '🏋️‍♀️', muscles: 'Glúteo Mayor',
    instructions: 'Apoya la parte superior de la espalda en el banco. Empuja con los talones y mantén la vista al frente. Sube la cadera hasta lograr una línea recta entre hombros y rodillas.',
    tips: 'No arques la espalda baja. Mantén el mentón pegado al pecho y apoya bien los talones para mayor activación del glúteo.', difficulty: 'Intermedio', videoUrl: 'https://youtube.com',
  },
  {
    id: 'ex-2', name: 'Sentadilla Búlgara', series: 3, reps: '10-12 reps', weight: '20 kg', rest: '75s', emoji: '🦵', muscles: 'Glúteos, Cuádriceps',
    instructions: 'Coloca un pie sobre el banco detrás de ti. Desciende verticalmente sin llevar la rodilla demasiado hacia adelante. Mantén el torso erguido.',
    tips: 'Cuida que la rodilla de la pierna de apoyo no se vaya hacia adentro. Mantén el core activado para no inclinar el torso.', difficulty: 'Intermedio', videoUrl: 'https://youtube.com',
  },
  {
    id: 'ex-3', name: 'Plancha Abdominal', series: 3, reps: '45 seg', weight: 'Peso corporal', workDuration: '45 seg', rest: '60s', emoji: '🧘‍♀️', muscles: 'Core',
    instructions: 'Apoya los antebrazos en el suelo. Mantén alineada la cadera con la columna. Contrae el abdomen y respira de forma constante.',
    tips: 'No subas la cadera ni dejes caer el abdomen. Si sientes dolor lumbar, revisa la posición de los codos.', difficulty: 'Principiante', videoUrl: 'https://youtube.com',
  },
  {
    id: 'ex-4', name: 'Peso Muerto Rumano', series: 4, reps: '8-10 reps', weight: '50 kg', rest: '90s', emoji: '💪', muscles: 'Isquiotibiales, Glúteos',
    instructions: 'Con la barra en las manos, empuja la cadera hacia atrás manteniendo las piernas casi rectas. Baja la barra hasta sentir estiramiento y sube contrayendo glúteos.',
    tips: 'Mantén la barra pegada al cuerpo en todo el recorrido. No redondees la espalda, mantén el pecho abierto.', difficulty: 'Avanzado', videoUrl: 'https://youtube.com',
  },
  {
    id: 'ex-5', name: 'Patada de Glúteo en Polea', series: 3, reps: '15 reps', weight: '15 kg', rest: '60s', emoji: '🦵', muscles: 'Glúteo Mayor',
    instructions: 'Conecta el tobillo a la polea baja. Empuja la pierna hacia atrás contrayendo el glúteo. Vuelve controladamente.',
    tips: 'No balancees el torso. El movimiento debe salir del glúteo, no de la espalda baja.', difficulty: 'Principiante', videoUrl: 'https://youtube.com',
  },
  {
    id: 'ex-6', name: 'Abducción de Cadera en Máquina', series: 3, reps: '15-20 reps', weight: '25 kg', rest: '45s', emoji: '🤸', muscles: 'Glúteo Medio',
    instructions: 'Siéntate en la máquina de abducción. Abre las piernas lo máximo posible contrayendo los glúteos laterales. Vuelve controladamente.',
    tips: 'No uses impulso. Mantén una velocidad controlada tanto al abrir como al cerrar.', difficulty: 'Principiante', videoUrl: 'https://youtube.com',
  },
];

export const MOCK_STUDENTS: Student[] = [
  { id: 'std-1', name: 'Laura Gómez', plan: 'Personalizado', avatar: '👩', age: 24, weight: '58 kg', goal: 'Hipertrofia de glúteos', streak: 12, weeklyProgress: 85, lastActive: 'Hace 2 horas', status: 'active' },
  { id: 'std-2', name: 'Valeria Rodríguez', plan: 'Personalizado', avatar: '👩‍🦰', age: 27, weight: '62 kg', goal: 'Tonificación general', streak: 8, weeklyProgress: 70, lastActive: 'Hace 1 día', status: 'active' },
  { id: 'std-3', name: 'Sofia López', plan: 'General', avatar: '👱‍♀️', age: 22, weight: '55 kg', goal: 'Fuerza y resistencia', streak: 4, weeklyProgress: 50, lastActive: 'Hace 3 días', status: 'resting' },
  { id: 'std-4', name: 'Camila Torres', plan: 'Personalizado', avatar: '👩‍🦱', age: 30, weight: '65 kg', goal: 'Postparto recovery', streak: 15, weeklyProgress: 92, lastActive: 'Hace 30 min', status: 'active' },
  { id: 'std-5', name: 'Daniela Ruiz', plan: 'General', avatar: '🧑‍🦰', age: 25, weight: '60 kg', goal: 'Pérdida de grasa', streak: 0, weeklyProgress: 30, lastActive: 'Hace 1 semana', status: 'inactive' },
];

export const MOCK_COACH: Coach = { id: 'coach-1', name: 'Andrea Gómez', specialty: 'Especialista en Glúteos', avatar: '💪', studentsCount: 5 };

export const MOCK_PROGRESS: ProgressEntry[] = [
  { day: 'Lun', completed: 6, total: 6 }, { day: 'Mar', completed: 5, total: 6 }, { day: 'Mié', completed: 0, total: 0 },
  { day: 'Jue', completed: 6, total: 6 }, { day: 'Vie', completed: 4, total: 6 }, { day: 'Sáb', completed: 6, total: 6 }, { day: 'Dom', completed: 0, total: 0 },
];

export const MOCK_ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', title: 'Racha de 10 días', description: 'Completaste rutinas 10 días seguidos', icon: '🔥', unlocked: true, date: '25 Ago' },
  { id: 'a2', title: 'Primera Semana', description: 'Completaste tu primera semana completa', icon: '⭐', unlocked: true, date: '18 Ago' },
  { id: 'a3', title: 'Glúteo de Acero', description: 'Completa 50 Hip Thrusts', icon: '🏆', unlocked: true, date: '20 Ago' },
  { id: 'a4', title: 'Mes Completo', description: 'Entrena 30 días este mes', icon: '💎', unlocked: false },
  { id: 'a5', title: 'Sin Fallar', description: 'No te saltes ninguna rutina por 2 semanas', icon: '🎯', unlocked: false },
  { id: 'a6', title: 'Leyenda AGS', description: 'Completa 100 rutinas', icon: '👑', unlocked: false },
];

export const MOCK_ROUTINES: RoutineMap = {
  LUN: MOCK_EXERCISES, MAR: [MOCK_EXERCISES[0], MOCK_EXERCISES[2], MOCK_EXERCISES[4]], 'MIÉ': [],
  JUE: [MOCK_EXERCISES[1], MOCK_EXERCISES[3], MOCK_EXERCISES[5]], VIE: MOCK_EXERCISES, 'SÁB': [], DOM: [],
};
