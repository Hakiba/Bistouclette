import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import SiteShell from "../components/SiteShell";
import {
  Badge,
  Banner,
  Button,
  ButtonRow,
  EmptyState,
  Input,
  Panel,
  PanelHeader,
  Section,
  Spinner,
  StatGrid,
  StatTile,
  Table,
  TableWrapper,
  bp,
  fluidColumns,
  shrinkable,
  theme,
  VisuallyHidden,
} from "../components/ui";
import { errorMessage } from "../lib/api";
import {
  FivePayload,
  GRADE_LABEL,
  GRADE_TONE,
  Match,
  Pronostic,
  countdownLabel,
  fiveApi,
  formatKickoff,
  formatPoints,
  isUpcoming,
  outcomeLabel,
  sortByKickoff,
} from "../lib/five";
import UserCookie from "../utils/UserCookie";

/*
|--------------------------------------------------------------------------
| Page Five : jeu de pronostics du club
|--------------------------------------------------------------------------
|
| Tout le monde pronostique toutes les rencontres ouvertes : pas de mise, pas
| de capital. Chaque match porte son propre formulaire de score, ce qui évite
| tout aller-retour dans la page.
|
*/

const Hero = styled(Panel)`
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 24px;
  align-items: center;

  @media (max-width: ${bp.md}) {
    grid-template-columns: 1fr;
  }
`;

const HeroText = styled.div`
  min-width: 0;

  h1 {
    margin: 0 0 12px;
    font-size: clamp(2rem, 5vw, 3.2rem);
    line-height: 1.08;
    color: ${theme.ink};
  }

  p {
    margin: 0;
    color: ${theme.inkSoft};
    max-width: 54ch;
  }
`;

const RuleList = styled.ul`
  display: grid;
  gap: 8px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    color: ${theme.inkSoft};
    font-size: 0.95rem;
    ${shrinkable};
  }
`;

const HeroStats = styled(StatGrid)`
  /* 94px tronquait des libellés comme « CLASSEMENT » ou « PRONOSTICS ». */
  ${fluidColumns("132px")};
  align-content: start;

  dd {
    font-size: clamp(1.2rem, 2.4vw, 1.6rem);
  }
`;

const MatchGrid = styled.div`
  display: grid;
  /* La fonction min() évite le plancher de 300px qui faisait déborder la grille
     sur un écran de 390px. */
  ${fluidColumns("300px")};
  gap: 16px;

  @media (max-width: ${bp.sm}) {
    gap: 12px;
  }
`;

const MatchCard = styled.article<{ $answered?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 18px;
  border-radius: 22px;
  background:
    radial-gradient(
      120% 80% at 100% 0%,
      rgba(92, 125, 245, 0.1),
      transparent 55%
    ),
    ${theme.surface};
  backdrop-filter: ${theme.glassBlur};
  -webkit-backdrop-filter: ${theme.glassBlur};
  border: 1px solid
    ${({ $answered }) =>
      $answered ? "rgba(15, 138, 95, 0.4)" : theme.glassBorder};
  box-shadow: ${theme.shadow}, ${theme.highlight};
  color: ${theme.ink};
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${theme.shadowHover}, ${theme.highlight};
  }
`;

const MatchMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${theme.inkFaint};

  > span {
    ${shrinkable};
  }
`;

const Teams = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  text-align: center;
  font-weight: 800;

  /* Les colonnes doivent pouvoir descendre sous la largeur d'un nom d'équipe
     long, sinon la ligne sort de la carte. */
  > * {
    ${shrinkable};
  }

  span.versus {
    font-size: 0.8rem;
    color: ${theme.inkFaint};
  }

  span.score {
    font-size: 1.5rem;
    font-variant-numeric: tabular-nums;
  }
`;

const TeamName = styled.div<{ $winner?: boolean }>`
  font-size: 1rem;
  line-height: 1.25;
  ${shrinkable};
  color: ${({ $winner }) => ($winner ? theme.success : theme.ink)};
`;

const ScoreForm = styled.form`
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border-radius: 16px;
  background: ${theme.surfaceSoft};
  border: 1px solid ${theme.border};

  @media (max-width: ${bp.xs}) {
    padding: 12px 10px;
  }
