import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import styled from "styled-components";
import { bp } from "./ui";
import AuthCookie from "../utils/AuthCookie";
import UserCookie from "../utils/UserCookie";

const navItems = [
  { label: "Accueil", href: "/" },
  { label: "Vélo", href: "/velo" },
  { label: "Foot", href: "/five" },
];

/** Gouttière horizontale commune à l'en-tête, au contenu et au pied de page. */
const gutter = "clamp(16px, 4vw, 20px)";

const Wrapper = styled.div`
  min-height: 100vh;
  color: #f8fafc;
  /* Le contenu est déjà fluide ; ce garde-fou évite qu'un futur élément large
     ne rende la page scrollable horizontalement sur mobile. */
  overflow-x: clip;
`;

const Header = styled.header`
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px ${gutter} 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;

  /* Sous cette largeur la barre passe en deux rangées nettes — marque, puis
     navigation — au lieu de laisser un seul bouton déborder sur une ligne. */
  @media (max-width: ${bp.md}) {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding-top: 18px;
  }
`;

const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 14px;
  color: #fff;
  flex-shrink: 0;
`;

const BrandMark = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(48px, 12vw, 64px);
  height: clamp(48px, 12vw, 64px);
  flex-shrink: 0;
  border-radius: 18px;
  background: transparent;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const BrandText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  strong {
    font-size: clamp(1rem, 3.4vw, 1.15rem);
    letter-spacing: 0.04em;
    color: #16213d;
  }

  span {
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.8;
    color: #324163;
  }
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  @media (max-width: ${bp.md}) {
    justify-content: space-between;
    gap: 10px;
  }

  /* Les liens de page défilent sur une seule ligne ; le bloc compte garde sa
     propre rangée, alignée à droite comme sur desktop.

     Le retour à la ligne flex doit être désactivé ici : combiné à une
     direction colonne, il répartit les enfants en plusieurs colonnes
     dimensionnées sur leur contenu maximal, qui débordent de la barre. */
  @media (max-width: ${bp.sm}) {
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: stretch;
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  @media (max-width: ${bp.sm}) {
    overflow-x: auto;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 2px;

    &::-webkit-scrollbar {
      display: none;
    }

    /* Chaque lien garde la même largeur : la rangée reste régulière. */
    > * {
      flex: 1 0 auto;
    }
  }
`;

const NavItem = styled(Link)<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 18px;
  white-space: nowrap;
  border-radius: 999px;
  border: 1px solid rgba(30, 52, 93, 0.08);
  background: ${({ $active }) => ($active ? "rgba(71, 118, 234, 0.14)" : "rgba(255,255,255,0.82)")};
  color: #16213d;
  font-weight: 700;
  transition: 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.95);
    transform: translateY(-1px);
  }
`;

const Cta = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  background: linear-gradient(135deg, #2d5bd9, #5c7df5);
  color: white;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 12px 22px rgba(45, 91, 217, 0.24);

  @media (max-width: ${bp.sm}) {
    width: 100%;
  }
`;

const UserActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  @media (max-width: ${bp.sm}) {
    justify-content: space-between;
  }
`;

const UserBadge = styled.div`
  display: inline-block;
  min-width: 0;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(30, 52, 93, 0.08);
  color: #16213d;
  font-weight: 700;
  line-height: 40px;
  /* Un prénom long est tronqué plutôt que de pousser la barre hors de l'écran. */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const LogoutButton = styled.button`
  border: none;
  background: rgba(19, 29, 48, 0.08);
  color: #16213d;
  border-radius: 999px;
  min-height: 42px;
  padding: 0 14px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
`;

const Main = styled.main`
  max-width: 1180px;
  margin: 0 auto;
  min-width: 0;
  padding: 12px ${gutter} 56px;

  @media (max-width: ${bp.sm}) {
    padding-bottom: 40px;
  }
`;

const Footer = styled.footer`
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 ${gutter} 40px;
  color: rgba(12, 21, 36, 0.7);
  font-size: 0.92rem;
`;

const FooterInner = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid rgba(26, 39, 72, 0.12);

  @media (max-width: ${bp.sm}) {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
`;

type UserSession = {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: "user" | "admin";
};

interface SiteShellProps {
  currentPath: string;
  children: ReactNode;
}

export default function SiteShell({ currentPath, children }: SiteShellProps) {
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const syncUser = () => setUser(UserCookie.get());
    syncUser();

    if (typeof window !== "undefined") {
      window.addEventListener("storage", syncUser);
      return () => window.removeEventListener("storage", syncUser);
    }
  }, []);

  const handleLogout = () => {
    AuthCookie.clearToken();
    UserCookie.clear();
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <Wrapper>
      <Header>
        <Brand href='/' aria-label='Accueil du club'>
          <BrandMark>
            <Image src='/logo.svg' alt='Logo Bistouclette' width={64} height={64} />
          </BrandMark>
          <BrandText>
            <span>Club</span>
            <strong>Bistouclette</strong>
          </BrandText>
        </Brand>

        <Nav aria-label='Navigation principale'>
          <NavLinks>
            {navItems.map((item) => (
              <NavItem key={item.href} href={item.href} $active={currentPath === item.href}>
                {item.label}
              </NavItem>
            ))}

            {isAdmin && <NavItem href='/admin' $active={currentPath === '/admin'}>Admin</NavItem>}
          </NavLinks>

          {user ? (
            <UserActions>
              <UserBadge>Salut {user.firstName || user.username || user.email}</UserBadge>
              <LogoutButton type='button' onClick={handleLogout}>Déconnexion</LogoutButton>
            </UserActions>
          ) : (
            <Cta href='/signin'>Connexion</Cta>
          )}
        </Nav>
      </Header>

      <Main>{children}</Main>

      <Footer>
        <FooterInner>
          <div>© 2025 Bistouclette — club de vélo &amp; foot</div>
          <div>Association • Parcours • Compétition</div>
        </FooterInner>
      </Footer>
    </Wrapper>
  );
}
