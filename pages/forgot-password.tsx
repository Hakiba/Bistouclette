import Link from "next/link";
import React, { useState } from "react";
import styled from "styled-components";
import { api, errorMessage } from "../lib/api";

const PageShell = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(16px, 5vw, 24px);
`;

const Card = styled.div`
  width: min(100%, 440px);
  background:
    radial-gradient(
      130% 90% at 100% 0%,
      rgba(45, 91, 217, 0.14),
      transparent 55%
    ),
    radial-gradient(
      120% 90% at 0% 100%,
      rgba(227, 111, 176, 0.14),
      transparent 55%
    ),
    rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.6);
  backdrop-filter: saturate(150%) blur(14px);
  -webkit-backdrop-filter: saturate(150%) blur(14px);
  border-radius: 28px;
  padding: clamp(22px, 6vw, 32px) clamp(18px, 5vw, 28px);
  box-shadow:
    0 22px 48px -18px rgba(23, 43, 94, 0.34),
    0 8px 20px -14px rgba(23, 43, 94, 0.22);
  color: #1a2748;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;

  h1 {
    margin: 0;
    font-size: clamp(1.7rem, 6vw, 2.5rem);
    line-height: 1.15;
    color: #1a2748;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: rgba(26, 39, 72, 0.82);
`;

const Input = styled.input`
  width: 100%;
  border: 1px solid rgba(26, 39, 72, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  color: #1a2748;
  padding: 0.9rem 1rem;

  &:focus {
    outline: 3px solid rgba(109, 142, 255, 0.25);
    border-color: rgba(109, 142, 255, 0.8);
  }
`;

const Button = styled.button`
  margin-top: 8px;
  background: linear-gradient(135deg, #4776ea, #6d8eff);
  color: white;
  border: none;
  border-radius: 999px;
  padding: 0.95rem 1.2rem;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
`;

const Message = styled.p`
  color: rgba(26, 39, 72, 0.82);
  line-height: 1.5;
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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await api.post<{ message: string }>(
        "/password/forgot",
        { email },
        "none",
      );
      setMessage(response.message);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <Card>
        <Header>
          <h1>Mot de passe oublié</h1>
        </Header>
        <Message>
          Saisissez l’adresse email de votre compte. Si elle existe, vous
          recevrez un lien de réinitialisation.
        </Message>
        <Form onSubmit={handleSubmit}>
          <Label>
            Email
            <Input
              autoComplete="email"
              type="email"
              placeholder="exemple@email.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Label>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Envoi en cours…" : "Recevoir un lien"}
          </Button>
        </Form>
        {message && <Message role="status">{message}</Message>}
        <SecondaryText>
          <Link href="/signin">Retour à la connexion</Link>
        </SecondaryText>
      </Card>
    </PageShell>
  );
}
