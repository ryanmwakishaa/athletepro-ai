import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.FITBIT_CLIENT_ID
  const redirectUri = process.env.FITBIT_REDIRECT_URI
  
  const authUrl = `https://www.fitbit.com/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri!)}&` +
    `scope=activity heartrate sleep profile&` +
    `expires_in=604800`
  
  return NextResponse.redirect(authUrl)
}