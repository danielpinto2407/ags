import { useState } from 'react';
import { fitnessRepository } from '@/data/fitnessRepository';
import type { Role, Screen, Student } from '@/types';

export type ViewMode = 'phone' | 'full';

export function useAppNavigation() {
  const [role, setRole] = useState<Role | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('phone');

  const handleLogin = () => {
    setRole('student');
    setScreen('home');
  };

  const handleNavigate = (nextScreen: Screen) => {
    setScreen(nextScreen);
    setSelectedStudentId(null);
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setScreen('studentDetail');
  };

  const switchRole = (nextRole: Role) => {
    setRole(nextRole);
    setScreen('home');
    setSelectedStudentId(null);
  };

  const selectedStudent = selectedStudentId
    ? fitnessRepository.getStudents().find((student) => student.id === selectedStudentId) ?? null
    : null;

  return {
    role,
    screen,
    viewMode,
    selectedStudent,
    setViewMode,
    handleLogin,
    handleNavigate,
    handleStudentSelect,
    switchRole,
  };
}

export type AppNavigation = ReturnType<typeof useAppNavigation>;
export type SelectedStudent = Student | null;
