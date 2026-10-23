import Image from "next/image";
import styled from "styled-components";
import SiteShell from "../components/SiteShell";
import { bp, fluidColumns, shrinkable, theme } from "../components/ui";

const Hero = styled.section`
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 22px;
  align-items: center;
  margin-bottom: 28px;

  @media (max-width: ${bp.md}) {
    grid-template-columns: 1fr;
    gap: 18px;
    margin-bottom: 20px;
  }
`;

const HeroPanel = styled.div`
  position: relative;
  min-width: 0;
  padding: clamp(20px, 4vw, 40px);
  background:
    radial-gradient(130% 90% at 100% 0%, ${theme.glowPrimary}, transparent 55%),
    radial-gradient(120% 90% at 0% 100%, ${theme.glowAccent}, transparent 55%),
    ${theme.surface};
  backdrop-filter: ${theme.glassBlur};
  -webkit-backdrop-filter: ${theme.glassBlur};
  border: 1px solid ${theme.glassBorder};
  border-radius: 28px;
  box-shadow: ${theme.shadow}, ${theme.highlight};

  h1 {
    margin: 0 0 16px;
    font-size: clamp(2rem, 7vw, 4rem);
    line-height: 1.08;
    color: #16213d;
    ${shrinkable};
  }

  p {
    margin: 0;
    color: rgba(22, 33, 61, 0.8);
    font-size: 1.04rem;
    max-width: 58ch;
  }

  @media (max-width: ${bp.sm}) {
    border-radius: 22px;
  }
`;

const HeroMedia = styled.div`
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid ${theme.glassBorder};
  box-shadow: ${theme.shadow}, ${theme.highlight};

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Même cadrage qu'en desktop une fois la grille passée sur une colonne. */
  @media (max-width: ${bp.md}) {
    aspect-ratio: 16 / 10;
    border-radius: 22px;
  }
`;

const Stats = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 28px;

  @media (max-width: ${bp.md}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }

  /* On reste sur deux colonnes jusqu'en bas : une seule colonne donnait des
     tuiles très larges et presque vides. */
  @media (max-width: ${bp.xs}) {
    gap: 10px;
  }
`;

const StatCard = styled.article`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 18px 20px;
  border-radius: 20px;
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(92, 125, 245, 0.12), transparent 60%),
    ${theme.surface};
  backdrop-filter: ${theme.glassBlur};
  -webkit-backdrop-filter: ${theme.glassBlur};
  border: 1px solid ${theme.glassBorder};
  color: #121a2d;
  box-shadow: ${theme.shadow}, ${theme.highlight};

  img {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
  }

  h3 {
    margin: 0;
    font-size: clamp(1.05rem, 3.6vw, 1.35rem);
    line-height: 1.2;
    ${shrinkable};
  }

  @media (max-width: ${bp.md}) {
    gap: 10px;
    padding: 14px 16px;

    img {
      width: 32px;
      height: 32px;
    }
  }
`;

const Section = styled.section`
  margin-top: 24px;
  min-width: 0;

  @media (max-width: ${bp.sm}) {
    margin-top: 20px;
  }
`;

const SectionTitle = styled.h2`
  margin: 0 0 18px;
  font-size: clamp(1.6rem, 5vw, 2.5rem);
  line-height: 1.15;
  ${shrinkable};

  @media (max-width: ${bp.sm}) {
    margin-bottom: 14px;
  }
`;

const TraceCard = styled.div`
  min-width: 0;
  background: ${theme.surface};
  backdrop-filter: ${theme.glassBlur};
  -webkit-backdrop-filter: ${theme.glassBlur};
  border: 1px solid ${theme.glassBorder};
  border-radius: 28px;
  padding: 20px;
  box-shadow: ${theme.shadow}, ${theme.highlight};

  @media (max-width: ${bp.sm}) {
    padding: 14px;
    border-radius: 22px;
  }
`;

const Map = styled.div`
  overflow: hidden;
  border-radius: 22px;
  margin-bottom: 18px;

  img {
    display: block;
    width: 100%;
    height: auto;
  }
`;

const CtaButton = styled.button`
  border: none;
  border-radius: 999px;
  padding: 0.9rem 1.4rem;
  background: linear-gradient(135deg, #4776ea 0%, #6d8eff 100%);
  color: white;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 12px 22px rgba(71, 118, 234, 0.24);

  @media (max-width: ${bp.sm}) {
    width: 100%;
  }
`;

const HighlightGrid = styled.div`
  display: grid;
  ${fluidColumns("260px")};
  gap: 18px;

  @media (max-width: ${bp.sm}) {
    grid-template-columns: 1fr;
    gap: 14px;
  }
`;

const Highlight = styled.article`
  min-width: 0;
  padding: 22px;
  border-radius: 22px;
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

  h3 {
    margin: 0 0 12px;
    font-size: 1.3rem;
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

export default function VeloPage() {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = "/BISTOUCLETTE_2023.gpx";
    link.download = "BISTOUCLETTE_2023.gpx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <SiteShell currentPath='/velo'>
      <Hero>
        <HeroPanel>
          <h1>Le vélo, au cœur de l’aventure.</h1>
          <p>
            Le vélo sous toutes ses formes, dans la convivialité et le respect. On part à l’aventure à
            plusieurs, et on partage ici les parcours de nos escapades.
          </p>
        </HeroPanel>

        <HeroMedia>
          <Image src='/dos.png' alt='Parcours vélo Bistouclette' width={1000} height={850} />
        </HeroMedia>
      </Hero>

      <Stats>
        <StatCard>
          <Image src='/rule.svg' alt='distance' width={40} height={40} />
          <div>
            <h3>358.27 km</h3>
          </div>
        </StatCard>
        <StatCard>
          <Image src='/montain.svg' alt='dénivelé' width={40} height={40} />
          <div>
            <h3>5 804m D+</h3>
          </div>
        </StatCard>
        <StatCard>
          <Image src='/calendar.svg' alt='durée' width={40} height={40} />
          <div>
            <h3>5 jours</h3>
          </div>
        </StatCard>
        <StatCard>
          <Image src='/people.svg' alt='participants' width={40} height={40} />
          <div>
            <h3>6 riders</h3>
          </div>
        </StatCard>
      </Stats>

      <Section>
        <SectionTitle>Pourquoi on roule avec le club</SectionTitle>
        <HighlightGrid>
          <Highlight>
            <h3>Convivialité</h3>
            <p>
              Des sorties à plusieurs, dans la bonne humeur et le respect de chacun.
            </p>
          </Highlight>
          <Highlight>
            <h3>Parcours</h3>
            <p>
              Des itinéraires variés à parcourir à vélo, à retrouver et télécharger ici.
            </p>
          </Highlight>
          <Highlight>
            <h3>Le vélo sous toutes ses formes</h3>
            <p>
              De la balade à l’escapade sur plusieurs jours : chacun roule à son rythme.
            </p>
          </Highlight>
        </HighlightGrid>
      </Section>

      <Section>
        <SectionTitle>Le parcours</SectionTitle>
        <TraceCard>
          <Map>
            <Image src='/trace.png' alt='Trace du parcours' width={1200} height={700} />
          </Map>
          <CtaButton onClick={handleDownload}>Télécharger le GPX</CtaButton>
        </TraceCard>
      </Section>
    </SiteShell>
  );
}
