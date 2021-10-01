import got from 'got';
import * as FormData from 'form-data';
import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { EmailVar, MailModuleOptions } from './mail.interface';

@Injectable()
export class MailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: MailModuleOptions,
  ) {}

  async sendEmail(
    subject: string,
    // to: string,
    template: string,
    emailVar: EmailVar[],
  ): Promise<boolean> {
    const form = new FormData();

    form.append('from', this.options.domain);
    form.append('to', `a`);
    form.append('subject', subject);
    form.append('template', template);

    emailVar.forEach(({ key, value }) => form.append(key, value));

    try {
      await got.post(
        `https://api.mailgun.net/v3/${this.options.domain}/messages`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(
              `api:${this.options.apiKey}`,
            ).toString('base64')}`,
          },
          method: 'POST',
          body: form,
        },
      );
      return true;
    } catch (error) {
      return false;
    }
  }
  sendVerificationEmail(email: string, code: string) {
    this.sendEmail('Verify your email', 'verify-email', [
      { key: 'code', value: code },
      { key: 'email', value: email },
    ]);
  }
}
