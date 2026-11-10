import { useState } from 'react';
import { fitnessRepository } from '@/data/fitnessRepository';
import type { Role, Screen, Student } from '@/types';

export function useAppNavigation(role: Role | null) {
  const [navigationState, setNavigationState] = useState({
    role,
    screen: 'home' as Screen,
    selectedStudentId: null as string | null,
  });
  const stateMatchesRole = navigationState.role === role;
  const screen = stateMatchesRole ? navigationState.screen : 'home';
  const selectedStudentId = stateMatchesRole ? navigationState.selectedStudentId : null;

  const handleNavigate = (nextScreen: Screen) => {
    setNavigationState({ role, screen: nextScreen, selectedStudentId: null });
  };

  const handleStudentSelect = (studentId: string) => {
    setNavigationState({ role, screen: 'studentDetail', selectedStudentId: studentId });
  };

  const selectedStudent = selectedStudentId
    ? fitnessRepository.getStudents().find((student) => student.id === selectedStudentId) ?? null
    : null;

  return {
    role,
    screen,
    selectedStudent,
    handleNavigate,
    handleStudentSelect,
  };
}

export type AppNavigation = ReturnType<typeof useAppNavigation>;
export type SelectedStudent = Student | null;
