import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const data   = await request.formData();
    const name    = (data.get('name')    as string | null)?.trim()    ?? '';
    const email   = (data.get('email')   as string | null)?.trim()    ?? '';
    const type    = (data.get('type')    as string | null)?.trim()    ?? 'General';
    const message = (data.get('message') as string | null)?.trim()    ?? '';

    if (!message || message.length < 5) {
      return fail(400, { error: 'Message is too short.' });
    }
    if (message.length > 5000) {
      return fail(400, { error: 'Message is too long (max 5000 characters).' });
    }

    const from    = name  ? `${name} via Turnadus <noreply@turnadus.com>` : 'Turnadus Feedback <noreply@turnadus.com>';
    const replyTo = email || undefined;

    const body = [
      `Type: ${type}`,
      email ? `From: ${name || 'Anonymous'} <${email}>` : `From: ${name || 'Anonymous'}`,
      '',
      message,
    ].join('\n');

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from,
          to:      [env.CONTACT_EMAIL],
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject: `[Turnadus Feedback] ${type}`,
          text:    body,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Resend error:', res.status, err);
        return fail(502, { error: 'Failed to send — please try again later.' });
      }

      return { success: true };
    } catch (e) {
      console.error('Feedback send failed:', e);
      return fail(502, { error: 'Failed to send — please try again later.' });
    }
  },
};
