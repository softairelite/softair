/**
 * WebAuthn Module
 * Gestione autenticazione biometrica (Face ID, Touch ID, fingerprint)
 */

import { supabase, TABLES } from './supabase.js';

/**
 * Check if WebAuthn is supported by the browser
 */
export function isWebAuthnSupported() {
  return window.PublicKeyCredential !== undefined &&
         navigator.credentials !== undefined;
}

/**
 * Check if platform authenticator (Face ID, Touch ID) is available
 */
export async function isPlatformAuthenticatorAvailable() {
  if (!isWebAuthnSupported()) return false;

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.error('Error checking platform authenticator:', error);
    return false;
  }
}

/**
 * Convert ArrayBuffer to Base64
 */
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 to ArrayBuffer
 */
function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate random challenge
 */
function generateChallenge() {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

/**
 * Register a new WebAuthn credential (Face ID/Touch ID)
 * @param {Object} user - Current user object
 * @returns {Promise<Object>} - Credential info
 */
export async function registerCredential(user) {
  if (!user) throw new Error('User not authenticated');

  // Check if supported
  const isAvailable = await isPlatformAuthenticatorAvailable();
  if (!isAvailable) {
    throw new Error('Autenticazione biometrica non disponibile su questo dispositivo');
  }

  try {
    // Generate challenge
    const challenge = generateChallenge();

    // Create credential options
    const publicKeyCredentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: 'Elite Army Contractors',
        id: window.location.hostname
      },
      user: {
        id: Uint8Array.from(user.id.toString(), c => c.charCodeAt(0)),
        name: user.email,
        displayName: `${user.firstName} ${user.lastName}`
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Face ID, Touch ID
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'required'
      },
      timeout: 60000,
      attestation: 'none'
    };

    // Create credential
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    });

    if (!credential) {
      throw new Error('Impossibile creare credenziale');
    }

    // Prepare credential data for storage
    const credentialData = {
      user_id: user.id,
      credential_id: bufferToBase64(credential.rawId),
      public_key: bufferToBase64(credential.response.getPublicKey()),
      counter: credential.response.getAuthenticatorData ?
        new DataView(credential.response.getAuthenticatorData()).getUint32(33, false) : 0,
      transports: credential.response.getTransports ?
        credential.response.getTransports().join(',') : '',
      device_name: getDeviceName(),
      is_active: true
    };

    // Save credential to database
    const { data, error } = await supabase
      .from('webauthn_credentials')
      .insert([credentialData])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error registering credential:', error);

    // User-friendly error messages
    if (error.name === 'NotAllowedError') {
      throw new Error('Registrazione annullata o non autorizzata');
    } else if (error.name === 'InvalidStateError') {
      throw new Error('Credenziale già registrata');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('Funzionalità non supportata su questo dispositivo');
    }

    throw error;
  }
}

/**
 * Authenticate using WebAuthn credential
 * @returns {Promise<Object>} - User credentials
 */
export async function authenticateWithCredential() {
  // Check if supported
  const isAvailable = await isPlatformAuthenticatorAvailable();
  if (!isAvailable) {
    throw new Error('Autenticazione biometrica non disponibile su questo dispositivo');
  }

  try {
    // Generate challenge
    const challenge = generateChallenge();

    // Get authentication options
    const publicKeyCredentialRequestOptions = {
      challenge: challenge,
      rpId: window.location.hostname,
      timeout: 60000,
      userVerification: 'required'
    };

    // Request credential
    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    });

    if (!credential) {
      throw new Error('Autenticazione annullata');
    }

    // Convert credential ID to base64
    const credentialId = bufferToBase64(credential.rawId);

    // Verify credential in database
    const { data: credentialData, error: credError } = await supabase
      .from('webauthn_credentials')
      .select('user_id, counter')
      .eq('credential_id', credentialId)
      .eq('is_active', true)
      .single();

    if (credError || !credentialData) {
      throw new Error('Credenziale non valida o non trovata');
    }

    // Update counter (prevent replay attacks)
    const authenticatorData = new Uint8Array(credential.response.authenticatorData);
    const newCounter = new DataView(authenticatorData.buffer).getUint32(33, false);

    await supabase
      .from('webauthn_credentials')
      .update({
        counter: newCounter,
        last_used_at: new Date().toISOString()
      })
      .eq('credential_id', credentialId);

    // Return user ID for authentication
    return {
      userId: credentialData.user_id,
      credentialId: credentialId
    };
  } catch (error) {
    console.error('Error authenticating with credential:', error);

    // User-friendly error messages
    if (error.name === 'NotAllowedError') {
      throw new Error('Autenticazione annullata o non autorizzata');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('Funzionalità non supportata su questo dispositivo');
    }

    throw error;
  }
}

/**
 * Get user's registered credentials
 * @param {number} userId - User ID
 * @returns {Promise<Array>} - List of credentials
 */
export async function getUserCredentials(userId) {
  try {
    const { data, error } = await supabase
      .from('webauthn_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching credentials:', error);
    throw error;
  }
}

/**
 * Check if user has registered credentials
 * @param {number} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function hasRegisteredCredentials(userId) {
  try {
    const credentials = await getUserCredentials(userId);
    return credentials.length > 0;
  } catch (error) {
    console.error('Error checking credentials:', error);
    return false;
  }
}

/**
 * Delete a credential
 * @param {string} credentialId - Credential ID
 * @returns {Promise<boolean>}
 */
export async function deleteCredential(credentialId) {
  try {
    const { error } = await supabase
      .from('webauthn_credentials')
      .update({ is_active: false })
      .eq('credential_id', credentialId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting credential:', error);
    throw error;
  }
}

/**
 * Get device name
 */
function getDeviceName() {
  const ua = navigator.userAgent;

  // iOS devices
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/iPod/.test(ua)) return 'iPod';

  // macOS
  if (/Macintosh/.test(ua)) return 'Mac';

  // Android
  if (/Android/.test(ua)) {
    const match = ua.match(/Android[^;]*;[^;]*([^)]+)\)/);
    return match ? match[1].trim() : 'Android';
  }

  // Windows
  if (/Windows/.test(ua)) return 'Windows';

  // Linux
  if (/Linux/.test(ua)) return 'Linux';

  return 'Unknown Device';
}

/**
 * Get biometric type name for display
 */
export function getBiometricName() {
  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/.test(ua)) {
    // Check if device likely has Face ID (iPhone X and later)
    const isLikelyFaceID = /iPhone1[0-9],[0-9]|iPhone[2-9][0-9],[0-9]/.test(ua);
    return isLikelyFaceID ? 'Face ID' : 'Touch ID';
  }

  if (/Macintosh/.test(ua)) {
    return 'Touch ID';
  }

  if (/Android/.test(ua)) {
    return 'Impronta digitale';
  }

  return 'Biometria';
}
