import { api } from "./api";

/**
 * Contrat partagé avec l'API du Five.
 *
 * Les types décrivent exactement ce que renvoie `backend/src/infra/http/five-payload.ts`
 * et les helpers concentrent le formatage utilisé par les pages `/five` et `/admin`.
 */

export type Outcome = "home" | "draw" | "away";
export type MatchStatus = "scheduled" | "live" | "finished" | "cancelled";
export type Grade = "exact" | "outcome" | "missed";

export interface MatchStats {
  pronosticsCount: number;
  byOutcome: Record<string, number>;
}

export interface Match {
  id: string;
  kickoffAt: string;
  home: string;
  away: string;
  venue: string;
  coefficient: number;
  status: MatchStatus;
  score: { home: number; away: number } | null;
  outcome: Outcome | null;
  /** Le match accepte les pronostics : programmé et coup d'envoi à venir. */
  open: boolean;
  stats: MatchStats;
}

export interface Pronostic {
  id: number;
  matchId: string;
  scoreHome: number;
  scoreAway: number;
  outcome: Outcome;
  /** `null` tant que le résultat n'a pas été saisi. */
  points: number | null;
  grade: Grade | null;
  createdAt: string;
  settledAt: string | null;
}

export interface AdminPronostic extends Pronostic {
  userId: number;
  player: string;
  username: string;
}

export interface PlayerStats {
  rank: number;
  userId: number;
  username: string;
  displayName: string;
  points: number;
  played: number;
  exact: number;
  outcome: number;
  missed: number;
  pending: number;
  successRate: number;
  averagePoints: number;
}

export interface PlayerContext {
  userId: number;
  stats: PlayerStats;
  pronostics: Pronostic[];
}

export interface Rules {
  exactScore: number;
  correctOutcome: number;
  maxGoals: number;
  maxCoefficient: number;
}

export interface FivePayload {
  rules: Rules;
  matches: Match[];
  leaderboard: PlayerStats[];
  me: PlayerContext | null;
}

export interface AdminPlayer {
  id: number;
  username: string;
  displayName: string;
  email: string;
  role: "user" | "admin";
  rank: number | null;
  points: number;
  played: number;
  exact: number;
  pending: number;
}

export interface AdminOverview {
  matches: Match[];
  pronostics: AdminPronostic[];
  leaderboard: PlayerStats[];
  stats: {
    matchesCount: number;
    openCount: number;
    finishedCount: number;
    pronosticsCount: number;
    pendingCount: number;
    playersCount: number;
  };
}

export interface MatchFormPayload {
  kickoffAt: string;
  home: string;
  away: string;
  venue: string;
  coefficient: number;
  status: MatchStatus;
}

/*
|--------------------------------------------------------------------------
| Appels API
|--------------------------------------------------------------------------
*/

export const fiveApi = {
  page: () => api.get<FivePayload>("/five", "optional"),
  me: () => api.get<PlayerContext>("/five/me", "required"),
  savePronostic: (input: { matchId: string; scoreHome: number; scoreAway: number }) =>
    api.post<{ message: string; pronostic: Pronostic; me: PlayerContext }>("/five/pronostics", input),
  removePronostic: (id: number) =>
    api.delete<{ message: string; me: PlayerContext }>(`/five/pronostics/${id}`),
};

export const adminApi = {
  overview: () => api.get<AdminOverview>("/admin/overview", "required"),
  createMatch: (input: MatchFormPayload) =>
    api.post<{ message: string; match: Match }>("/admin/matches", input),
  updateMatch: (id: string, input: MatchFormPayload) =>
    api.put<{ message: string; match: Match }>(`/admin/matches/${id}`, input),
  settleMatch: (id: string, score: { scoreHome: number; scoreAway: number }) =>
    api.post<{ message: string; match: Match }>(`/admin/matches/${id}/settle`, score),
  cancelMatch: (id: string) => api.post<{ message: string }>(`/admin/matches/${id}/cancel`, {}),
  reopenMatch: (id: string) => api.post<{ message: string }>(`/admin/matches/${id}/reopen`, {}),
  deleteMatch: (id: string) => api.delete<{ message: string }>(`/admin/matches/${id}`),
  players: () => api.get<{ players: AdminPlayer[] }>("/admin/players", "required"),
};

/*
|--------------------------------------------------------------------------
| Formatage
|--------------------------------------------------------------------------
*/

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso)).replace(":", "h");
}

export function formatKickoff(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

/** « Clôture dans 3 j », « Pronostics clos » : échéance lisible. */
export function countdownLabel(iso: string, now: Date = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime();

  if (diff <= 0) {
    return "Pronostics clos";
  }

  const minutes = Math.round(diff / 60000);

  if (minutes < 60) {
    return `Clôture dans ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `Clôture dans ${hours} h`;
  }

  return `Clôture dans ${Math.round(hours / 24)} j`;
}

export function formatPoints(points: number): string {
  return `${points} pt${Math.abs(points) > 1 ? "s" : ""}`;
}

export function outcomeLabel(match: Pick<Match, "home" | "away">, outcome: Outcome): string {
  if (outcome === "home") {
    return `Victoire ${match.home}`;
  }

  if (outcome === "away") {
    return `Victoire ${match.away}`;
  }

  return "Match nul";
}

export const GRADE_LABEL: Record<Grade, string> = {
  exact: "Score exact",
  outcome: "Bon résultat",
  missed: "Raté",
};

export const GRADE_TONE: Record<Grade, "success" | "info" | "neutral"> = {
  exact: "success",
  outcome: "info",
  missed: "neutral",
};

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "À venir",
  live: "En cours",
  finished: "Terminé",
  cancelled: "Annulé",
};

/** Valeur attendue par un `<input type="datetime-local">`. */
export function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function isUpcoming(match: Match): boolean {
  return match.status === "scheduled" || match.status === "live";
}

export function sortByKickoff(matches: Match[], direction: "asc" | "desc" = "asc"): Match[] {
  const factor = direction === "asc" ? 1 : -1;

  return [...matches].sort(
    (a, b) => factor * (new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime()),
  );
}
