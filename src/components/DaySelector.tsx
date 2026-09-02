import { DAYS, type Day } from '@/types';

interface DaySelectorProps {
  selectedDay: Day;
  onSelectDay: (day: Day) => void;
  compact?: boolean;
}

export default function DaySelector({ selectedDay, onSelectDay, compact = false }: DaySelectorProps) {
  return (
    <div className={`flex justify-between gap-1 ${compact ? 'my-2' : 'my-4'}`}>
      {DAYS.map((day) => (
        <button
          key={day}
          onClick={() => onSelectDay(day)}
          className={`flex-1 ${compact ? 'py-1.5' : 'py-2.5'} rounded-xl text-[11px] font-bold tracking-wide transition-all ${
            selectedDay === day
              ? 'bg-brand-600 text-white shadow-neon-sm scale-105'
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-brand-500/40'
          }`}
        >
          {day}
        </button>
      ))}
    </div>
  );
}