`;

const ScoreRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: 10px;
  min-width: 0;

  /* Même raison que pour Teams : le libellé d'équipe ne doit pas imposer sa
     largeur à la colonne, sinon le stepper sort du formulaire. */
  > * {
    min-width: 0;
  }

  @media (max-width: ${bp.xs}) {
    gap: 6px;
  }
`;

const Stepper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  justify-content: center;

  input {
    /* Largeur souple : le champ se resserre sur mobile au lieu de pousser les
       boutons hors de la carte. */
    width: 100%;
    min-width: 0;
    max-width: 56px;
    text-align: center;
    font-size: 1.1rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    padding: 0.5rem 0.3rem;
    min-height: 44px;
  }

  @media (max-width: ${bp.xs}) {
    gap: 4px;
  }
`;

const StepButton = styled.button`
  /* 34px sur un écran de 320px ne laisse plus la place au champ de score. */
  width: clamp(30px, 9vw, 34px);
  height: clamp(30px, 9vw, 34px);
  padding: 0;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid ${theme.border};
  background: #fff;
  color: ${theme.ink};
  font-size: 1.2rem;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: rgba(45, 91, 217, 0.08);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 3px solid rgba(45, 91, 217, 0.45);
    outline-offset: 2px;
  }
`;

const StepperLabel = styled.div`
  text-align: center;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${theme.inkFaint};
  margin-bottom: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  /* Poussé en bas de la carte : les pieds de toutes les cartes d'une même
     rangée s'alignent, quelle que soit la hauteur du contenu. */
  margin-top: auto;
  padding-top: 2px;
  font-size: 0.82rem;
  color: ${theme.inkFaint};
  font-weight: 600;

  > span {
    ${shrinkable};
  }
`;

/**
 * Le tiret entre les deux scores.
 *
 * Il reprend la hauteur d'un stepper et s'aligne sur le bas de la ligne : il
 * reste ainsi centré sur les champs, sous les libellés d'équipe.
 */
const ScoreSeparator = styled.span`
  display: flex;
  align-items: center;
  align-self: end;
  height: 44px;
  font-weight: 800;
  color: ${theme.inkFaint};
`;

const MatchVenue = styled.div`
  font-size: 0.84rem;
  color: ${theme.inkFaint};
  ${shrinkable};
