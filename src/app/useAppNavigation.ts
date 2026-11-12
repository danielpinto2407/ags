import { useEffect, useState } from 'react';
import type { CoachMember } from '@/domain/coachMember';
import type { Role, Screen } from '@/types';

export function useAppNavigation(role: Role | null) {
  const [navigationState, setNavigationState] = useState({
    role,
    screen: 'home' as Screen,
    selectedMember: null as CoachMember | null,
  });

  useEffect(() => {
    setNavigationState({ role, screen: 'home', selectedMember: null });
  }, [role]);

  const stateMatchesRole = navigationState.role === role;
  const screen = stateMatchesRole ? navigationState.screen : 'home';
  const selectedMember = stateMatchesRole ? navigationState.selectedMember : null;

  const handleNavigate = (nextScreen: Screen) => {
    setNavigationState({ role, screen: nextScreen, selectedMember: null });
  };

  const handleStudentSelect = (member: CoachMember) => {
    setNavigationState({ role, screen: 'studentDetail', selectedMember: member });
  };

  return {
    role,
    screen,
    selectedMember,
    handleNavigate,
    handleStudentSelect,
  };
}

export type AppNavigation = ReturnType<typeof useAppNavigation>;
export type SelectedCoachMember = CoachMember | null;
