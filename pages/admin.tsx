import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import ConfirmDialog from "../components/ConfirmDialog";
import SiteShell from "../components/SiteShell";
import {
  Badge,
  Banner,
  Button,
  ButtonRow,
  bp,
  EmptyState,
  Field,
  FormGrid,
  FullWidth,
  Input,
  Panel,
  PanelHeader,
  Section,
  Select,
  Spinner,
  StatGrid,
  StatTile,
  Tab,
  TabBar,
  Table,
  TableWrapper,
  theme,
} from "../components/ui";
import { ApiError, errorMessage } from "../lib/api";
import {
  AdminOverview,
  AdminPlayer,
  GRADE_LABEL,
  GRADE_TONE,
  MATCH_STATUS_LABEL,
  Match,
  MatchStatus,
  adminApi,
  formatKickoff,
  sortByKickoff,
  toDateTimeLocal,
} from "../lib/five";
import UserCookie from "../utils/UserCookie";

/*
|--------------------------------------------------------------------------
| Espace d'administration du Five
|--------------------------------------------------------------------------
|
| Programmation des matchs, mise à jour d'un match existant par simple
| sélection, saisie des résultats (qui attribue les points des pronostics) et
| supervision des joueurs.
|
*/

const MatchRow = styled.div<{ $editing?: boolean }>`
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border-radius: 18px;
  background: ${({ $editing }) => ($editing ? "rgba(45, 91, 217, 0.07)" : theme.surfaceSoft)};
  border: 1px solid ${({ $editing }) => ($editing ? "rgba(45, 91, 217, 0.45)" : theme.border)};
`;

const MatchRowHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;

  > * {
    min-width: 0;
  }

  strong {
    display: block;
    font-size: 1.05rem;
    overflow-wrap: anywhere;
  }

  div.meta {
    color: ${theme.inkFaint};
    font-size: 0.85rem;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
`;

const ResultForm = styled.form`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;

  label {
    display: grid;
    /* Sans piste explicite, la colonne se dimensionne sur le nom d'équipe et
       étire le champ de score bien au-delà de la carte. */
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
    min-width: 0;
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${theme.inkFaint};
    /* Un nom d'équipe long est tronqué : il ne doit pas étirer le champ de
       score ni pousser le bouton hors de la ligne. */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  input {
    width: 84px;
  }

  /* Sur mobile, les deux scores se partagent la ligne et le bouton de
     validation passe dessous, sur toute la largeur. */
  @media (max-width: ${bp.sm}) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: end;

    input {
      width: 100%;
    }

    > button {
      grid-column: 1 / -1;
      width: 100%;
    }
  }
`;

const MatchList = styled.div`
  display: grid;
  gap: 12px;
  min-width: 0;
`;

type Feedback = { tone: "success" | "danger" | "info"; message: string } | null;

type MatchFormState = {
  id: string | null;
  kickoffAt: string;
  home: string;
  away: string;
  venue: string;
  coefficient: string;
  status: MatchStatus;
};

const emptyForm: MatchFormState = {
  id: null,
  kickoffAt: "",
  home: "Bistouclette",
  away: "",
  venue: "",
  coefficient: "1",
  status: "scheduled",
};

type PendingAction =
  | { kind: "delete"; match: Match }
  | { kind: "cancel"; match: Match }
  | { kind: "reopen"; match: Match }
  | null;

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [players, setPlayers] = useState<AdminPlayer[] | null>(null);
  const [tab, setTab] = useState<"matches" | "pronostics" | "players">("matches");

  const [form, setForm] = useState<MatchFormState>(emptyForm);
  const [results, setResults] = useState<Record<string, { home: string; away: string }>>({});
  const [pronosticFilter, setPronosticFilter] = useState("all");

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const load = useCallback(async () => {
    try {
      const payload = await adminApi.overview();
      setOverview(payload);
      setAccessDenied(false);

      // Préremplit la saisie de résultat avec le score déjà enregistré.
      setResults((current) => {
        const next = { ...current };

        payload.matches.forEach((match) => {
          if (!next[match.id]) {
            next[match.id] = {
              home: match.score ? String(match.score.home) : "",
              away: match.score ? String(match.score.away) : "",
            };
          }
        });

        return next;
      });
    } catch (error) {
      if (error instanceof ApiError && (error.isAuthError || error.isForbidden)) {
        setAccessDenied(true);
      } else {
        setFeedback({ tone: "danger", message: errorMessage(error) });
      }
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const user = UserCookie.get();

    if (!user || user.role !== "admin") {
      setAccessDenied(true);
      setReady(true);
      return;
    }

    load();
  }, [load]);

  const loadPlayers = useCallback(async () => {
    try {
      const payload = await adminApi.players();
      setPlayers(payload.players);
    } catch (error) {
      setFeedback({ tone: "danger", message: errorMessage(error) });
    }
  }, []);

  useEffect(() => {
    if (tab === "players" && players === null) {
      loadPlayers();
    }
  }, [tab, players, loadPlayers]);

  const matches = useMemo(() => sortByKickoff(overview?.matches ?? [], "desc"), [overview]);

  const editedMatch = useMemo(
    () => (form.id ? matches.find((match) => match.id === form.id) ?? null : null),
    [form.id, matches],
  );

  const matchById = useMemo(() => new Map(matches.map((match) => [match.id, match])), [matches]);

  const filteredPronostics = useMemo(() => {
    const pronostics = overview?.pronostics ?? [];
    return pronosticFilter === "all"
      ? pronostics
      : pronostics.filter((pronostic) => pronostic.matchId === pronosticFilter);
  }, [overview, pronosticFilter]);

  const setField = (field: keyof MatchFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const startEdit = (target: Match | string) => {
    const match = typeof target === "string" ? matches.find((item) => item.id === target) : target;

    if (!match) {
      return;
    }

    setForm({
      id: match.id,
      kickoffAt: toDateTimeLocal(match.kickoffAt),
      home: match.home,
      away: match.away,
      venue: match.venue,
      coefficient: String(match.coefficient),
      status: match.status,
    });
    setFeedback(null);

    if (typeof target !== "string" && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const runAction = async (action: () => Promise<{ message: string }>) => {
    setBusy(true);
    setFeedback(null);

    try {
      const result = await action();
      setFeedback({ tone: "success", message: result.message });
      await load();

      if (players !== null) {
        await loadPlayers();
      }

      return true;
    } catch (error) {
      setFeedback({ tone: "danger", message: errorMessage(error) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitMatch = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      kickoffAt: form.kickoffAt,
      home: form.home.trim(),
      away: form.away.trim(),
      venue: form.venue.trim(),
      coefficient: Number(form.coefficient.replace(',', '.')),
      status: form.status,
    };

    const saved = await runAction(() =>
      form.id ? adminApi.updateMatch(form.id, payload) : adminApi.createMatch(payload),
    );

    if (saved) {
      setForm(emptyForm);
    }
  };

  const submitResult = async (match: Match, event: React.FormEvent) => {
    event.preventDefault();
    const draft = results[match.id];

    await runAction(() =>
      adminApi.settleMatch(match.id, {
        scoreHome: Number(draft?.home ?? 0),
        scoreAway: Number(draft?.away ?? 0),
      }),
    );
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) {
      return;
    }

    const { kind, match } = pendingAction;

    await runAction(() => {
      if (kind === "delete") {
        return adminApi.deleteMatch(match.id);
      }

      if (kind === "cancel") {
        return adminApi.cancelMatch(match.id);
      }

      return adminApi.reopenMatch(match.id);
    });

    setPendingAction(null);
  };

  const confirmCopy = useMemo(() => {
    if (!pendingAction) {
      return { title: "", message: "", label: "" };
    }

    const label = `${pendingAction.match.home} — ${pendingAction.match.away}`;

    if (pendingAction.kind === "delete") {
      return {
        title: "Supprimer ce match ?",
        message: `« ${label} » et tous les pronostics associés seront supprimés. Cette action est définitive.`,
        label: "Supprimer",
      };
    }

    if (pendingAction.kind === "cancel") {
      return {
        title: "Annuler ce match ?",
        message: `« ${label} » ne rapportera aucun point : les pronostics déjà posés sont conservés mais ne comptent plus.`,
        label: "Annuler le match",
      };
    }

    return {
      title: "Rouvrir les pronostics ?",
      message: `Le résultat de « ${label} » sera effacé et les points retirés du classement. Les joueurs pourront de nouveau pronostiquer.`,
      label: "Rouvrir",
    };
  }, [pendingAction]);

  if (!ready) {
    return (
      <SiteShell currentPath='/admin'>
        <Section>
          <Panel>
            <ButtonRow>
              <Spinner aria-hidden='true' />
              <span>Chargement de l’espace d’administration…</span>
            </ButtonRow>
          </Panel>
        </Section>
      </SiteShell>
    );
  }

  if (accessDenied) {
    return (
      <SiteShell currentPath='/admin'>
        <Section>
          <Panel>
            <PanelHeader>
              <h2>Accès réservé aux administrateurs</h2>
            </PanelHeader>
            <p style={{ marginTop: 0, color: theme.inkSoft }}>
              Connecte-toi avec un compte dont le rôle est « admin » pour gérer les matchs, les
              résultats et les pronostics du foot.
            </p>
            <ButtonRow $stackOnMobile>
              <Button as={Link} href='/signin'>
                Se connecter
              </Button>
              <Button as={Link} href='/five' $variant='secondary'>
                Retour au foot
              </Button>
            </ButtonRow>
          </Panel>
        </Section>
      </SiteShell>
    );
  }

  const stats = overview?.stats;

  return (
    <SiteShell currentPath='/admin'>
      <Section>
        <Panel>
          <PanelHeader>
            <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>Administration foot</h1>
            <span>Matchs, résultats et pronostics</span>
          </PanelHeader>

          {stats && (
            <StatGrid>
              <StatTile as='dl'>
                <dt>Matchs</dt>
                <dd>{stats.matchesCount}</dd>
              </StatTile>
              <StatTile as='dl'>
                <dt>Ouverts</dt>
                <dd>{stats.openCount}</dd>
              </StatTile>
              <StatTile as='dl'>
                <dt>Terminés</dt>
                <dd>{stats.finishedCount}</dd>
              </StatTile>
              <StatTile as='dl'>
                <dt>Pronostics</dt>
                <dd>{stats.pronosticsCount}</dd>
              </StatTile>
              <StatTile as='dl'>
                <dt>En attente</dt>
                <dd>{stats.pendingCount}</dd>
              </StatTile>
              <StatTile as='dl'>
                <dt>Joueurs</dt>
                <dd>{stats.playersCount}</dd>
              </StatTile>
            </StatGrid>
          )}
        </Panel>
      </Section>

      {feedback && (
        <Section>
          <Banner $tone={feedback.tone === "info" ? "info" : feedback.tone} role='status'>
            {feedback.message}
          </Banner>
        </Section>
      )}

      <Section>
        <TabBar role='tablist' aria-label='Sections de l’administration'>
          <Tab role='tab' aria-selected={tab === "matches"} $active={tab === "matches"} onClick={() => setTab("matches")}>
            Matchs
          </Tab>
          <Tab role='tab' aria-selected={tab === "pronostics"} $active={tab === "pronostics"} onClick={() => setTab("pronostics")}>
            Pronostics
          </Tab>
          <Tab role='tab' aria-selected={tab === "players"} $active={tab === "players"} onClick={() => setTab("players")}>
            Joueurs
          </Tab>
        </TabBar>
      </Section>

      {tab === "matches" && (
        <>
          <Section>
            <Panel>
              <PanelHeader>
                <h2>{form.id ? "Modifier le match" : "Programmer un match"}</h2>
                <span>{editedMatch ? `${editedMatch.home} — ${editedMatch.away}` : "Nouveau"}</span>
              </PanelHeader>

              <FormGrid onSubmit={submitMatch}>
                <FullWidth>
                  <Field>
                    Match à modifier
                    <Select
                      value={form.id ?? ""}
                      onChange={(event) =>
                        event.target.value ? startEdit(event.target.value) : setForm(emptyForm)
                      }
                    >
                      <option value=''>➕ Programmer un nouveau match</option>
                      {matches.map((match) => (
                        <option key={match.id} value={match.id}>
                          {match.home} — {match.away} · {formatKickoff(match.kickoffAt)}
                          {match.score ? ` · ${match.score.home}-${match.score.away}` : ""}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </FullWidth>

                {editedMatch && (
                  <FullWidth>
                    <Banner $tone='info'>
                      Les champs ci-dessous reprennent « {editedMatch.home} — {editedMatch.away} ».
                      Modifie ce que tu veux, le reste est conservé.
                    </Banner>
                  </FullWidth>
                )}

                <Field>
                  Coup d’envoi
                  <Input
                    type='datetime-local'
                    value={form.kickoffAt}
                    onChange={(event) => setField("kickoffAt", event.target.value)}
                    required
                  />
                </Field>

                <Field>
                  Lieu / terrain
                  <Input
                    value={form.venue}
                    onChange={(event) => setField("venue", event.target.value)}
                    placeholder='Ex : Complexe Nord'
                  />
                </Field>

                <Field>
                  Équipe à domicile
                  <Input
                    value={form.home}
                    onChange={(event) => setField("home", event.target.value)}
                    required
                  />
                </Field>

                <Field>
                  Équipe à l’extérieur
                  <Input
                    value={form.away}
                    onChange={(event) => setField("away", event.target.value)}
                    placeholder='Ex : Team Nord'
                    required
                  />
                </Field>

                <Field>
                  Coefficient de points
                  <Input
                    type='text'
                    inputMode='decimal'
                    pattern='[0-9]+(?:,[0-9]{1,2})?'
                    value={form.coefficient}
                    onChange={(event) => setField("coefficient", event.target.value)}
                    required
                  />
                  <small>1 = barème normal, 1,5 = points multipliés par 1,5.</small>
                </Field>

                <FullWidth>
                  <Field>
                    Statut
                    <Select
                      value={form.status}
                      onChange={(event) => setField("status", event.target.value)}
                    >
                      <option value='scheduled'>À venir — pronostics ouverts</option>
                      <option value='live'>En cours — pronostics fermés</option>
                      <option value='finished'>Terminé</option>
                      <option value='cancelled'>Annulé — ne rapporte aucun point</option>
                    </Select>
                  </Field>
                </FullWidth>

                <FullWidth>
                  <ButtonRow $stackOnMobile>
                    <Button type='submit' disabled={busy}>
                      {busy ? "Enregistrement…" : form.id ? "Mettre à jour le match" : "Créer le match"}
                    </Button>
                    {form.id && (
                      <Button type='button' $variant='secondary' onClick={() => setForm(emptyForm)}>
                        Annuler la modification
                      </Button>
                    )}
                  </ButtonRow>
                </FullWidth>
              </FormGrid>
            </Panel>
          </Section>

          <Section>
            <Panel>
              <PanelHeader>
                <h2>Planning et résultats</h2>
                <span>{matches.length} match(s)</span>
              </PanelHeader>

              {matches.length === 0 ? (
                <EmptyState>Aucun match enregistré. Programme la première rencontre ci-dessus.</EmptyState>
              ) : (
                <MatchList>
                  {matches.map((match) => {
                    const draft = results[match.id] || { home: "", away: "" };

                    return (
                      <MatchRow key={match.id} $editing={form.id === match.id}>
                        <MatchRowHead>
                          <div>
                            <strong>
                              {match.home} — {match.away}
                            </strong>
                            <div className='meta'>
                              {formatKickoff(match.kickoffAt)}
                              {match.venue ? ` · ${match.venue}` : ""}
                              {match.coefficient > 1 ? ` · coef x${match.coefficient}` : ""}
                            </div>
                          </div>

                          <ButtonRow>
                            <Badge
                              $tone={
                                match.status === "finished"
                                  ? "success"
                                  : match.status === "cancelled"
                                    ? "danger"
                                    : match.open
                                      ? "info"
                                      : "warning"
                              }
                            >
                              {MATCH_STATUS_LABEL[match.status]}
                              {match.score ? ` · ${match.score.home}-${match.score.away}` : ""}
                            </Badge>
                            <Badge>{match.stats.pronosticsCount} pronostic(s)</Badge>
                          </ButtonRow>
                        </MatchRowHead>

                        <ResultForm onSubmit={(event) => submitResult(match, event)}>
                          <label>
                            {match.home}
                            <Input
                              type='number'
                              min='0'
                              value={draft.home}
                              onChange={(event) =>
                                setResults((current) => ({
                                  ...current,
                                  [match.id]: { ...draft, home: event.target.value },
                                }))
                              }
                              required
                            />
                          </label>
                          <label>
                            {match.away}
                            <Input
                              type='number'
                              min='0'
                              value={draft.away}
                              onChange={(event) =>
                                setResults((current) => ({
                                  ...current,
                                  [match.id]: { ...draft, away: event.target.value },
                                }))
                              }
                              required
                            />
                          </label>
                          <Button type='submit' $small disabled={busy}>
                            {match.status === "finished" ? "Corriger le résultat" : "Valider le résultat"}
                          </Button>
                        </ResultForm>

                        <ButtonRow>
                          <Button
                            type='button'
                            $variant='secondary'
                            $small
                            onClick={() => startEdit(match)}
                            disabled={form.id === match.id}
                          >
                            {form.id === match.id ? "En cours de modification" : "Modifier"}
                          </Button>
                          <Button
                            type='button'
                            $variant='secondary'
                            $small
                            onClick={() => {
                              setPronosticFilter(match.id);
                              setTab("pronostics");
                            }}
                          >
                            Voir les pronostics
                          </Button>
                          {(match.status === "finished" || match.status === "cancelled") && (
                            <Button
                              type='button'
                              $variant='secondary'
                              $small
                              onClick={() => setPendingAction({ kind: "reopen", match })}
                            >
                              Rouvrir les pronostics
                            </Button>
                          )}
                          {match.status !== "cancelled" && (
                            <Button
                              type='button'
                              $variant='danger'
                              $small
                              onClick={() => setPendingAction({ kind: "cancel", match })}
                            >
                              Annuler le match
                            </Button>
                          )}
                          <Button
                            type='button'
                            $variant='danger'
                            $small
                            onClick={() => setPendingAction({ kind: "delete", match })}
                          >
                            Supprimer
                          </Button>
                        </ButtonRow>
                      </MatchRow>
                    );
                  })}
                </MatchList>
              )}
            </Panel>
          </Section>
        </>
      )}

      {tab === "pronostics" && (
        <Section>
          <Panel>
            <PanelHeader>
              <h2>Pronostics</h2>
              <span>{filteredPronostics.length} pronostic(s)</span>
            </PanelHeader>

            <Field style={{ maxWidth: 460, marginBottom: 16 }}>
              Filtrer par match
              <Select
                value={pronosticFilter}
                onChange={(event) => setPronosticFilter(event.target.value)}
              >
                <option value='all'>Tous les matchs</option>
                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.home} — {match.away} ({formatKickoff(match.kickoffAt)})
                  </option>
                ))}
              </Select>
            </Field>

            {filteredPronostics.length === 0 ? (
              <EmptyState>Aucun pronostic enregistré pour cette sélection.</EmptyState>
            ) : (
              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <th scope='col'>Joueur</th>
                      <th scope='col'>Match</th>
                      <th scope='col' className='numeric'>
                        Pronostic
                      </th>
                      <th scope='col' className='numeric'>
                        Résultat
                      </th>
                      <th scope='col'>Issue</th>
                      <th scope='col' className='numeric'>
                        Points
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPronostics.map((pronostic) => {
                      const match = matchById.get(pronostic.matchId);

                      return (
                        <tr key={pronostic.id}>
                          <td>{pronostic.player}</td>
                          <td>{match ? `${match.home} — ${match.away}` : "Match supprimé"}</td>
                          <td className='numeric'>
                            {pronostic.scoreHome} - {pronostic.scoreAway}
                          </td>
                          <td className='numeric'>
                            {match?.score ? `${match.score.home} - ${match.score.away}` : "—"}
                          </td>
                          <td>
                            {pronostic.grade ? (
                              <Badge $tone={GRADE_TONE[pronostic.grade]}>
                                {GRADE_LABEL[pronostic.grade]}
                              </Badge>
                            ) : (
                              <Badge>En attente</Badge>
                            )}
                          </td>
                          <td className='numeric'>
                            {pronostic.points === null ? "—" : `+${pronostic.points}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </TableWrapper>
            )}
          </Panel>
        </Section>
      )}

      {tab === "players" && (
        <Section>
          <Panel>
            <PanelHeader>
              <h2>Joueurs</h2>
              <span>{players?.length ?? 0} compte(s)</span>
            </PanelHeader>

            {players === null ? (
              <ButtonRow>
                <Spinner aria-hidden='true' />
                <span>Chargement des joueurs…</span>
              </ButtonRow>
            ) : players.length === 0 ? (
              <EmptyState>Aucun compte enregistré.</EmptyState>
            ) : (
              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <th scope='col'>Joueur</th>
                      <th scope='col'>Email</th>
                      <th scope='col'>Rôle</th>
                      <th scope='col' className='numeric'>
                        Rang
                      </th>
                      <th scope='col' className='numeric'>
                        Points
                      </th>
                      <th scope='col' className='numeric'>
                        Joués
                      </th>
                      <th scope='col' className='numeric'>
                        Scores exacts
                      </th>
                      <th scope='col' className='numeric'>
                        En attente
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => (
                      <tr key={player.id}>
                        <td>{player.displayName}</td>
                        <td>{player.email}</td>
                        <td>
                          <Badge $tone={player.role === "admin" ? "info" : "neutral"}>
                            {player.role}
                          </Badge>
                        </td>
                        <td className='numeric'>{player.rank ?? "—"}</td>
                        <td className='numeric'>{player.points}</td>
                        <td className='numeric'>{player.played}</td>
                        <td className='numeric'>{player.exact}</td>
                        <td className='numeric'>{player.pending}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrapper>
            )}
          </Panel>
        </Section>
      )}

      {overview && overview.leaderboard.length > 0 && (
        <Section>
          <Panel>
            <PanelHeader>
              <h2>Classement</h2>
              <span>3 pts par score exact, 1 pt par bon résultat</span>
            </PanelHeader>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <th scope='col'>#</th>
                    <th scope='col'>Joueur</th>
                    <th scope='col' className='numeric'>
                      Points
                    </th>
                    <th scope='col' className='numeric'>
                      Joués
                    </th>
                    <th scope='col' className='numeric'>
                      Scores exacts
                    </th>
                    <th scope='col' className='numeric'>
                      Réussite
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {overview.leaderboard.map((entry) => (
                    <tr key={entry.userId}>
                      <td>{entry.rank}</td>
                      <td>{entry.displayName}</td>
                      <td className='numeric'>{entry.points}</td>
                      <td className='numeric'>{entry.played}</td>
                      <td className='numeric'>{entry.exact}</td>
                      <td className='numeric'>{entry.successRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          </Panel>
        </Section>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        title={confirmCopy.title}
        message={confirmCopy.message}
        confirmLabel={confirmCopy.label}
        busy={busy}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </SiteShell>
  );
}
