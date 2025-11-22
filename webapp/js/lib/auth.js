/**
 * Authentication Module
 * Gestione autenticazione utenti con Supabase Auth
 */

import { supabase, TABLES, toCamelCase } from './supabase.js';
import { authenticateWithCredential } from './webauthn.js';

// Current user state
let currentUser = null;
let authListeners = [];

/**
 * Initialize auth - check for saved session
 */
export async function initAuth() {
  try {
    // Check if there's an existing Supabase Auth session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      return null;
    }

    if (session?.user) {
      // Get user profile from users table
      const { data: userData, error: userError } = await supabase
        .from(TABLES.users)
        .select('*')
        .eq('auth_id', session.user.id)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        console.error('User not found in users table');
        await logout();
        return null;
      }

      currentUser = toCamelCase(userData);
      notifyAuthListeners();
      return currentUser;
    }

    return null;
  } catch (e) {
    console.error('Init auth error:', e);
    return null;
  }
}

/**
 * Login with email and password using Supabase Auth
 */
export async function login(email, password) {
  try {
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password
    });

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        throw new Error('Email o password non corrette');
      }
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('Errore durante il login');
    }

    // Get user profile from users table
    const { data: userData, error: userError } = await supabase
      .from(TABLES.users)
      .select('*')
      .eq('auth_id', authData.user.id)
      .eq('is_active', true)
      .single();

    if (userError || !userData) {
      // User exists in auth but not in users table or is inactive
      await supabase.auth.signOut();
      throw new Error('Account non trovato o disattivato');
    }

    currentUser = toCamelCase(userData);
    notifyAuthListeners();
    return currentUser;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Logout
 */
export async function logout() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error('Logout error:', e);
  }
  currentUser = null;
  localStorage.removeItem('softair_user'); // Clean up old storage
  notifyAuthListeners();
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return currentUser !== null;
}

/**
 * Check if current user is admin
 */
export function isAdmin() {
  return currentUser?.role === 'admin';
}

/**
 * Check if current user is superuser
 */
export function isSuperuser() {
  return currentUser?.role === 'superuser';
}

/**
 * Check if current user can manage events (admin or superuser)
 */
export function canManageEvents() {
  return currentUser?.role === 'admin' || currentUser?.role === 'superuser';
}

/**
 * Update current user data
 */
export async function refreshCurrentUser() {
  if (!currentUser) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      await logout();
      return null;
    }

    const { data, error } = await supabase
      .from(TABLES.users)
      .select('*')
      .eq('auth_id', session.user.id)
      .single();

    if (error || !data) {
      await logout();
      return null;
    }

    currentUser = toCamelCase(data);
    notifyAuthListeners();
    return currentUser;
  } catch (error) {
    console.error('Error refreshing user:', error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateProfile(updates) {
  if (!currentUser) throw new Error('Not authenticated');

  try {
    // If password is being updated, use Supabase Auth
    if (updates.password) {
      const { error: authError } = await supabase.auth.updateUser({
        password: updates.password
      });
      if (authError) throw authError;
      delete updates.password;
    }

    // Update profile in users table (if there are other updates)
    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from(TABLES.users)
        .update(updates)
        .eq('id', currentUser.id)
        .select()
        .single();

      if (error) throw error;

      currentUser = toCamelCase(data);
      notifyAuthListeners();
    }

    return currentUser;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

/**
 * Add auth state listener
 */
export function addAuthListener(callback) {
  authListeners.push(callback);
  return () => {
    authListeners = authListeners.filter(cb => cb !== callback);
  };
}

/**
 * Notify all auth listeners
 */
function notifyAuthListeners() {
  authListeners.forEach(callback => {
    try {
      callback(currentUser);
    } catch (error) {
      console.error('Error in auth listener:', error);
    }
  });
}

/**
 * Setup auth state change listener
 */
export function setupAuthListener() {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event);

    if (event === 'SIGNED_OUT') {
      currentUser = null;
      notifyAuthListeners();
    } else if (event === 'SIGNED_IN' && session?.user) {
      // Refresh user data
      const { data: userData } = await supabase
        .from(TABLES.users)
        .select('*')
        .eq('auth_id', session.user.id)
        .eq('is_active', true)
        .single();

      if (userData) {
        currentUser = toCamelCase(userData);
        notifyAuthListeners();
      }
    }
  });
}

/**
 * Get all users (admin only)
 * @param {boolean} includeInactive - Include inactive users (default: true for admin panel)
 */
