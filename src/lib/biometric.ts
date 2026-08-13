import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/audit';

const STORE_KEY = 'tm_biometric_v1';

interface StoredBiometric {
  credentialId: string;
  userId: string;
  email: string;
  displayName: string;
  access_token: string;
  refresh_token: string;
}

function b64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64(s: string): Uint8Array {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(pad + '='.repeat((4 - (pad.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function getStoredBiometric(): StoredBiometric | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as StoredBiometric) : null;
  } catch {
    return null;
  }
}

export function isBiometricEnrolled(): boolean {
  return !!getStoredBiometric();
}

export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Keeps the stored tokens fresh so biometric login always has a valid refresh token. */
export function syncBiometricTokens(session: { access_token: string; refresh_token: string; user?: any } | null) {
  const stored = getStoredBiometric();
  if (!stored || !session) return;
  if (session.user?.id && session.user.id !== stored.userId) return;
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({ ...stored, access_token: session.access_token, refresh_token: session.refresh_token }),
  );
}

export function clearBiometric() {
  localStorage.removeItem(STORE_KEY);
}

export async function enableBiometric(displayName: string): Promise<{ error?: string }> {
  if (!(await isBiometricSupported())) return { error: 'Kifaa hiki hakina alama ya kidole / Face ID.' };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { error: 'Lazima uwe umeingia kwanza.' };

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = new TextEncoder().encode(session.user.id);
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'TeleMed', id: window.location.hostname },
        user: { id: userId, name: session.user.email || session.user.id, displayName: displayName || 'TeleMed' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!cred) return { error: 'Usajili wa alama ya kidole umeghairiwa.' };

    const credentialId = b64(cred.rawId);
    const payload: StoredBiometric = {
      credentialId,
      userId: session.user.id,
      email: session.user.email || '',
      displayName: displayName || session.user.email || 'TeleMed',
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(payload));

    await (supabase.from('biometric_credentials' as any) as any).upsert(
      {
        user_id: session.user.id,
        credential_id: credentialId,
        device_label: navigator.userAgent.slice(0, 120),
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,credential_id' },
    );

    await logAudit('biometric_enrolled', { entityType: 'auth', description: 'Device biometric enrolled' });
    return {};
  } catch (e: any) {
    return { error: e?.message || 'Imeshindwa kusajili alama ya kidole.' };
  }
}

export async function disableBiometric(): Promise<void> {
  const stored = getStoredBiometric();
  if (stored) {
    try {
      await (supabase.from('biometric_credentials' as any) as any)
        .delete()
        .eq('credential_id', stored.credentialId);
    } catch {/* non-fatal */}
    await logAudit('biometric_removed', { entityType: 'auth' });
  }
  clearBiometric();
}

export async function biometricLogin(): Promise<{ error?: string }> {
  const stored = getStoredBiometric();
  if (!stored) return { error: 'Hakuna alama ya kidole iliyosajiliwa kwenye kifaa hiki.' };

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: 'public-key', id: fromB64(stored.credentialId) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    if (!assertion) return { error: 'Uthibitisho umeghairiwa.' };

    const { data, error } = await supabase.auth.setSession({
      access_token: stored.access_token,
      refresh_token: stored.refresh_token,
    });
    if (error || !data.session) {
      clearBiometric();
      return { error: 'Kipindi kimeisha. Tafadhali ingia kwa nenosiri kisha uwashe tena alama ya kidole.' };
    }
    syncBiometricTokens(data.session);
    await logAudit('login_biometric', { entityType: 'auth' });
    return {};
  } catch (e: any) {
    return { error: e?.message || 'Imeshindwa kuthibitisha alama ya kidole.' };
  }
}
