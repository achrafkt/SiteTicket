import Link from 'next/link';

export default function Home() {
  return (
    <main className="shell">
      <section className="hero-card">
        <p className="eyebrow">SiteTicket</p>
        <h1>Internal construction ticketing foundation.</h1>
        <p className="hero-copy">
          NestJS, Prisma, PostgreSQL and Next.js are wired for a first login to
          API to database flow.
        </p>
        <div className="hero-actions">
          <Link className="primary-link" href="/login">
            Open login page
          </Link>
          <Link className="secondary-link" href="/tickets">
            Open tickets
          </Link>
          <Link className="secondary-link" href="/helpdesk">
            Open helpdesk UI (mock)
          </Link>
          <a className="secondary-link" href="http://localhost:3001/health">
            API health
          </a>
        </div>
      </section>
    </main>
  );
}
