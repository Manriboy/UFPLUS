// src/app/admin/arriendos/conectar/page.tsx — Server Component
import ConectarContent from './ConectarContent'

function buildAuthUrl(clientId: string, redirectUri: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId,
    redirect_uri:  redirectUri,
  })
  return `https://auth.mercadolibre.cl/authorization?${params}`
}

export default function ConectarPage() {
  const clientId   = process.env.ML_CLIENT_ID ?? ''
  const appUrl     = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const redirectUri = `${appUrl}/api/admin/ml/callback`
  const authUrl    = buildAuthUrl(clientId, redirectUri)

  return <ConectarContent authUrl={authUrl} redirectUri={redirectUri} />
}
