'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

type Ticket = {
  id: string;
  ticket_number: string;
  title: string;
  description?: string;
  status: {
    id: string;
    name: string;
  };
  project: {
    name: string;
  };
};

type Project = {
  id: string;
  name: string;
  code: string;
};

type TicketType = {
  id: string;
  name: string;
  code: string;
};

type TicketStatus = {
  id: string;
  name: string;
  code: string;
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectId: '',
    ticketTypeId: '',
    title: '',
    description: '',
    priority: 'medium',
    isBlocking: false,
    trade: '',
    externalParty: '',
  });

  async function loadTickets() {
    try {
      const token = localStorage.getItem('site-ticket-token');
      const response = await fetch('http://localhost:3001/tickets', {
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Unable to load tickets');
      }

      const data = (await response.json()) as Ticket[];
      setTickets(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMetadata() {
    try {
      const token = localStorage.getItem('site-ticket-token');
      const [projectsResponse, ticketTypesResponse, statusesResponse] = await Promise.all([
        fetch('http://localhost:3001/projects', {
          headers: { Authorization: `Bearer ${token ?? ''}` },
        }),
        fetch('http://localhost:3001/ticket-types', {
          headers: { Authorization: `Bearer ${token ?? ''}` },
        }),
        fetch('http://localhost:3001/ticket-statuses', {
          headers: { Authorization: `Bearer ${token ?? ''}` },
        }),
      ]);

      if (projectsResponse.ok) {
        const projectsData = (await projectsResponse.json()) as Project[];
        setProjects(projectsData);
      }

      if (ticketTypesResponse.ok) {
        const ticketTypesData = (await ticketTypesResponse.json()) as TicketType[];
        setTicketTypes(ticketTypesData);
      }

      if (statusesResponse.ok) {
        const statusesData = (await statusesResponse.json()) as TicketStatus[];
        setStatuses(statusesData);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    void loadMetadata();
    void loadTickets();
  }, []);

  async function handleStatusChange(ticketId: string, statusId: string) {
    try {
      const token = localStorage.getItem('site-ticket-token');
      const response = await fetch(`http://localhost:3001/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({ statusId }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.message ?? 'Unable to update the ticket status.');
      }

      setMessage('Status updated successfully.');
      await loadTickets();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to update the ticket status.',
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('site-ticket-token');
      const response = await fetch('http://localhost:3001/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({
          projectId: form.projectId,
          ticketTypeId: form.ticketTypeId,
          title: form.title,
          description: form.description,
          priority: form.priority,
          isBlocking: form.isBlocking,
          trade: form.trade,
          externalParty: form.externalParty,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(
          errorPayload?.message ?? 'Unable to create the ticket.',
        );
      }

      setMessage('Ticket created successfully.');
      setForm({
        projectId: '',
        ticketTypeId: '',
        title: '',
        description: '',
        priority: 'medium',
        isBlocking: false,
        trade: '',
        externalParty: '',
      });
      await loadTickets();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to create the ticket.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero-card">
        <p className="eyebrow">Tickets</p>
        <h1>Ticket list</h1>
        <p className="hero-copy">
          This page lists the tickets created through the API and lets you create a new one.
        </p>
        <div className="hero-actions">
          <Link className="primary-link" href="/">
            Back home
          </Link>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem', display: 'grid', gap: '0.75rem' }}>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Title</span>
            <input
              required
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>

          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Description</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>

          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Project</span>
            <select
              required
              value={form.projectId}
              onChange={(event) => setForm({ ...form, projectId: event.target.value })}
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Ticket type</span>
            <select
              required
              value={form.ticketTypeId}
              onChange={(event) => setForm({ ...form, ticketTypeId: event.target.value })}
            >
              <option value="">Select a type</option>
              {ticketTypes.map((ticketType) => (
                <option key={ticketType.id} value={ticketType.id}>
                  {ticketType.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Priority</span>
            <select
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>

          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={form.isBlocking}
              onChange={(event) => setForm({ ...form, isBlocking: event.target.checked })}
            />
            <span>Blocking</span>
          </label>

          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Trade</span>
            <input
              value={form.trade}
              onChange={(event) => setForm({ ...form, trade: event.target.value })}
            />
          </label>

          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>External party</span>
            <input
              value={form.externalParty}
              onChange={(event) => setForm({ ...form, externalParty: event.target.value })}
            />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create ticket'}
          </button>
        </form>

        {message ? <p style={{ marginTop: '0.75rem' }}>{message}</p> : null}

        {loading ? (
          <p>Loading…</p>
        ) : tickets.length === 0 ? (
          <p>No tickets yet.</p>
        ) : (
          <ul style={{ marginTop: '1rem', paddingLeft: '1.2rem' }}>
            {tickets.map((ticket) => (
              <li key={ticket.id} style={{ marginBottom: '0.75rem' }}>
                <strong>{ticket.ticket_number}</strong> — {ticket.title}
                <br />
                <span>
                  Project: {ticket.project.name} • Status: {ticket.status.name}
                </span>
                <div style={{ marginTop: '0.5rem' }}>
                  <select
                    value={ticket.status.id}
                    onChange={(event) => void handleStatusChange(ticket.id, event.target.value)}
                  >
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
