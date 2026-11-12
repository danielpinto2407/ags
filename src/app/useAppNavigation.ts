import { useEffect, useState } from 'react';
import type { CoachMember } from '@/domain/coachMember';
import type { Role, Screen } from '@/types';

export function useAppNavigation(role: Role | null) {
  const [navigationState, setNavigationState] = useState({
    role,
    screen: 'home' as Screen,
    returnScreen: 'home' as Screen,
    selectedMember: null as CoachMember | null,
  });

  useEffect(() => {
    setNavigationState({ role, screen: 'home', returnScreen: 'home', selectedMember: null });
  }, [role]);

  const stateMatchesRole = navigationState.role === role;
  const screen = stateMatchesRole ? navigationState.screen : 'home';
  const selectedMember = stateMatchesRole ? navigationState.selectedMember : null;

  const handleNavigate = (nextScreen: Screen) => {
    setNavigationState({ role, screen: nextScreen, returnScreen: nextScreen, selectedMember: null });
  };

  const handleStudentSelect = (member: CoachMember) => {
    const originScreen = stateMatchesRole ? navigationState.screen : 'home';
    const returnScreen = originScreen === 'studentDetail' ? navigationState.returnScreen : originScreen;
    setNavigationState({ role, screen: 'studentDetail', returnScreen, selectedMember: member });
  };

  const handleStudentBack = () => {
    const returnScreen = stateMatchesRole ? navigationState.returnScreen : 'home';
    setNavigationState({ role, screen: returnScreen, returnScreen, selectedMember: null });
  };

  return {
    role,
    screen,
    selectedMember,
    handleNavigate,
    handleStudentSelect,
    handleStudentBack,
  };
}

export type AppNavigation = ReturnType<typeof useAppNavigation>;
export type SelectedCoachMember = CoachMember | null;
