import type { AppNavigation } from './useAppNavigation';
import type { Profile } from '@/domain/profile';
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
  profile: Profile;
  onLogout: () => void;
}

export default function ScreenRenderer({ navigation, profile, onLogout }: ScreenRendererProps) {
  const { role, screen, selectedMember, handleNavigate, handleStudentSelect, handleStudentBack } = navigation;

  if (!role) return null;

  if (role === 'student') {
    switch (screen) {
      case 'home':
        return <StudentHome profile={profile} onNavigate={handleNavigate} />;
      case 'routines':
        return <StudentRoutines profile={profile} />;
      case 'progress':
        return <StudentProgress profile={profile} onNavigate={handleNavigate} />;
      case 'profile':
        return <StudentProfile profile={profile} onLogout={onLogout} />;
      default:
        return <StudentHome profile={profile} onNavigate={handleNavigate} />;
    }
  }

  switch (screen) {
    case 'home':
      return <CoachDashboard profile={profile} onNavigate={handleNavigate} onStudentSelect={handleStudentSelect} />;
    case 'students':
      return <CoachStudents coachId={profile.id} onStudentSelect={handleStudentSelect} />;
    case 'studentDetail':
      return selectedMember ? (
        <StudentDetail member={selectedMember} onBack={handleStudentBack} />
      ) : (
        <CoachStudents coachId={profile.id} onStudentSelect={handleStudentSelect} />
      );
    case 'programRoutine':
      return <CoachProgramRoutine profile={profile} />;
    case 'exerciseLibrary':
      return <CoachExerciseLibrary profile={profile} />;
    case 'profile':
      return <CoachProfile profile={profile} onLogout={onLogout} />;
    default:
      return <CoachDashboard profile={profile} onNavigate={handleNavigate} onStudentSelect={handleStudentSelect} />;
  }
}

