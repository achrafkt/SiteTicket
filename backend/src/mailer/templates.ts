interface EmailContent {
  subject: string;
  html: string;
}

interface EmailUser {
  first_name: string;
}

interface EmailTicket {
  ticket_number: string;
  title: string;
}

interface EmailProject {
  name: string;
}

function emailLayout(
  bodyHtml: string,
  ctaLabel: string,
  ctaUrl: string,
): string {
  return `
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:#0b1f3a;padding:20px 28px;">
                <span style="color:#ffffff;font-size:16px;font-weight:bold;letter-spacing:0.02em;">SiteTicket</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#1f2937;font-size:14px;line-height:1.6;">
                ${bodyHtml}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td style="border-radius:6px;background-color:#2563eb;">
                      <a href="${ctaUrl}" style="display:inline-block;padding:10px 20px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">${ctaLabel}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background-color:#f8fafc;color:#94a3b8;font-size:11px;">
                Notification automatique SiteTicket — modifiable dans vos préférences de compte.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function ticketAssignedEmail(
  user: EmailUser,
  ticket: EmailTicket,
  url: string,
): EmailContent {
  return {
    subject: `Ticket assigné — ${ticket.ticket_number}`,
    html: emailLayout(
      `<p>Bonjour ${user.first_name},</p>
       <p>Le ticket <strong>${ticket.ticket_number} — ${ticket.title}</strong> vous a été assigné.</p>`,
      'Voir le ticket',
      url,
    ),
  };
}

export function statusChangedEmail(
  user: EmailUser,
  ticket: EmailTicket,
  statusLabel: string,
  url: string,
): EmailContent {
  return {
    subject: `Statut modifié — ${ticket.ticket_number}`,
    html: emailLayout(
      `<p>Bonjour ${user.first_name},</p>
       <p>Le ticket <strong>${ticket.ticket_number} — ${ticket.title}</strong> est passé à « ${statusLabel} ».</p>`,
      'Voir le ticket',
      url,
    ),
  };
}

export function mentionEmail(
  user: EmailUser,
  ticket: EmailTicket,
  url: string,
): EmailContent {
  return {
    subject: `Vous avez été mentionné — ${ticket.ticket_number}`,
    html: emailLayout(
      `<p>Bonjour ${user.first_name},</p>
       <p>Vous avez été mentionné dans un commentaire sur le ticket <strong>${ticket.ticket_number} — ${ticket.title}</strong>.</p>`,
      'Voir le ticket',
      url,
    ),
  };
}

export function dueSoonEmail(
  user: EmailUser,
  ticket: EmailTicket,
  url: string,
): EmailContent {
  return {
    subject: `Échéance proche — ${ticket.ticket_number}`,
    html: emailLayout(
      `<p>Bonjour ${user.first_name},</p>
       <p>Le ticket <strong>${ticket.ticket_number} — ${ticket.title}</strong> arrive à échéance bientôt.</p>`,
      'Voir le ticket',
      url,
    ),
  };
}

export function projectMembershipEmail(
  user: EmailUser,
  project: EmailProject,
  kind: 'added' | 'removed',
  url: string,
): EmailContent {
  const added = kind === 'added';
  return {
    subject: added
      ? `Ajouté au chantier ${project.name}`
      : `Retiré du chantier ${project.name}`,
    html: emailLayout(
      `<p>Bonjour ${user.first_name},</p>
       <p>${
         added
           ? `Vous avez été ajouté au chantier <strong>${project.name}</strong>.`
           : `Vous avez été retiré du chantier <strong>${project.name}</strong>.`
       }</p>`,
      'Voir le chantier',
      url,
    ),
  };
}
