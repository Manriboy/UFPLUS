// src/lib/email.ts
import nodemailer from 'nodemailer'

const APP_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

function createTransport() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) throw new Error('GMAIL_USER o GMAIL_APP_PASSWORD no configurados')
  return nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
}

export async function sendPasswordResetEmail(to: string, token: string, name: string | null) {
  const link = `${APP_URL}/reset-password?token=${token}`
  const transport = createTransport()
  await transport.sendMail({
    from: `"UFPLUS" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Restablecer contraseña — UFPLUS',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1a1a1a;margin-bottom:8px">Restablecer contraseña</h2>
        <p style="color:#555;margin-bottom:24px">
          Hola${name ? ` ${name}` : ''}, un administrador solicitó el restablecimiento de tu contraseña en UFPLUS.
        </p>
        <a href="${link}"
           style="display:inline-block;background:#e53e3e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600">
          Crear nueva contraseña
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">
          Este enlace expira en 2 horas. Si no esperabas este correo, ignóralo.
        </p>
      </div>
    `,
  })
}
