import styled, { css, keyframes } from "styled-components";

/**
 * Briques d'interface partagées par les pages du club.
 *
 * Un seul jeu de couleurs, de rayons et d'ombres : les pages composent ces
 * éléments au lieu de redéclarer leurs propres styles.
 */

export const theme = {
  ink: "#16213d",
  inkSoft: "rgba(22, 33, 61, 0.72)",
  inkFaint: "rgba(22, 33, 61, 0.55)",
  border: "rgba(26, 39, 72, 0.1)",
  /* Surfaces plus translucides : la couleur du fond transparaît à travers les
     cartes (effet verre dépoli), au lieu d'un aplat blanc qui « écrase » la
     palette. Le flou est appliqué via `glassBlur`. */
  surface: "rgba(255, 255, 255, 0.72)",
  surfaceStrong: "rgba(255, 255, 255, 0.9)",
  surfaceSoft: "rgba(245, 248, 255, 0.66)",
  /* Bordure claire façon reflet de verre, plus vivante qu'un gris. */
  glassBorder: "rgba(255, 255, 255, 0.6)",
  glassBlur: "saturate(150%) blur(14px)",
  /* Ombre en deux couches (portée large + contact court) + liseré supérieur :
     donne du relief sans assombrir. */
  shadow:
    "0 22px 48px -18px rgba(23, 43, 94, 0.34), 0 8px 20px -14px rgba(23, 43, 94, 0.22)",
  shadowHover:
    "0 30px 60px -20px rgba(23, 43, 94, 0.42), 0 12px 26px -16px rgba(23, 43, 94, 0.26)",
  highlight: "inset 0 1px 0 rgba(255, 255, 255, 0.75)",
  glowPrimary: "rgba(45, 91, 217, 0.2)",
  glowAccent: "rgba(227, 111, 176, 0.18)",
  radius: "24px",
  radiusSmall: "14px",
  primary: "#2d5bd9",
  primarySoft: "#5c7df5",
  success: "#0f8a5f",
  successSoft: "rgba(15, 138, 95, 0.12)",
  danger: "#c23b50",
  dangerSoft: "rgba(194, 59, 80, 0.12)",
  warning: "#b3730a",
  warningSoft: "rgba(179, 115, 10, 0.14)",
  info: "rgba(45, 91, 217, 0.12)",
} as const;

/**
 * Points de rupture partagés.
 *
 * Toutes les pages utilisent les mêmes seuils : la mise en page change au même
 * endroit partout, au lieu d'un breakpoint différent par composant.
 */
export const bp = {
  /** Poste de travail étroit / grande tablette. */
  lg: "1024px",
  /** Tablette : les grilles à trois colonnes passent à deux. */
  md: "860px",
  /** Grand mobile : on repasse sur une colonne principale. */
  sm: "640px",
  /** Petit mobile : densité réduite. */
  xs: "420px",
} as const;

/**
 * Une grille dont les colonnes acceptent de rétrécir sous leur largeur minimale.
 *
 * `minmax(200px, 1fr)` impose 200px même quand le viewport est plus étroit, ce
 * qui fait déborder la page sur mobile. `min()` supprime ce plancher dès que la
 * place manque.
 */
export const fluidColumns = (min: string) =>
  css`
    grid-template-columns: repeat(auto-fit, minmax(min(${min}, 100%), 1fr));
  `;

/**
 * Autorise un enfant de grille ou de flex à rétrécir.
 *
 * Sans cela, `min-width: auto` empêche la colonne de descendre sous la largeur
 * de son contenu — un nom d'équipe long, par exemple — et le contenu sort de sa
 * carte.
 */
export const shrinkable = css`
  min-width: 0;
  overflow-wrap: anywhere;
`;

const focusRing = css`
  &:focus-visible {
    outline: 3px solid rgba(45, 91, 217, 0.45);
    outline-offset: 2px;
  }
`;

export const Section = styled.section`
  margin-top: 26px;
  min-width: 0;

  &:first-of-type {
    margin-top: 18px;
  }

  @media (max-width: ${bp.sm}) {
    margin-top: 20px;

    &:first-of-type {
      margin-top: 14px;
    }
  }
`;

export const Panel = styled.div`
  min-width: 0;
  background: ${theme.surface};
  backdrop-filter: ${theme.glassBlur};
  -webkit-backdrop-filter: ${theme.glassBlur};
  border: 1px solid ${theme.glassBorder};
  border-radius: ${theme.radius};
  padding: clamp(16px, 3vw, 26px);
  color: ${theme.ink};
  box-shadow: ${theme.shadow}, ${theme.highlight};

  @media (max-width: ${bp.xs}) {
    border-radius: 20px;
  }
`;

