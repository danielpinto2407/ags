import DateField from '@/components/DateField';
import SelectModalField from '@/components/SelectModalField';
import type { RoutineProgramMode } from '@/domain/routineAssignment';
import type { CoachMember } from '@/domain/coachMember';

interface RoutineProgramConfigProps {
  activeMembers: CoachMember[];
  membersLoading: boolean;
  selectedStudentId: string;
  programMode: RoutineProgramMode;
  selectedDate: string;
  cycleDayCountDraft: string;
  additionalCycleRepeatsDraft: string;
  daysLength: number;
  editable: boolean;
  fieldClass: string;
  onStudentChange: (value: string) => void;
  onModeChange: (value: RoutineProgramMode) => void;
  onDateChange: (value: string) => void;
  onCycleDayCountChange: (value: string) => void;
  onCycleDayCountCommit: () => void;
  onCycleAdditionalChange: (value: string) => void;
  onCycleAdditionalCommit: () => void;
}

export default function RoutineProgramConfig(props: RoutineProgramConfigProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Alumna
        <SelectModalField
          ariaLabel="Alumna de la rutina"
          className="mt-1.5"
          disabled={props.membersLoading || props.activeMembers.length === 0}
          modalTitle="Seleccionar alumna"
          onChange={props.onStudentChange}
          options={props.activeMembers.map((member) => ({ value: member.id, label: member.fullName, description: member.email ?? undefined }))}
          placeholder={props.membersLoading ? 'Cargando alumnas…' : 'No hay alumnas activas'}
          value={props.selectedStudentId}
        />
      </label>

      <fieldset className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        <legend>Modo de programación</legend>
        <div className="mt-1.5 grid grid-cols-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
          {(['SINGLE_DAY', 'CYCLE'] as const).map((mode) => (
            <button
              aria-pressed={props.programMode === mode}
              className={`min-h-9 rounded-lg px-2 text-xs font-semibold normal-case ${props.programMode === mode ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'}`}
              key={mode}
              onClick={() => props.onModeChange(mode)}
              type="button"
            >
              {mode === 'SINGLE_DAY' ? 'Una fecha' : 'Ciclo'}
            </button>
          ))}
        </div>
      </fieldset>

      {props.programMode === 'SINGLE_DAY' ? (
        <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Fecha de programación
          <DateField ariaLabel="Fecha de programación" onChange={props.onDateChange} value={props.selectedDate} />
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Rutinas del ciclo
            <input className={`${props.fieldClass} mt-1.5`} disabled={!props.editable} type="number" min="1" max="20" value={props.cycleDayCountDraft} onChange={(event) => props.onCycleDayCountChange(event.target.value)} onBlur={props.onCycleDayCountCommit} />
          </label>
          <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Ciclos adicionales
            <input className={`${props.fieldClass} mt-1.5`} disabled={!props.editable} type="number" min="0" max="20" value={props.additionalCycleRepeatsDraft} onChange={(event) => props.onCycleAdditionalChange(event.target.value)} onBlur={props.onCycleAdditionalCommit} />
          </label>
        </div>
      )}
    </div>
  );
}
