import { useEffect, useState } from 'react';
import { coachMemberRepository } from '@/data/coachMemberRepository';
import type { CoachMember } from '@/domain/coachMember';

export type CoachMembersState =
  | { status: 'loading'; members: CoachMember[] }
  | { status: 'error'; members: CoachMember[]; message: string }
  | { status: 'loaded'; members: CoachMember[] };

export function useCoachMembers(coachId: string) {
  const [state, setState] = useState<CoachMembersState>({ status: 'loading', members: [] });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ status: 'loading', members: current.members }));

    coachMemberRepository.listInvitedByCoach(coachId)
      .then((members) => {
        if (!cancelled) setState({ status: 'loaded', members });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          members: [],
          message: error instanceof Error ? error.message : 'No se pudieron cargar las alumnas invitadas.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [coachId, reloadKey]);

  return {
    state,
    reload: () => setReloadKey((key) => key + 1),
  };
}