export const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;

  h2,
  h3 {
    margin: 0;
    font-size: clamp(1.25rem, 2.4vw, 1.6rem);
    color: ${theme.ink};
    ${shrinkable};
  }

  span {
    color: ${theme.inkFaint};
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
  }

  @media (max-width: ${bp.sm}) {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
`;

export const PageTitle = styled.h1`
  margin: 0 0 8px;
  font-size: clamp(2rem, 5vw, 3.1rem);
  line-height: 1.1;
  color: ${theme.ink};
`;

export const Lead = styled.p`
  margin: 0;
  max-width: 62ch;
  color: ${theme.inkSoft};
  font-size: 1.02rem;
`;

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonVariants: Record<ButtonVariant, ReturnType<typeof css>> = {
  primary: css`
    background: linear-gradient(135deg, ${theme.primary}, ${theme.primarySoft});
    color: #fff;
    border: 1px solid transparent;
    box-shadow: 0 12px 22px rgba(45, 91, 217, 0.22);
  `,
  secondary: css`
    background: rgba(255, 255, 255, 0.9);
    color: ${theme.ink};
    border: 1px solid ${theme.border};
  `,
  ghost: css`
    background: transparent;
    color: ${theme.ink};
    border: 1px solid transparent;
  `,
  danger: css`
    background: ${theme.dangerSoft};
    color: ${theme.danger};
    border: 1px solid rgba(194, 59, 80, 0.24);
  `,
};

export const Button = styled.button<{ $variant?: ButtonVariant; $block?: boolean; $small?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: ${({ $small }) => ($small ? "38px" : "46px")};
  padding: ${({ $small }) => ($small ? "0 14px" : "0 20px")};
  width: ${({ $block }) => ($block ? "100%" : "auto")};
  max-width: 100%;
  text-align: center;
  border-radius: 999px;
  font-weight: 700;
  font-size: ${({ $small }) => ($small ? "0.88rem" : "1rem")};
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  ${({ $variant = "primary" }) => buttonVariants[$variant]};
  ${focusRing};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover:not(:disabled) {
      transform: none;
    }
  }
`;

export const ButtonRow = styled.div<{ $stackOnMobile?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  /* Deux boutons de largeurs différentes empilés font désordre : sur mobile ils
     prennent toute la largeur et forment un bloc régulier. */
  @media (max-width: ${bp.sm}) {
    ${({ $stackOnMobile = false }) =>
      $stackOnMobile &&
      css`
        flex-direction: column;
        align-items: stretch;

        > * {
          width: 100%;
        }
      `};
  }
`;

type Tone = "neutral" | "info" | "success" | "danger" | "warning";

const toneStyles: Record<Tone, ReturnType<typeof css>> = {
  neutral: css`
    background: rgba(22, 33, 61, 0.07);
    color: ${theme.inkSoft};
  `,
  info: css`
    background: ${theme.info};
    color: ${theme.primary};
  `,
  success: css`
    background: ${theme.successSoft};
    color: ${theme.success};
  `,
  danger: css`
    background: ${theme.dangerSoft};
    color: ${theme.danger};
  `,
  warning: css`
    background: ${theme.warningSoft};
    color: ${theme.warning};
  `,
};

export const Badge = styled.span<{ $tone?: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  ${({ $tone = "neutral" }) => toneStyles[$tone]};
`;

export const Banner = styled.div<{ $tone?: Tone }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: ${theme.radiusSmall};
  font-weight: 600;
  font-size: 0.94rem;
  /* Un message d'erreur brut du serveur peut être une longue chaîne sans
     espace : sans cela il élargit toute la page. */
  ${shrinkable};
  ${({ $tone = "info" }) => toneStyles[$tone]};
`;

export const Field = styled.label`
  display: grid;
  gap: 6px;
  font-size: 0.86rem;
  font-weight: 700;
  color: ${theme.inkSoft};
`;

const controlStyles = css`
  width: 100%;
  /* Certains champs natifs (datetime-local, number) ont une largeur minimale
     intrinsèque qu'une largeur de 100% ne suffit pas à contenir. */
  min-width: 0;
  min-height: 46px;
  padding: 0.7rem 0.9rem;
  border-radius: ${theme.radiusSmall};
  border: 1px solid ${theme.border};
  background: rgba(255, 255, 255, 0.92);
  color: ${theme.ink};
  font-weight: 600;
  ${focusRing};

  &::placeholder {
    color: rgba(22, 33, 61, 0.42);
    font-weight: 500;
  }

  &:disabled {
    background: rgba(22, 33, 61, 0.04);
    cursor: not-allowed;
  }
`;

export const Input = styled.input`
  ${controlStyles};
`;

export const Select = styled.select`
  ${controlStyles};
`;

export const FormGrid = styled.form<{ $columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns = 2 }) => $columns}, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: ${bp.sm}) {
    grid-template-columns: 1fr;
  }
`;

export const FullWidth = styled.div`
  grid-column: 1 / -1;
`;

export const StatGrid = styled.div`
  display: grid;
  ${fluidColumns("150px")};
  gap: 14px;

  /* Deux tuiles par ligne restent mieux proportionnées qu'une tuile unique
     étirée sur toute la largeur de l'écran. */
  @media (max-width: ${bp.sm}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
`;

export const StatTile = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-width: 0;
  padding: 14px 16px;
  border-radius: 18px;
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(92, 125, 245, 0.12), transparent 60%),
    ${theme.surfaceSoft};
  backdrop-filter: ${theme.glassBlur};
  -webkit-backdrop-filter: ${theme.glassBlur};
  border: 1px solid ${theme.glassBorder};
  box-shadow: ${theme.shadow}, ${theme.highlight};

  dt {
    margin: 0 0 6px;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.inkFaint};
    /* « CLASSEMENT » est un mot long : il doit pouvoir se couper plutôt que
       sortir de la tuile. */
    ${shrinkable};
  }

  dd {
    margin: 0;
    font-size: clamp(1.3rem, 3vw, 1.8rem);
    font-weight: 800;
    line-height: 1.15;
    color: ${theme.ink};
    ${shrinkable};
  }
