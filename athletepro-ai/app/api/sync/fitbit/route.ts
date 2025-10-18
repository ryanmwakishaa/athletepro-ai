import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const { userId } = await request.json()
  
  // Get Fitbit access token
  const { data: device } = await supabase
    .from('connected_devices')
    .select('*')
    .eq('user_id', userId)
    .eq('device_type', 'fitbit')
    .single()
  
  if (!device) {
    return NextResponse.json({ error: 'Device not connected' }, { status: 400 })
  }
  
  // Fetch activities from Fitbit
  const activitiesResponse = await fetch(
    'https://api.fitbit.com/1/user/-/activities/list.json?afterDate=2025-09-01&sort=desc&limit=20&offset=0',
    {
      headers: {
        'Authorization': `Bearer ${device.access_token}`
      }
    }
  )
  
  const activities = await activitiesResponse.json()
  
  // Transform and save to database
  for (const activity of activities.activities || []) {
    const workout = {
      user_id: userId,
      workout_date: activity.startTime.split('T')[0],
      workout_type: activity.activityName.includes('Run') ? 'cardio' : 'strength',
      sub_type: activity.activityName.toLowerCase(),
      duration_minutes: Math.round(activity.duration / 60000),
      distance_km: activity.distance,
      avg_heart_rate: activity.averageHeartRate,
      max_heart_rate: activity.heartRateZones?.[activity.heartRateZones.length - 1]?.max,
      calories: activity.calories,
      training_load: calculateTrainingLoad(activity),
      source: 'fitbit',
      raw_data: activity
    }
    
    await supabase.from('workouts').upsert(workout)
  }
  
  // Update last sync
  await supabase
    .from('connected_devices')
    .update({ last_sync: new Date().toISOString() })
    .eq('id', device.id)
  
  return NextResponse.json({ success: true, synced: activities.activities?.length || 0 })
}

function calculateTrainingLoad(activity: any): number {
  // Simple training load calculation
  const duration = activity.duration / 60000 // minutes
  const avgHR = activity.averageHeartRate || 120
  const intensity = avgHR / 180 // normalized
  return Math.round(duration * intensity)
}