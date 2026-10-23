import Link from "next/link";
import styled from "styled-components";
import SiteShell from "../components/SiteShell";
import { bp, fluidColumns, shrinkable, theme } from "../components/ui";

const Hero = styled.section`
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 28px;
  align-items: center;
  padding: 12px 0 22px;

  @media (max-width: ${bp.md}) {
    grid-template-columns: 1fr;
    gap: 18px;
    padding-bottom: 12px;
  }
`;

const HeroPanel = styled.div`
  position: relative;
  min-width: 0;
  /* Un halo bleu/rose dans les angles réchauffe le verre dépoli sans casser la
     lisibilité du texte au centre. */
  background:
    radial-gradient(130% 90% at 100% 0%, ${theme.glowPrimary}, transparent 55%),
    radial-gradient(120% 90% at 0% 100%, ${theme.glowAccent}, transparent 55%),
    ${theme.surface};
  backdrop-filter: ${theme.glassBlur};
  -webkit-backdrop-filter: ${theme.glassBlur};
  border: 1px solid ${theme.glassBorder};
  border-radius: 28px;
  padding: clamp(20px, 4vw, 42px);
  box-shadow: ${theme.shadow}, ${theme.highlight};

  h1 {
    margin: 0 0 16px;
    /* La borne basse suivait la taille de police racine, pas la largeur
       disponible : sur mobile le titre partait en quatre lignes serrées.
       La borne haute est volontairement contenue : au-delà, « bistoucleur·euses »
       ne tenait plus sur sa ligne dans la colonne du hero. */
    font-size: clamp(1.9rem, 5.5vw, 3.4rem);
    line-height: 1.1;
    color: #16213d;
    min-width: 0;
    /* On garde les mots entiers (pas de coupure au milieu de « bistoucleur·euses »)
       et on répartit les lignes de façon équilibrée. */
    overflow-wrap: normal;
    text-wrap: balance;
    hyphens: none;
  }

  p {
    margin: 0 0 26px;
    color: rgba(22, 33, 61, 0.8);
    font-size: 1.04rem;
    max-width: 58ch;
  }

  @media (max-width: ${bp.sm}) {
    border-radius: 22px;

    p {
      margin-bottom: 20px;
    }
  }
`;

const CTAGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;

  /* Empilés, deux boutons de largeurs différentes font brouillon : sur mobile
     ils prennent la même largeur pleine. */
  @media (max-width: ${bp.sm}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const PrimaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 22px;
  border-radius: 999px;
  background: linear-gradient(135deg, #2d5bd9, #5c7df5);
  color: white;
  font-weight: 700;
  box-shadow: 0 16px 28px rgba(45, 91, 217, 0.24);
`;

const SecondaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 22px;
  border-radius: 999px;
  background: rgba(243, 247, 255, 0.9);
  border: 1px solid rgba(45, 91, 217, 0.18);
  color: #1a2d4d;
  font-weight: 700;
`;

const FeatureImage = styled.div`
  border-radius: 28px;
  overflow: hidden;
  min-height: 360px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08)),
    url('/dos.png') center/cover no-repeat;
  border: 1px solid rgba(26, 39, 72, 0.08);
  box-shadow: 0 18px 40px rgba(20, 32, 64, 0.08);

  /* Sur une colonne, une hauteur fixe de 360px recadrait la photo de façon
     agressive : un ratio garde le même cadrage qu'en desktop. */
  @media (max-width: ${bp.md}) {
    min-height: 0;
    aspect-ratio: 16 / 10;
    border-radius: 22px;
  }
`;

const Section = styled.section`
  margin-top: 24px;
  min-width: 0;

  @media (max-width: ${bp.sm}) {
    margin-top: 20px;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
  margin-bottom: 18px;

  h2 {
    margin: 0;
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    color: #1c2d52;
  }

  span {
    color: #2f4d81;
    font-weight: 700;
    opacity: 0.95;
  }

  @media (max-width: ${bp.sm}) {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 14px;
  }
`;

const ActivityGrid = styled.div`
  display: grid;
  /* Trois colonnes, puis deux sur tablette, puis une : la grille suit la place
     disponible au lieu de sauter directement de trois à une. */
  ${fluidColumns("260px")};
  gap: 18px;

  @media (max-width: ${bp.sm}) {
    grid-template-columns: 1fr;
    gap: 14px;
  }
`;

const Card = styled.article`
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  min-height: 240px;
  padding: 24px 22px 22px;
  border-radius: 24px;
  background:
    radial-gradient(120% 80% at 100% 0%, rgba(92, 125, 245, 0.1), transparent 55%),
    ${theme.surface};
  backdrop-filter: ${theme.glassBlur};
  -webkit-backdrop-filter: ${theme.glassBlur};
  border: 1px solid ${theme.glassBorder};
  box-shadow: ${theme.shadow}, ${theme.highlight};
  color: ${theme.ink};
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${theme.shadowHover}, ${theme.highlight};
  }

  /* En une colonne, la hauteur plancher ne sert qu'à créer du vide. */
  @media (max-width: ${bp.sm}) {
    min-height: 0;
    gap: 14px;
    padding: 22px 20px 20px;
    border-radius: 20px;
  }
`;

const CardBadges = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, ${theme.primary}, ${theme.primarySoft});
  border: 1px solid transparent;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  box-shadow: 0 8px 16px rgba(45, 91, 217, 0.24);
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: clamp(1.3rem, 3.4vw, 1.6rem);
  line-height: 1.2;
  color: #16213d;
  ${shrinkable};
`;

const CardText = styled.p`
  margin: 0;
  color: rgba(22, 33, 61, 0.78);
  line-height: 1.7;
  ${shrinkable};
`;

const MiniLink = styled(Link)`
  margin-top: auto;
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.8rem 1rem;
  background: rgba(233, 240, 255, 0.9);
  border: 1px solid rgba(71, 118, 234, 0.18);
  color: #1a2748;
  font-weight: 700;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, ${theme.primary}, ${theme.primarySoft});
    color: #fff;
    transform: translateY(-1px);
  }
