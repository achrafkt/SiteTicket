import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT'),
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASSWORD'),
      },
    });
    this.from =
      config.get<string>('SMTP_FROM') ??
      'SiteTicket <no-reply@site-ticket.local>';
  }

  async sendMail({ to, subject, html }: SendMailInput): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (err) {
      // Un incident SMTP ne doit jamais faire échouer la création de la
      // notification in-app, qui reste la source de vérité.
      this.logger.warn(
        `Échec d'envoi d'email à ${to} : ${(err as Error).message}`,
      );
    }
  }
}
