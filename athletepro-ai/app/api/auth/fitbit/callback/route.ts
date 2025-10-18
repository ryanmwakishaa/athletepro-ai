import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  
  if (!code) {
    return NextResponse.redirect('/?error=auth_failed')
  }
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(
        `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
      ).toString('base64')}`
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.FITBIT_REDIRECT_URI!
    })
  })
  
  const tokens = await tokenResponse.json()
  
  // Save to database
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    await supabase.from('connected_devices').insert({
      user_id: user.id,
      device_type: 'fitbit',
      device_name: 'Fitbit Device',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      is_connected: true,
      last_sync: new Date().toISOString()
    })
  }
  
  return NextResponse.redirect('/?connected=fitbit')
}