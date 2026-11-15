import { useEffect, useState } from 'react';
import type { CoachMember } from '@/domain/coachMember';
import type { Role, Screen, StudentRoutineTarget } from '@/types';

export function useAppNavigation(role: Role | null) {
  const [navigationState, setNavigationState] = useState({
    role,
    screen: 'home' as Screen,
    returnScreen: 'home' as Screen,
    selectedMember: null as CoachMember | null,
    selectedRoutine: null as StudentRoutineTarget | null,
  });

  useEffect(() => {
    setNavigationState({ role, screen: 'home', returnScreen: 'home', selectedMember: null, selectedRoutine: null });
  }, [role]);

  const stateMatchesRole = navigationState.role === role;
  const screen = stateMatchesRole ? navigationState.screen : 'home';
  const selectedMember = stateMatchesRole ? navigationState.selectedMember : null;
  const selectedRoutine = stateMatchesRole ? navigationState.selectedRoutine : null;

  const handleNavigate = (nextScreen: Screen) => {
    setNavigationState({ role, screen: nextScreen, returnScreen: nextScreen, selectedMember: null, selectedRoutine: null });
  };

  const handleOpenTraining = (target: StudentRoutineTarget) => {
    setNavigationState({ role, screen: 'training', returnScreen: 'routines', selectedMember: null, selectedRoutine: target });
  };

  const handleTrainingBack = () => {
    setNavigationState((current) => ({
      ...current,
      role,
      screen: 'routines',
      returnScreen: 'routines',
      selectedMember: null,
    }));
  };

  const handleStudentSelect = (member: CoachMember) => {
    const originScreen = stateMatchesRole ? navigationState.screen : 'home';
    const returnScreen = originScreen === 'studentDetail' ? navigationState.returnScreen : originScreen;
    setNavigationState({ role, screen: 'studentDetail', returnScreen, selectedMember: member, selectedRoutine: null });
  };

  const handleStudentBack = () => {
    const returnScreen = stateMatchesRole ? navigationState.returnScreen : 'home';
    setNavigationState({ role, screen: returnScreen, returnScreen, selectedMember: null, selectedRoutine: null });
  };

  return {
    role,
    screen,
    selectedMember,
    selectedRoutine,
    handleNavigate,
    handleOpenTraining,
    handleTrainingBack,
    handleStudentSelect,
    handleStudentBack,
  };
}

export type AppNavigation = ReturnType<typeof useAppNavigation>;
export type SelectedCoachMember = CoachMember | null;
