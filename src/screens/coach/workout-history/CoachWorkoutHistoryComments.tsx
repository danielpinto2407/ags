import { Send } from 'lucide-react';
import type { WorkoutComment } from '@/domain/workoutExecution';
import { formatLocalDate } from '@/domain/localDate';

interface CoachWorkoutHistoryCommentsProps {
  comments: WorkoutComment[];
  draft: string;
  sending: boolean;
  error: string | null;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}

export default function CoachWorkoutHistoryComments(props: CoachWorkoutHistoryCommentsProps) {
  return (
    <details className="group mt-4 overflow-hidden rounded-xl border border-brand-800/60 bg-brand-950/20" aria-label="Comentarios del entrenamiento">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-brand-400">
        <span className="text-xs font-bold text-brand-200">Comentarios ({props.comments.length})</span>
      </summary>
      <div className="border-t border-brand-800/50 p-3">
        {props.comments.length === 0 ? (
          <p className="text-xs text-zinc-400">Aún no hay comentarios sobre este entrenamiento.</p>
        ) : (
          <ol className="space-y-2">
            {props.comments.map((comment) => (
              <li className="rounded-lg border border-brand-800/50 bg-brand-950/40 p-3" key={comment.id}>
                <p className="text-[10px] font-semibold text-brand-200">{comment.authorName} · {formatLocalDate(comment.createdAt.slice(0, 10))}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-100">{comment.body}</p>
              </li>
            ))}
          </ol>
        )}
        {props.error && <p className="mt-2 text-xs text-rose-300" role="alert">{props.error}</p>}
        <div className="mt-3 flex items-end gap-2">
          <textarea
            aria-label="Comentario para la alumna"
            className="min-h-20 flex-1 resize-none rounded-lg border border-brand-800/70 bg-zinc-950 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none"
            maxLength={2000}
            onChange={(event) => props.onDraftChange(event.target.value)}
            placeholder="Escribe una observación sobre este entrenamiento"
            value={props.draft}
          />
          <button
            aria-label="Enviar comentario"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-500 text-white hover:bg-brand-action-hover disabled:cursor-not-allowed disabled:opacity-50"
            disabled={props.sending || !props.draft.trim()}
            onClick={props.onSend}
            type="button"
          >
            <Send aria-hidden="true" size={16} />
          </button>
        </div>
      </div>
    </details>
  );
}