`;

const InfoLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  margin-top: 14px;
  border-radius: 999px;
  padding: 0.7rem 1.1rem;
  background: linear-gradient(135deg, #2d5bd9, #5c7df5);
  color: white;
  font-weight: 700;
  box-shadow: 0 12px 24px rgba(45, 91, 217, 0.22);
`;

const InfosGrid = styled.div`
  display: grid;
  ${fluidColumns("240px")};
  gap: 18px;

  @media (max-width: ${bp.sm}) {
    grid-template-columns: 1fr;
    gap: 14px;
  }
`;

const InfoCard = styled.div`
  position: relative;
  overflow: hidden;
  min-width: 0;
  padding: 22px;
  border-radius: 24px;
  background: ${theme.surface};
  backdrop-filter: ${theme.glassBlur};
  -webkit-backdrop-filter: ${theme.glassBlur};
  border: 1px solid ${theme.glassBorder};
  box-shadow: ${theme.shadow}, ${theme.highlight};
  color: ${theme.ink};

  h3 {
    margin: 0 0 12px;
    font-size: 1.2rem;
    ${shrinkable};
  }

  p {
    margin: 0;
    color: rgba(22, 33, 61, 0.8);
    line-height: 1.7;
    ${shrinkable};
  }

  @media (max-width: ${bp.sm}) {
    padding: 20px;
    border-radius: 20px;
  }
`;

export default function Home() {
  return (
    <SiteShell currentPath='/'>
      <Hero>
        <HeroPanel>
          <h1>Le club de tous les bistoucleur·euses.</h1>
          <p>
            Bistouclette, c&apos;est l&apos;association des adeptes du vélo sous toutes ses formes, dans
            la convivialité et le respect qui vont avec. Cette année, on lance aussi une équipe de foot
            à 7 mixte&nbsp;: les Bistouclette Ball Lovers.
          </p>

          <CTAGroup>
            <PrimaryButton href='/five'>Notre équipe de foot</PrimaryButton>
            <SecondaryButton href='/velo'>Découvrir le vélo</SecondaryButton>
          </CTAGroup>
        </HeroPanel>

        <FeatureImage aria-label='Photo de l&apos;association' />
      </Hero>

      <Section>
        <SectionHeader>
          <h2>Nos activités</h2>
        </SectionHeader>

        <ActivityGrid>
          <Card>
            <CardBadges>Association</CardBadges>
            <CardTitle>Convivialité &amp; projets</CardTitle>
            <CardText>
              Une asso pour mener plus de projets ensemble et se donner les moyens de faire toujours
              plus de vélo.
            </CardText>
            <MiniLink href='/'>Découvrir l&apos;asso</MiniLink>
          </Card>

          <Card>
            <CardBadges>Vélo</CardBadges>
            <CardTitle>Le vélo sous toutes ses formes</CardTitle>
            <CardText>
              Des sorties et des escapades à vélo, dans la convivialité et le respect.
            </CardText>
            <MiniLink href='/velo'>Voir le vélo</MiniLink>
          </Card>

          <Card>
            <CardBadges>Foot à 7</CardBadges>
            <CardTitle>Bistouclette Ball Lovers</CardTitle>
            <CardText>
              Notre équipe de foot à 7 mixte engagée en championnat, avec un match chaque semaine.
            </CardText>
            <MiniLink href='/five'>Suivre l&apos;équipe</MiniLink>
          </Card>
        </ActivityGrid>
      </Section>

      <Section>
        <SectionHeader>
          <h2>Cette année</h2>
        </SectionHeader>

        <InfosGrid>
          <InfoCard>
            <h3>Le club</h3>
            <p>
              Une association qui mise sur la convivialité, le respect et l&apos;envie de faire plus de
              projets ensemble.
            </p>
          </InfoCard>

          <InfoCard>
            <h3>Le vélo</h3>
            <p>
              Le vélo sous toutes ses formes&nbsp;: des sorties et des escapades à plusieurs.
            </p>
          </InfoCard>

          <InfoCard>
            <h3>Le foot à 7</h3>
            <p>
              Une équipe mixte, les Bistouclette Ball Lovers, engagée en championnat avec un match
              chaque semaine.
            </p>
          </InfoCard>
        </InfosGrid>
      </Section>

      <Section>
        <SectionHeader>
          <h2>Nous rejoindre</h2>
        </SectionHeader>

        <InfosGrid>
          <InfoCard>
            <h3>Adhérer à l&apos;asso</h3>
            <p>
              10&nbsp;€ pour soutenir nos projets et accéder à quelques surprises qu&apos;on vous
              prépare.
            </p>
            <InfoLink
              href='https://www.helloasso.com/associations/bistouclette'
              target='_blank'
              rel='noopener noreferrer'
            >
              Adhérer sur HelloAsso
            </InfoLink>
          </InfoCard>

          <InfoCard>
            <h3>Rejoindre l&apos;équipe de foot</h3>
            <p>
              Envie de jouer avec nous&nbsp;? Envoyez-nous un petit message pour rejoindre les
              Bistouclette Ball Lovers.
            </p>
          </InfoCard>
        </InfosGrid>
      </Section>
    </SiteShell>
  );
}

