import { useState } from 'react';
import { fitnessRepository } from '@/data/fitnessRepository';
import type { Role, Screen, Student } from '@/types';

export function useAppNavigation() {
  const [role, setRole] = useState<Role | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

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
    selectedStudent,
    handleLogin,
    handleNavigate,
    handleStudentSelect,
    switchRole,
  };
}

export type AppNavigation = ReturnType<typeof useAppNavigation>;
export type SelectedStudent = Student | null;
