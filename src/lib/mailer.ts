import sgMail from '@sendgrid/mail'

const apiKey = process.env.SENDGRID_API_KEY || ''
if (apiKey) {
  sgMail.setApiKey(apiKey)
}

export interface SendEmailOptions {
  to: string[]
  subject: string
  html: string
}

export function getMailerStatus() {
  return {
    hasApiKey: Boolean(apiKey),
    fromEmail: process.env.MAIL_FROM_EMAIL || 'no-reply@taskpantry.com',
    fromName: process.env.MAIL_FROM_NAME || 'Kathario SaaS',
  }
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  if (!apiKey) return false
  const fromEmail = process.env.MAIL_FROM_EMAIL || 'no-reply@taskpantry.com'
  const fromName = process.env.MAIL_FROM_NAME || 'Kathario SaaS'
  const replyTo = process.env.MAIL_REPLY_TO || undefined
  const msg = {
    to,
    from: { email: fromEmail, name: fromName },
    subject,
    html,
    replyTo,
  } as any
  try {
    await sgMail.sendMultiple(msg)
    return true
  } catch (e) {
    // fail-silent in production path; logging optional
    // eslint-disable-next-line no-console
    console.warn('sendEmail failed:', (e as any)?.message || e)
    return false
  }
}

export async function sendEmailDetailed({ to, subject, html }: SendEmailOptions): Promise<{ sent: boolean; error?: string }> {
  if (!apiKey) return { sent: false, error: 'MISSING_API_KEY' }
  const fromEmail = process.env.MAIL_FROM_EMAIL || 'no-reply@taskpantry.com'
  const fromName = process.env.MAIL_FROM_NAME || 'Kathario SaaS'
  const replyTo = process.env.MAIL_REPLY_TO || undefined
  const msg = {
    to,
    from: { email: fromEmail, name: fromName },
    subject,
    html,
    replyTo,
  } as any
  try {
    await sgMail.sendMultiple(msg)
    return { sent: true }
  } catch (e: any) {
    const message = e?.response?.body?.errors?.[0]?.message
      || e?.response?.body?.message
      || e?.code
      || e?.message
      || JSON.stringify(e?.response?.body || e)
      || 'UNKNOWN_ERROR'
    // eslint-disable-next-line no-console
    console.warn('sendEmailDetailed failed:', message)
    return { sent: false, error: message }
  }
}


