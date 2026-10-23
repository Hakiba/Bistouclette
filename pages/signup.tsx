import Link from "next/link";
import React from "react";
import styled from "styled-components";
import AuthCookie from "../utils/AuthCookie";
import UserCookie from "../utils/UserCookie";

const PageShell = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(16px, 5vw, 24px);
`;

const Card = styled.div`
  width: min(100%, 520px);
  background:
    radial-gradient(130% 90% at 100% 0%, rgba(45, 91, 217, 0.14), transparent 55%),
    radial-gradient(120% 90% at 0% 100%, rgba(227, 111, 176, 0.14), transparent 55%),
    rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.6);
  backdrop-filter: saturate(150%) blur(14px);
  -webkit-backdrop-filter: saturate(150%) blur(14px);
  border-radius: 28px;
  padding: clamp(22px, 6vw, 32px) clamp(18px, 5vw, 28px);
  box-shadow:
    0 22px 48px -18px rgba(23, 43, 94, 0.34),
    0 8px 20px -14px rgba(23, 43, 94, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.75);
  color: #1a2748;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;

  h1 {
    margin: 0;
    font-size: clamp(1.7rem, 6vw, 2.5rem);
    line-height: 1.15;
    color: #1a2748;
    min-width: 0;
    overflow-wrap: anywhere;
  }
`;

const BackLink = styled(Link)`
  color: #1a2748;
  font-weight: 600;
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: rgba(26, 39, 72, 0.82);
  font-size: 0.96rem;

  &:last-of-type,
  &:nth-last-of-type(2) {
    grid-column: 1 / -1;
  }
`;

const Input = styled.input`
  width: 100%;
  border: 1px solid rgba(26, 39, 72, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  color: #1a2748;
  padding: 0.9rem 1rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: rgba(26, 39, 72, 0.5);
  }

  &:focus {
    border-color: rgba(109, 142, 255, 0.8);
    box-shadow: 0 0 0 4px rgba(109, 142, 255, 0.18);
  }
`;

const Button = styled.button`
  margin-top: 12px;
  grid-column: 1 / -1;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #4776ea, #6d8eff);
  color: white;
  padding: 0.95rem 1.2rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 15px 25px rgba(71, 118, 234, 0.28);
`;

const SecondaryText = styled.p`
  margin: 18px 0 0;
  color: rgba(26, 39, 72, 0.72);
  text-align: center;

  a {
    color: #1a2748;
    font-weight: 700;
  }
`;

export default function SignUp() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pseudo, setPseudo] = React.useState("");
  const [nom, setNom] = React.useState("");
  const [prenom, setPrenom] = React.useState("");

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const userObject = {
        email,
        password,
        username: pseudo,
        firstName: prenom,
        lastName: nom,
      };

      const response = await fetch(`${apiUrl}/create_user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userObject),
      });

      const data = await response.json();

      if (response.ok) {
        AuthCookie.setToken(data.token);
        UserCookie.set(data.user);
        window.location.href = "/";
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert(error);
    }
  };

  return (
    <PageShell>
      <Card>
        <Header>
          <h1>Inscription</h1>
          <BackLink href='/'>Accueil</BackLink>
        </Header>

        <Form onSubmit={handleSubmit}>
          <Field>
            Prénom
            <Input
              type='text'
              placeholder='Jean'
              required
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
            />
          </Field>

          <Field>
            Nom
            <Input
              type='text'
              placeholder='Dupont'
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
          </Field>

          <Field>
            Pseudo
            <Input
              type='text'
              placeholder='CyclisteNomade'
              required
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
            />
          </Field>

          <Field>
            Email
            <Input
              type='email'
              placeholder='exemple@email.com'
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field>
            Mot de passe
            <Input
              type='password'
              placeholder='••••••••'
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <Button type='submit'>S’inscrire</Button>
        </Form>

        <SecondaryText>
          Déjà inscrit ? <Link href='/signin'>Se connecter</Link>
        </SecondaryText>
      </Card>
    </PageShell>
  );
}
