"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, Eye } from "lucide-react";
import { getStoredUser, storeUser } from "@/lib/current-user";
import { useTicketStore } from "@/store/ticket-store";
import styles from "./login.module.css";

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

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@site-ticket.local");
  const [password, setPassword] = useState("Admin1234!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as
        | LoginResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message ?? "Connexion impossible.")
            : "Connexion impossible.",
        );
      }

      const loginResponse = payload as LoginResponse;
      localStorage.setItem("site-ticket-token", loginResponse.accessToken);
      storeUser(loginResponse.user);
      useTicketStore.getState().resetSession(getStoredUser());
      router.push("/helpdesk");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Connexion impossible.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.viewport}>
      <section className={styles.authCard}>
        <aside className={styles.visualPane} aria-hidden="true">
          <Image
            src="/illustrations/login-illustration.svg"
            alt=""
            fill
            className={styles.visualImage}
            priority
          />
        </aside>

        <div className={styles.formPane}>
          <div className={styles.brandBlock}>
            <div className={styles.brandBlock}>
              <Image
                src="/logo/logo-icon.png"
                alt="SiteTicket"
                width={72}
                height={72}
                className={styles.brandIcon}
                priority
              />
              <p className={styles.brandText}>SiteTicket</p>
            </div>
          </div>

          <div className={styles.headingBlock}>
            <h1>Connexion</h1>
            <p>Accédez à votre espace de gestion de chantier</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.fieldLabel} htmlFor="email">
              Email
            </label>
            <div className={styles.inputWrap}>
              <Mail size={18} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nom@entreprise.com"
                autoComplete="email"
                required
              />
            </div>

            <label className={styles.fieldLabel} htmlFor="password">
              Mot de passe
            </label>
            <div className={styles.inputWrap}>
              <Lock size={18} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Entrez votre mot de passe"
                autoComplete="current-password"
                required
              />
              <Eye size={18} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.signInButton}
            >
              {loading ? "Connexion en cours..." : "Se connecter"}
            </button>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}
          </form>

          <div className={styles.footerLinks}>
            <Link href="/">Accueil</Link>
            <span aria-hidden="true" className={styles.separator}>
              |
            </span>
            <a href="mailto:support@site-ticket.local">Support</a>
          </div>
        </div>
      </section>
    </main>
  );
}
