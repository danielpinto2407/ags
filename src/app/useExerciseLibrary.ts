import { useEffect, useState } from 'react';
import { exerciseLibraryRepository } from '@/data/exerciseLibraryRepository';
import type { ExerciseDefinition, ExerciseDefinitionInput } from '@/domain/exerciseDefinition';

export type ExerciseLibraryState =
  | { status: 'loading'; catalog: ExerciseDefinition[]; tenantExercises: ExerciseDefinition[]; equipmentOptions: string[] }
  | { status: 'error'; catalog: ExerciseDefinition[]; tenantExercises: ExerciseDefinition[]; equipmentOptions: string[]; message: string }
  | { status: 'loaded'; catalog: ExerciseDefinition[]; tenantExercises: ExerciseDefinition[]; equipmentOptions: string[] };

export function useExerciseLibrary(tenantId: string, coachId: string) {
  const [state, setState] = useState<ExerciseLibraryState>({
    status: 'loading',
    catalog: [],
    tenantExercises: [],
    equipmentOptions: [],
  });
  const [includeArchived, setIncludeArchived] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({
      status: 'loading',
      catalog: current.catalog,
      tenantExercises: current.tenantExercises,
      equipmentOptions: current.equipmentOptions,
    }));

    Promise.all([
      exerciseLibraryRepository.listCatalog(),
      exerciseLibraryRepository.listTenantExercises(tenantId, includeArchived),
      exerciseLibraryRepository.listTenantEquipmentOptions(tenantId),
    ])
      .then(([catalog, tenantExercises, equipmentOptions]) => {
        if (!cancelled) setState({ status: 'loaded', catalog, tenantExercises, equipmentOptions });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          catalog: [],
          tenantExercises: [],
          equipmentOptions: [],
          message: error instanceof Error ? error.message : 'No se pudo cargar la biblioteca de ejercicios.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [includeArchived, reloadKey, tenantId]);

  const reload = () => setReloadKey((key) => key + 1);
  const create = async (input: ExerciseDefinitionInput) => {
    await exerciseLibraryRepository.createTenantExercise(tenantId, coachId, input);
    reload();
  };
  const copy = async (exercise: ExerciseDefinition) => {
    await exerciseLibraryRepository.copyCatalogExercise(tenantId, coachId, exercise);
    reload();
  };
  const update = async (exerciseId: string, input: ExerciseDefinitionInput) => {
    await exerciseLibraryRepository.updateTenantExercise(tenantId, exerciseId, input);
    reload();
  };
  const archive = async (exerciseId: string, archived: boolean) => {
    await exerciseLibraryRepository.setArchived(tenantId, exerciseId, archived);
    reload();
  };

  return {
    state,
    includeArchived,
    setIncludeArchived,
    reload,
    create,
    copy,
    update,
    archive,
  };
}