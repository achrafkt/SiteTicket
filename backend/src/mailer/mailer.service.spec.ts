import * as nodemailer from 'nodemailer';
import { MailerService } from './mailer.service';

jest.mock('nodemailer');

describe('MailerService', () => {
  let sendMail: jest.Mock;
  let service: MailerService;

  beforeEach(() => {
    sendMail = jest.fn();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

    const config = { get: jest.fn().mockReturnValue(undefined) } as never;
    service = new MailerService(config);
  });

  it('sends the email through the underlying transporter', async () => {
    sendMail.mockResolvedValue(undefined);

    await service.sendMail({
      to: 'user@example.com',
      subject: 'Sujet',
      html: '<p>Contenu</p>',
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Sujet',
        html: '<p>Contenu</p>',
      }),
    );
  });

  // The whole point of this service: an SMTP failure must never bubble up
  // and fail the caller (notification creation stays the source of truth,
  // per the comment in mailer.service.ts) — it's only logged.
  it('swallows an SMTP failure silently instead of throwing', async () => {
    sendMail.mockRejectedValue(new Error('Connection refused'));

    await expect(
      service.sendMail({
        to: 'user@example.com',
        subject: 'Sujet',
        html: '<p>Contenu</p>',
      }),
    ).resolves.toBeUndefined();
  });
});
