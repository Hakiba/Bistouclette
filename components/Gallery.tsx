import { useEffect, useState } from "react";
import styled from "styled-components";
import { errorMessage } from "../lib/api";
import {
  assetUrl,
  galleryApi,
  type AlbumSummary,
  type AlbumWithPhotos,
  type GallerySection,
} from "../lib/gallery";
import {
  Banner,
  Button,
  EmptyState,
  Overlay,
  Panel,
  PanelHeader,
  Spinner,
  fluidColumns,
  shrinkable,
  theme,
} from "./ui";

const AlbumGrid = styled.div`
  display: grid;
  ${fluidColumns("200px")};
  gap: 14px;
`;

const AlbumCard = styled.button`
  ${shrinkable};
  display: grid;
  gap: 8px;
  padding: 0;
  border: 1px solid ${theme.border};
  border-radius: 18px;
  overflow: hidden;
  background: ${theme.surfaceSoft};
  color: ${theme.ink};
  text-align: left;
  cursor: pointer;

  img,
  .placeholder {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    background: ${theme.border};
  }

  strong,
  span {
    padding: 0 12px;
  }

  span {
    padding-bottom: 12px;
    color: ${theme.inkSoft};
    font-size: 0.9rem;
  }
`;

const PhotoGrid = styled.div`
  display: grid;
  ${fluidColumns("160px")};
  gap: 10px;
`;

const PhotoThumb = styled.button`
  padding: 0;
  border: 0;
  border-radius: 14px;
  overflow: hidden;
  background: ${theme.border};
  cursor: zoom-in;

  img {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
  }
`;

const LightboxFrame = styled.div`
  display: grid;
  gap: 12px;
  justify-items: center;
  width: min(100%, 960px);

  img {
    max-width: 100%;
    max-height: calc(100vh - 140px);
    object-fit: contain;
    border-radius: 12px;
  }
`;

const LightboxControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
`;

/** Index voisin de `index` (`delta` = -1 ou +1) dans une liste de `count` éléments, en bouclant. */
const stepIndex = (index: number | null, delta: number, count: number) =>
  index === null ? null : (index + delta + count) % count;

interface GalleryProps {
  section: GallerySection;
}

/** Galerie d'une section : grille d'albums (les photos d'un album viennent à l'étape suivante). */
export default function Gallery({ section }: GalleryProps) {
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Propre à CET effet : le nettoyage ci-dessous le passe à true quand `section` change
    // ou que le composant disparaît, pour ignorer une réponse arrivée trop tard.
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await galleryApi.albums(section);
        if (!cancelled) {
          setAlbums(result.albums);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(errorMessage(cause));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [section]);

  // Album ouvert : `null` = on affiche la grille d'albums.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [album, setAlbum] = useState<AlbumWithPhotos | null>(null);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [albumError, setAlbumError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAlbum = async () => {
      if (selectedId === null) {
        setAlbum(null);
        return;
      }

      setAlbumLoading(true);
      setAlbumError(null);

      try {
        const result = await galleryApi.album(selectedId);
        if (!cancelled) {
          setAlbum(result.album);
        }
      } catch (cause) {
        if (!cancelled) {
          setAlbumError(errorMessage(cause));
        }
      } finally {
        if (!cancelled) {
          setAlbumLoading(false);
        }
      }
    };

    loadAlbum();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const current = album?.id === selectedId ? album : null;

  // Photo agrandie : index dans `current.photos`, ou `null` si la visionneuse est fermée.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Booléen et nombre de photos plutôt que l'index : l'effet ne se relance qu'à l'ouverture, à la
  // fermeture, ou si le nombre de photos change — pas à chaque flèche.
  const isLightboxOpen = lightboxIndex !== null;
  const photoCount = current?.photos.length ?? 0;

  const lightboxPhoto = lightboxIndex !== null ? current?.photos[lightboxIndex] : undefined;

  useEffect(() => {
    if (!isLightboxOpen || photoCount === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          setLightboxIndex(null);
          break;
        case "ArrowLeft":
          setLightboxIndex((i) => stepIndex(i, -1, photoCount));
          break;
        case "ArrowRight":
          setLightboxIndex((i) => stepIndex(i, 1, photoCount));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLightboxOpen, photoCount]);

  if (selectedId !== null) {
    return (
      <Panel>
        <PanelHeader>
          <Button
            type="button"
            $variant="secondary"
            $small
            onClick={() => {
              setLightboxIndex(null);
              setSelectedId(null);
            }}
          >
            ← Albums
          </Button>
          <h2>{current?.title ?? "Album"}</h2>
        </PanelHeader>

        {current === null && !albumError ? (
          <Spinner />
        ) : albumError ? (
          <Banner $tone="danger" role="alert">
            {albumError}
          </Banner>
        ) : current?.photos.length === 0 ? (
          <EmptyState>Aucune photo pour le moment.</EmptyState>
        ) : (
          <PhotoGrid>
            {current?.photos.map((photo, index) => (
              <PhotoThumb key={photo.id} type="button" onClick={() => setLightboxIndex(index)}>
                {/* Photos uploadées servies par le backend : next/image n'optimiserait rien (unoptimized). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={assetUrl(photo.url)}
                  alt={`Photo ${photo.id} de l'album ${current.title}`}
                  loading="lazy"
                />
              </PhotoThumb>
            ))}
          </PhotoGrid>
        )}

        {lightboxPhoto && current && lightboxIndex !== null && (
          <Overlay role="dialog" aria-modal="true" onClick={() => setLightboxIndex(null)}>
            <LightboxFrame onClick={(event) => event.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(lightboxPhoto.url)} alt={`Photo ${lightboxIndex + 1} de l'album ${current.title}`} />
              <LightboxControls>
                <Button
                  type="button"
                  $variant="secondary"
                  onClick={() => setLightboxIndex((i) => stepIndex(i, -1, photoCount))}
                >
                  ←
                </Button>
                <span>
                  {lightboxIndex + 1} / {photoCount}
                </span>
                <Button
                  type="button"
                  $variant="secondary"
                  onClick={() => setLightboxIndex((i) => stepIndex(i, 1, photoCount))}
                >
                  →
                </Button>
                <Button type="button" $variant="secondary" onClick={() => setLightboxIndex(null)}>
                  Fermer
                </Button>
              </LightboxControls>
            </LightboxFrame>
          </Overlay>
        )}
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader>
        <h2>Photos</h2>
        <span>{albums.length} album(s)</span>
      </PanelHeader>

      {loading ? (
        <Spinner />
      ) : error ? (
        <Banner $tone="danger" role="alert">
          {error}
        </Banner>
      ) : albums.length === 0 ? (
        <EmptyState>Aucune photo pour le moment.</EmptyState>
      ) : (
        <AlbumGrid>
          {albums.map((summary) => (
            <AlbumCard
              key={summary.id}
              type="button"
              onClick={() => setSelectedId(summary.id)}
            >
              {summary.coverUrl ? (
                // Photos uploadées servies par le backend : next/image n'optimiserait rien (unoptimized).
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetUrl(summary.coverUrl)}
                  alt={`Couverture de l'album ${summary.title}`}
                  loading="lazy"
                />
              ) : (
                <div className="placeholder" />
              )}
              <strong>{summary.title}</strong>
              <span>{summary.photoCount} photo(s)</span>
            </AlbumCard>
          ))}
        </AlbumGrid>
      )}
    </Panel>
  );
}
