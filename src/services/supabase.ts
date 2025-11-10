import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not found in environment variables')
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '')

export async function signInWithEmail(email: string) {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true,
      },
    })

    if (error) throw error
    return {
      success: true,
      message: 'Check your email for the one-time code. If you don\'t see it, check your spam folder.'
    }
  } catch (error) {
    console.error('Sign in error:', error)
    throw error
  }
}

export async function verifyOtp(email: string, token: string) {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('OTP verification error:', error)
    throw error
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

export async function getCurrentUser() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session?.user || null
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

export function onAuthStateChange(callback: (user: any | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    callback(session?.user || null)
  })

  return subscription
}

export async function saveSearchMetrics(metrics: {
  user_input: string
  domain: string
  selected_element: string
  output: string
}) {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const userId = session?.user?.id
    if (!userId) {
      console.warn('No user ID available for saving metrics')
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('results')
      .insert([
        {
          user_id: userId,
          user_input: metrics.user_input,
          domain: metrics.domain,
          selected_element: metrics.selected_element,
          output: metrics.output,
        }
      ])
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Save metrics error:', error)
    throw error
  }
}

export async function getCredits() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const userId = session?.user?.id
    if (!userId) {
      console.warn('No user ID available for fetching credits')
      return null
    }

    const { data, error } = await supabase
      .from('credits')
      .select('credits_used, credits_remaining')
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Get credits error:', error)
    return null
  }
}

export async function decrementCredits() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const userId = session?.user?.id
    if (!userId) {
      console.warn('No user ID available for updating credits')
      return null
    }

    // Get current credits_used
    const { data: currentCredits, error: getError } = await supabase
      .from('credits')
      .select('credits_used, credits_remaining')
      .eq('user_id', userId)
      .single()

    if (getError) throw getError

    const newUsed = (currentCredits.credits_used || 0) + 1

    // Update only credits_used
    const { data, error } = await supabase
      .from('credits')
      .update({
        credits_used: newUsed
      })
      .eq('user_id', userId)
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Decrement credits error:', error)
    return null
  }
}
