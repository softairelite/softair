/**
 * Authentication Module
 * Gestione autenticazione utenti con Supabase Auth
 */

import { supabase, TABLES, toCamelCase } from './supabase.js';

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
      phone_number: userData.phone_number || null,
      tax_code: userData.tax_code || null,
      role: userData.role || 'user',
      is_active: true,
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
