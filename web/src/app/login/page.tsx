'use client';

import { FormEvent, useState } from 'react';

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: {
      code: string;
      name: string;
    };
  };
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@site-ticket.local');
  const [password, setPassword] = useState('Admin1234!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LoginResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as LoginResponse | { message?: string };

      if (!response.ok) {
        throw new Error(
          typeof payload === 'object' && payload && 'message' in payload
            ? String(payload.message ?? 'Connexion impossible.')
            : 'Connexion impossible.',
        );
      }

      const loginResponse = payload as LoginResponse;
      localStorage.setItem('site-ticket-token', loginResponse.accessToken);
      setResult(loginResponse);
    } catch (submitError) {
      setResult(null);
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Connexion impossible.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell auth-shell">
      <section className="auth-card">
        <div>
          <p className="eyebrow">Internal access</p>
          <h1>Sign in to SiteTicket</h1>
          <p className="hero-copy">
            This page calls the NestJS API directly and stores the returned JWT
            in local storage.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@site-ticket.local"
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Admin1234!"
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        {error ? <p className="feedback error">{error}</p> : null}

        {result ? (
          <div className="feedback success">
            <p>
              Connected as {result.user.first_name} {result.user.last_name}.
            </p>
            <p>Role: {result.user.role.name}</p>
            <p>JWT saved under site-ticket-token.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}