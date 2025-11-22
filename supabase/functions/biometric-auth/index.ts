/**
 * Supabase Edge Function: Biometric Authentication
 * Creates authenticated sessions for users who successfully authenticate with WebAuthn
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create Supabase client with service role (admin privileges)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Parse request body
    const { userId, credentialId } = await req.json()

    // Validate input
    if (!userId || !credentialId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: userId and credentialId'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the credential exists and is active
    const { data: credential, error: credError } = await supabaseAdmin
      .from('webauthn_credentials')
      .select('user_id, is_active')
      .eq('credential_id', credentialId)
      .eq('is_active', true)
      .single()

    if (credError || !credential) {
      console.error('Credential verification failed:', credError)
      return new Response(
        JSON.stringify({
          error: 'Invalid or inactive credential'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the credential belongs to the claimed user
    if (credential.user_id !== userId) {
      console.error('User ID mismatch')
      return new Response(
        JSON.stringify({
          error: 'Credential does not belong to this user'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get user data from users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('auth_id, email, is_active')
      .eq('id', userId)
      .eq('is_active', true)
      .single()

    if (userError || !userData) {
      console.error('User not found or inactive:', userError)
      return new Response(
        JSON.stringify({
          error: 'User not found or inactive'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate auth token for the user using admin API
    // This creates a new session without requiring password
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.email
    })

    if (tokenError || !tokenData) {
      console.error('Failed to generate token:', tokenError)
      console.error('Token data:', JSON.stringify(tokenData))
      return new Response(
        JSON.stringify({
          error: 'Failed to create session',
          details: tokenError?.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log the token data structure to help debug
    console.log('Token data structure:', JSON.stringify(tokenData))

    // Extract the access token and refresh token
    // Try multiple possible locations where tokens might be
    const accessToken = tokenData.properties?.access_token ||
                       tokenData.access_token ||
                       tokenData.session?.access_token
    const refreshToken = tokenData.properties?.refresh_token ||
                        tokenData.refresh_token ||
                        tokenData.session?.refresh_token

    if (!accessToken || !refreshToken) {
      console.error('Tokens not found in response')
      console.error('Available data:', JSON.stringify(tokenData))
      return new Response(
        JSON.stringify({
          error: 'Failed to extract tokens',
          debug: {
            hasProperties: !!tokenData.properties,
            hasAccessToken: !!tokenData.access_token,
            hasSession: !!tokenData.session
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update credential last used timestamp
    await supabaseAdmin
      .from('webauthn_credentials')
      .update({ last_used_at: new Date().toISOString() })
      .eq('credential_id', credentialId)

    // Return session data
    return new Response(
      JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: userData.auth_id,
          email: userData.email
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
