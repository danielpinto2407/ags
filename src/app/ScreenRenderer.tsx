import type { AppNavigation } from './useAppNavigation';
import BottomNav from '@/components/BottomNav';
import StudentHome from '@/screens/student/StudentHome';
import StudentRoutines from '@/screens/student/StudentRoutines';
import StudentProgress from '@/screens/student/StudentProgress';
import StudentProfile from '@/screens/student/StudentProfile';
import CoachDashboard from '@/screens/coach/CoachDashboard';
import CoachStudents from '@/screens/coach/CoachStudents';
import StudentDetail from '@/screens/coach/StudentDetail';
import CoachProgramRoutine from '@/screens/coach/CoachProgramRoutine';
import CoachExerciseLibrary from '@/screens/coach/CoachExerciseLibrary';
import CoachProfile from '@/screens/coach/CoachProfile';

interface ScreenRendererProps {
  navigation: AppNavigation;
}

export default function ScreenRenderer({ navigation }: ScreenRendererProps) {
  const { role, screen, selectedStudent, handleNavigate, handleStudentSelect } = navigation;

  if (!role) return null;

  if (role === 'student') {
    switch (screen) {
      case 'home':
        return <StudentHome onNavigate={handleNavigate} />;
      case 'routines':
        return <StudentRoutines />;
      case 'progress':
        return <StudentProgress />;
      case 'profile':
        return <StudentProfile />;
      default:
        return <StudentHome onNavigate={handleNavigate} />;
    }
  }

  switch (screen) {
    case 'home':
      return <CoachDashboard onNavigate={handleNavigate} onStudentSelect={handleStudentSelect} />;
    case 'students':
      return <CoachStudents onStudentSelect={handleStudentSelect} />;
    case 'studentDetail':
      return selectedStudent ? (
        <StudentDetail student={selectedStudent} onBack={() => handleNavigate('students')} />
      ) : (
        <CoachStudents onStudentSelect={handleStudentSelect} />
      );
    case 'programRoutine':
      return <CoachProgramRoutine />;
    case 'exerciseLibrary':
      return <CoachExerciseLibrary />;
    case 'profile':
      return <CoachProfile />;
    default:
      return <CoachDashboard onNavigate={handleNavigate} onStudentSelect={handleStudentSelect} />;
  }
}

export function AppContent({ navigation }: ScreenRendererProps) {
  const { role, viewMode } = navigation;

  if (!role) return null;

  return (
    <div className={`w-full max-w-[390px] ${viewMode === 'phone' ? 'h-[720px] border-4 border-brand-500/40 rounded-[40px] shadow-neon-lg' : 'min-h-[720px] border border-brand-500/30 rounded-3xl shadow-neon'} bg-black overflow-hidden relative flex flex-col`}>
      <div className="flex-1 overflow-y-auto no-scrollbar p-5">
        <ScreenRenderer navigation={navigation} />
      </div>
      <BottomNav role={role} activeScreen={navigation.screen} onNavigate={navigation.handleNavigate} />
    </div>
  );
}