export async function getAllUsers(includeInactive = true) {
  if (!isAdmin()) throw new Error('Unauthorized');

  try {
    let query = supabase
      .from(TABLES.users)
      .select('*')
      .order('is_active', { ascending: false })
      .order('last_name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return toCamelCase(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

/**
 * Create user (admin only) - Creates both auth user and profile
 */
export async function createUser(userData) {
  if (!isAdmin()) throw new Error('Unauthorized');

  try {
    // First create auth user via Supabase Auth Admin API
    // Note: This requires using supabase.auth.admin which needs service_role key
    // For now, we'll create the user with a temporary approach

    // Create user in auth (this will send confirmation email)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email.toLowerCase(),
      password: userData.password || generateTempPassword(),
      options: {
        data: {
          first_name: userData.first_name,
          last_name: userData.last_name
        }
      }
    });

    if (authError) throw authError;

    if (!authData.user) {
      throw new Error('Errore creazione utente');
    }

    // Create profile in users table
    const profileData = {
      auth_id: authData.user.id,
      email: userData.email.toLowerCase(),
      first_name: userData.first_name,
      last_name: userData.last_name,
      membership_number: userData.membership_number,
      membership_expiry_date: userData.membership_expiry_date || null,
      nickname: userData.nickname || null,
      phone_number: userData.phone_number || null,
      age: userData.age || null,
      date_of_birth: userData.date_of_birth || null,
      tax_code: userData.tax_code || null,
      residential_address: userData.residential_address || null,
      role: userData.role || 'user',
      is_active: userData.is_active !== false,
      has_medical_certificate: userData.has_medical_certificate || false,
      medical_certificate_expiry: userData.medical_certificate_expiry || null
    };

    const { data, error } = await supabase
      .from(TABLES.users)
      .insert([profileData])
      .select()
      .single();

    if (error) {
      // If profile creation fails, we should ideally delete the auth user
      console.error('Error creating user profile:', error);
      throw error;
    }

    return toCamelCase(data);
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Generate temporary password
 */
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Update user (admin only)
 */
export async function updateUser(userId, updates) {
  if (!isAdmin()) throw new Error('Unauthorized');

  try {
    // Remove password from updates - password changes go through Supabase Auth
    const { password, ...profileUpdates } = updates;

    const { data, error } = await supabase
      .from(TABLES.users)
      .update(profileUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(userId) {
  if (!isAdmin()) throw new Error('Unauthorized');

  try {
    // Note: This only deactivates the user in our table
    // The auth user will remain but won't be able to access anything
    const { error } = await supabase
      .from(TABLES.users)
      .update({ is_active: false })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/softair/'
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error sending password reset:', error);
    throw error;
  }
}

/**
 * Update password (for logged in user)
 */
export async function updatePassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
}

/**
 * Login with biometric authentication (Face ID, Touch ID)
 * Uses Supabase Edge Function to create authenticated session
 */
export async function loginWithBiometric() {
  try {
    // Authenticate with WebAuthn credential
    const { userId, credentialId } = await authenticateWithCredential();

    // Call Edge Function to create session
    // TODO: Replace with your actual Edge Function URL after deployment
    // Get it from: https://YOUR_PROJECT_ID.supabase.co/functions/v1/biometric-auth
    const EDGE_FUNCTION_URL = 'https://uyubwlukwemqcwropljl.supabase.co/functions/v1/biometric-auth';

    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dWJ3bHVrd2VtcWN3cm9wbGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NjA0NjEsImV4cCI6MjA3OTAzNjQ2MX0.CYbKw55zi6t-IaX92pThdpaPNcL3AIYjDakmpHwWKeg';

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        userId: userId,
        credentialId: credentialId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Edge Function error:', errorData);
      console.error('Response status:', response.status);
      console.error('Full error object:', JSON.stringify(errorData, null, 2));
      if (errorData.debug) {
        console.error('Debug info:', JSON.stringify(errorData.debug, null, 2));
      }
      throw new Error(errorData.error || 'Errore durante l\'autenticazione biometrica');
    }

    const { email, email_otp } = await response.json();

    // Use the OTP to authenticate
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email: email,
      token: email_otp,
      type: 'email'
    });

    if (authError) {
      console.error('OTP verification error:', authError);
      throw new Error('Errore durante la verifica OTP');
    }

    // Get user profile from users table using the auth_id
    const { data: userData, error: userError } = await supabase
      .from(TABLES.users)
      .select('*')
      .eq('auth_id', authData.user.id)
      .eq('is_active', true)
      .single();

    if (userError || !userData) {
      throw new Error('Account non trovato o disattivato');
    }

    currentUser = toCamelCase(userData);
    notifyAuthListeners();
    return currentUser;
  } catch (error) {
    console.error('Biometric login error:', error);
    throw error;
  }
}

/**
 * Alternative biometric login that uses a one-time token approach
 * This requires users to have logged in at least once with email/password
 */
export async function loginWithBiometricSimple() {
  try {
    // Authenticate with WebAuthn credential
    const { userId } = await authenticateWithCredential();

    // Get user data (including auth_id)
    const { data: userData, error: userError } = await supabase
      .from(TABLES.users)
      .select('*')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (userError || !userData) {
      throw new Error('Account non trovato o disattivato');
    }

    // Check if there's an existing session for this user
    // This works if the user has logged in before and the session is still valid
    const { data: { session } } = await supabase.auth.getSession();

    if (session && session.user.id === userData.auth_id) {
      // Session already exists for this user
      currentUser = toCamelCase(userData);
      notifyAuthListeners();
      return currentUser;
    }

    // No existing session - need to create one
    // For now, we'll throw an error suggesting the user logs in with password first
    throw new Error('Prima accesso richiesto con email/password. Poi potrai usare Face ID.');

  } catch (error) {
    console.error('Biometric login error:', error);
    throw error;
  }
}