`;

type Feedback = { tone: "success" | "danger" | "info"; message: string } | null;
type Draft = { home: string; away: string };

export default function FivePage() {
  const [data, setData] = useState<FivePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLogged, setIsLogged] = useState(false);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(async () => {
    try {
      const payload = await fiveApi.page();
      setData(payload);
      setLoadError(null);

      // Les formulaires repartent du pronostic déjà posé, sinon d'un 0-0.
      const pronostics = new Map(
        (payload.me?.pronostics ?? []).map((p) => [p.matchId, p]),
      );
      setDrafts(
        Object.fromEntries(
          payload.matches.map((match) => {
            const mine = pronostics.get(match.id);
            return [
              match.id,
              {
                home: String(mine?.scoreHome ?? 0),
                away: String(mine?.scoreAway ?? 0),
              },
            ];
          }),
        ),
      );
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLogged(Boolean(UserCookie.get()));
    load();
  }, [load]);

  const rules = data?.rules;
  const me = data?.me ?? null;

  const pronosticsByMatch = useMemo(() => {
    const map = new Map<string, Pronostic>();
    (me?.pronostics ?? []).forEach((pronostic) =>
      map.set(pronostic.matchId, pronostic),
    );
    return map;
  }, [me]);

  const upcoming = useMemo(
    () => sortByKickoff((data?.matches ?? []).filter(isUpcoming), "asc"),
    [data],
  );

  const played = useMemo(
    () =>
      sortByKickoff(
        (data?.matches ?? []).filter((match) => !isUpcoming(match)),
        "desc",
      ),
    [data],
  );

  const setGoals = (matchId: string, side: keyof Draft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [matchId]: {
        ...(current[matchId] || { home: "0", away: "0" }),
        [side]: value,
      },
    }));
  };

  const step = (matchId: string, side: keyof Draft, delta: number) => {
    const current = Number(drafts[matchId]?.[side] ?? 0);
    const next = Math.min(rules?.maxGoals ?? 30, Math.max(0, current + delta));
    setGoals(matchId, side, String(next));
  };

  const submit = async (match: Match, event: React.FormEvent) => {
    event.preventDefault();

    if (!isLogged) {
      setFeedback({
        tone: "info",
        message:
          "Connecte-toi pour enregistrer tes pronostics : c'est gratuit et illimité.",
      });
      return;
    }

    const draft = drafts[match.id];
    setSavingId(match.id);
    setFeedback(null);

    try {
      const response = await fiveApi.savePronostic({
        matchId: match.id,
        scoreHome: Number(draft?.home ?? 0),
        scoreAway: Number(draft?.away ?? 0),
      });

      setData((current) =>
        current ? { ...current, me: response.me } : current,
      );
      setFeedback({
        tone: "success",
        message: `${response.message} ${match.home} ${draft?.home ?? 0} - ${draft?.away ?? 0} ${match.away}.`,
      });
      // Les compteurs du match changent aussi pour les autres joueurs.
      load();
    } catch (error) {
      setFeedback({ tone: "danger", message: errorMessage(error) });
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (pronostic: Pronostic) => {
    setSavingId(pronostic.matchId);
    setFeedback(null);

    try {
      const response = await fiveApi.removePronostic(pronostic.id);
      setData((current) =>
        current ? { ...current, me: response.me } : current,
      );
      setFeedback({ tone: "success", message: response.message });
      load();
    } catch (error) {
      setFeedback({ tone: "danger", message: errorMessage(error) });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <SiteShell currentPath="/five">
        <Section>
          <Panel>
            <ButtonRow>
              <Spinner aria-hidden="true" />
              <span>Chargement des matchs…</span>
            </ButtonRow>
          </Panel>
        </Section>
      </SiteShell>
    );
  }

  if (loadError || !data || !rules) {
    return (
      <SiteShell currentPath="/five">
        <Section>
          <Panel>
            <PanelHeader>
              <h2>Foot indisponible</h2>
            </PanelHeader>
            <Banner $tone="danger">
              {loadError || "Aucune donnée disponible pour le moment."}
            </Banner>
            <ButtonRow style={{ marginTop: 16 }}>
              <Button type="button" onClick={() => load()}>
                Réessayer
              </Button>
            </ButtonRow>
          </Panel>
        </Section>
      </SiteShell>
    );
  }

  return (
    <SiteShell currentPath="/five">
      <Section>
        <Hero>
          <HeroText>
            <h1>BistouProno</h1>
            <p>
              Annonce le score de chaque rencontre avant le coup d’envoi. Tout
              le monde joue, sur tous les matchs, sans mise ni capital : on ne
              peut que marquer des points.
            </p>
            <RuleList>
              <li>
                <Badge $tone="success">{formatPoints(rules.exactScore)}</Badge>{" "}
                score exact
              </li>
              <li>
                <Badge $tone="info">{formatPoints(rules.correctOutcome)}</Badge>{" "}
                bon résultat (vainqueur ou match nul), score différent
              </li>
              <li>
                <Badge>0 pt</Badge> à côté
              </li>
            </RuleList>
          </HeroText>

          {me ? (
            <HeroStats>
              <StatTile as="dl">
                <dt>Points</dt>
                <dd>{me.stats.points}</dd>
              </StatTile>
              <StatTile as="dl">
                <dt>Classement</dt>
                <dd>
                  {me.stats.played > 0 || me.stats.pending > 0
                    ? `${me.stats.rank}e`
                    : "—"}
                </dd>
              </StatTile>
              <StatTile as="dl">
                <dt>Pronostics</dt>
                <dd>{me.pronostics.length}</dd>
              </StatTile>
              <StatTile as="dl">
                <dt>Scores exacts</dt>
                <dd>{me.stats.exact}</dd>
              </StatTile>
              <StatTile as="dl">
                <dt>Réussite</dt>
                <dd>{me.stats.successRate}%</dd>
              </StatTile>
            </HeroStats>
          ) : (
            <Panel style={{ boxShadow: "none" }}>
              <PanelHeader>
                <h2>Rejoins le jeu</h2>
              </PanelHeader>
              <p style={{ marginTop: 0, color: theme.inkSoft }}>
                Crée ton compte pour enregistrer tes pronostics, suivre tes
                statistiques et apparaître au classement du club.
              </p>
              <ButtonRow $stackOnMobile>
                <Button as={Link} href="/signin">
                  Se connecter
                </Button>
                <Button as={Link} href="/signup" $variant="secondary">
                  Créer un compte
                </Button>
              </ButtonRow>
            </Panel>
          )}
        </Hero>
      </Section>

      {feedback && (
        <Section>
          <Banner
            $tone={feedback.tone === "info" ? "info" : feedback.tone}
            role="status"
          >
            {feedback.message}
          </Banner>
        </Section>
      )}

      <Section>
        <Panel>
          <PanelHeader>
            <h2>Matchs à pronostiquer</h2>
            <span>{upcoming.length} rencontre(s)</span>
          </PanelHeader>

          {upcoming.length === 0 ? (
            <EmptyState>
              Aucun match programmé pour l’instant. Les prochaines rencontres
              seront publiées ici par le staff.
            </EmptyState>
          ) : (
            <MatchGrid>
              {upcoming.map((match) => {
                const mine = pronosticsByMatch.get(match.id);
                const draft = drafts[match.id] || { home: "0", away: "0" };
                const busy = savingId === match.id;

                return (
                  <MatchCard key={match.id} $answered={Boolean(mine)}>
                    <MatchMeta>
                      <span>{formatKickoff(match.kickoffAt)}</span>
                      <Badge $tone={match.open ? "info" : "neutral"}>
                        {match.open
                          ? countdownLabel(match.kickoffAt)
                          : "Pronostics clos"}
                      </Badge>
                      {match.coefficient > 1 && (
                        <Badge $tone="warning">Coef. x{match.coefficient}</Badge>
                      )}
                    </MatchMeta>

                    <Teams>
                      <TeamName>{match.home}</TeamName>
                      <span className="versus">vs</span>
                      <TeamName>{match.away}</TeamName>
                    </Teams>

                    {match.venue && <MatchVenue>{match.venue}</MatchVenue>}

                    <ScoreForm onSubmit={(event) => submit(match, event)}>
                      <ScoreRow>
                        <div>
                          <StepperLabel>{match.home}</StepperLabel>
                          <Stepper>
                            <StepButton
                              type="button"
                              onClick={() => step(match.id, "home", -1)}
                              disabled={!match.open || busy}
                              aria-label={`Un but de moins pour ${match.home}`}
                            >
                              −
                            </StepButton>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={rules.maxGoals}
                              value={draft.home}
                              disabled={!match.open || busy}
                              onChange={(event) =>
                                setGoals(match.id, "home", event.target.value)
                              }
                              aria-label={`Buts pronostiqués pour ${match.home}`}
                            />
                            <StepButton
                              type="button"
                              onClick={() => step(match.id, "home", 1)}
                              disabled={!match.open || busy}
                              aria-label={`Un but de plus pour ${match.home}`}
                            >
                              +
                            </StepButton>
                          </Stepper>
                        </div>

                        <ScoreSeparator aria-hidden="true">—</ScoreSeparator>

                        <div>
                          <StepperLabel>{match.away}</StepperLabel>
                          <Stepper>
                            <StepButton
                              type="button"
                              onClick={() => step(match.id, "away", -1)}
                              disabled={!match.open || busy}
                              aria-label={`Un but de moins pour ${match.away}`}
                            >
                              −
                            </StepButton>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={rules.maxGoals}
                              value={draft.away}
                              disabled={!match.open || busy}
                              onChange={(event) =>
                                setGoals(match.id, "away", event.target.value)
                              }
                              aria-label={`Buts pronostiqués pour ${match.away}`}
                            />
                            <StepButton
                              type="button"
                              onClick={() => step(match.id, "away", 1)}
                              disabled={!match.open || busy}
                              aria-label={`Un but de plus pour ${match.away}`}
                            >
                              +
                            </StepButton>
                          </Stepper>
                        </div>
                      </ScoreRow>

                      <Button
                        type="submit"
                        $block
                        $small
                        disabled={!match.open || busy}
                      >
                        {busy
                          ? "Enregistrement…"
                          : mine
                            ? "Modifier mon pronostic"
                            : "Enregistrer mon pronostic"}
                      </Button>

                      {mine && match.open && (
                        <Button
                          type="button"
                          $variant="ghost"
                          $small
                          onClick={() => remove(mine)}
                          disabled={busy}
                        >
                          Retirer mon pronostic
                        </Button>
                      )}
                    </ScoreForm>

                    <CardFooter>
                      <span>{match.stats.pronosticsCount} pronostic(s)</span>
                      {mine && (
                        <Badge $tone="success">
                          Ton pronostic : {mine.scoreHome} - {mine.scoreAway}
                        </Badge>
                      )}
                    </CardFooter>
                  </MatchCard>
                );
              })}
            </MatchGrid>
          )}
        </Panel>
      </Section>

      <Section>
        <Panel>
          <PanelHeader>
            <h2>Résultats</h2>
            <span>{played.length} match(s) joué(s)</span>
          </PanelHeader>

          {played.length === 0 ? (
            <EmptyState>Aucun résultat pour le moment.</EmptyState>
          ) : (
            <MatchGrid>
              {played.map((match) => {
                const mine = pronosticsByMatch.get(match.id);

                return (
                  <MatchCard key={match.id}>
                    <MatchMeta>
                      <span>{formatKickoff(match.kickoffAt)}</span>
                      <Badge
                        $tone={
                          match.status === "cancelled" ? "warning" : "neutral"
                        }
                      >
                        {match.status === "cancelled" ? "Annulé" : "Terminé"}
                      </Badge>
                      {match.coefficient > 1 && (
                        <Badge $tone="warning">Coef. x{match.coefficient}</Badge>
                      )}
                    </MatchMeta>

                    <Teams>
                      <TeamName $winner={match.outcome === "home"}>
                        {match.home}
                      </TeamName>
                      <span className="score">
                        {match.score
                          ? `${match.score.home} - ${match.score.away}`
                          : "–"}
                      </span>
                      <TeamName $winner={match.outcome === "away"}>
                        {match.away}
                      </TeamName>
                    </Teams>

                    {match.outcome && (
                      <MatchVenue>
                        {outcomeLabel(match, match.outcome)}
                      </MatchVenue>
                    )}

                    <CardFooter>
                      {mine ? (
                        <>
                          <span>
                            Ton pronostic : {mine.scoreHome} - {mine.scoreAway}
                          </span>
                          {mine.grade ? (
                            <Badge $tone={GRADE_TONE[mine.grade]}>
                              {GRADE_LABEL[mine.grade]}
                              {mine.points ? ` · +${mine.points}` : ""}
                            </Badge>
                          ) : (
                            <Badge>En attente du résultat</Badge>
                          )}
                        </>
                      ) : (
                        <span>
                          {match.stats.pronosticsCount} pronostic(s) — tu
                          n’avais pas joué celui-là
                        </span>
                      )}
                    </CardFooter>
                  </MatchCard>
                );
              })}
            </MatchGrid>
          )}
        </Panel>
      </Section>

      <Section>
        <Panel>
          <PanelHeader>
            <h2>Classement</h2>
            <span>{data.leaderboard.length} joueur(s)</span>
          </PanelHeader>

          {data.leaderboard.length === 0 ? (
            <EmptyState>
              Le classement s’ouvrira dès les premiers pronostics.
            </EmptyState>
          ) : (
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Joueur</th>
                    <th scope="col" className="numeric">
                      Points
                    </th>
                    <th scope="col" className="numeric">
                      Joués
                    </th>
                    <th scope="col" className="numeric">
                      Scores exacts
                    </th>
                    <th scope="col" className="numeric">
                      Bons résultats
                    </th>
                    <th scope="col" className="numeric">
                      Réussite
                    </th>
                    <th scope="col" className="numeric">
                      Moyenne
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((entry) => (
                    <tr key={entry.userId}>
                      <td>{entry.rank}</td>
                      <td
                        style={{
                          fontWeight: entry.userId === me?.userId ? 800 : 500,
                        }}
                      >
                        {entry.displayName}
                        {entry.userId === me?.userId ? " (toi)" : ""}
                      </td>
                      <td className="numeric">{entry.points}</td>
                      <td className="numeric">{entry.played}</td>
                      <td className="numeric">{entry.exact}</td>
                      <td className="numeric">{entry.outcome}</td>
                      <td className="numeric">{entry.successRate}%</td>
                      <td className="numeric">{entry.averagePoints}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          )}
        </Panel>
      </Section>

      <VisuallyHidden aria-live="polite">{feedback?.message}</VisuallyHidden>
    </SiteShell>
  );
}