`;

export const TableWrapper = styled.div`
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;

  /* Le tableau défile d'un bord à l'autre du panneau plutôt que dans une
     colonne étroite au milieu. */
  @media (max-width: ${bp.sm}) {
    margin: 0 calc(-1 * clamp(16px, 3vw, 26px));
    padding: 0 clamp(16px, 3vw, 26px);
  }
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  color: ${theme.ink};
  font-size: 0.94rem;

  th,
  td {
    text-align: left;
    padding: 12px 10px;
    border-bottom: 1px solid rgba(22, 33, 61, 0.1);
    white-space: nowrap;
  }

  @media (max-width: ${bp.sm}) {
    font-size: 0.88rem;

    th,
    td {
      padding: 10px 8px;
    }
  }

  th {
    color: ${theme.inkFaint};
    font-size: 0.74rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  td.numeric,
  th.numeric {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
`;

export const EmptyState = styled.p`
  margin: 0;
  ${shrinkable};
  padding: 18px;
  border-radius: 18px;
  background: ${theme.surfaceSoft};
  border: 1px dashed ${theme.border};
  color: ${theme.inkSoft};
  text-align: center;
`;

export const TabBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid ${theme.border};
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

export const Tab = styled.button<{ $active?: boolean }>`
  /* Les onglets se partagent la largeur disponible ; sur mobile ils rétrécissent
     au lieu de sortir de la barre. */
  flex: 1 1 0;
  min-width: 0;
  min-height: 42px;
  padding: 0 18px;
  border: none;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  color: ${({ $active }) => ($active ? "#fff" : theme.ink)};
  background: ${({ $active }) =>
    $active ? `linear-gradient(135deg, ${theme.primary}, ${theme.primarySoft})` : "transparent"};
  ${focusRing};

  @media (max-width: ${bp.sm}) {
    padding: 0 12px;
    font-size: 0.9rem;
  }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Spinner = styled.span`
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(45, 91, 217, 0.25);
  border-top-color: ${theme.primary};
  animation: ${spin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 3s;
  }
`;

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(12, 21, 36, 0.45);
`;

export const Dialog = styled.div`
  width: min(100%, 420px);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  background: #fff;
  border-radius: ${theme.radius};
  padding: 24px;
  box-shadow: 0 30px 60px rgba(12, 21, 36, 0.25);
  color: ${theme.ink};

  h3 {
    margin: 0 0 8px;
  }

  p {
    margin: 0 0 20px;
    color: ${theme.inkSoft};
  }
`;

export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;
