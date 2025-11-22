# Setup Face ID / Touch ID per Webapp Softair

Questa guida spiega come completare l'implementazione dell'autenticazione biometrica (Face ID, Touch ID, impronta digitale) per la webapp Softair.

## 🎯 Cosa è stato implementato

✅ Modulo WebAuthn completo ([webapp/js/lib/webauthn.js](webapp/js/lib/webauthn.js))
✅ Integrazione con sistema di autenticazione ([webapp/js/lib/auth.js](webapp/js/lib/auth.js))
✅ UI aggiornata con pulsante biometrico ([webapp/js/screens/login.js](webapp/js/screens/login.js))
✅ Stili CSS per il pulsante ([webapp/css/screens.css](webapp/css/screens.css))
✅ Script SQL per tabella database ([webapp/sql/create_webauthn_credentials.sql](webapp/sql/create_webauthn_credentials.sql))

## 📋 Passaggi per completare l'implementazione

### 1. Creare la tabella nel database

Vai su **Supabase Dashboard** → **SQL Editor** e esegui lo script:

```bash
# Apri il file e copia il contenuto
cat webapp/sql/create_webauthn_credentials.sql
```

Oppure esegui direttamente dalla dashboard:

1. Apri [Supabase Dashboard](https://app.supabase.com/)
2. Seleziona il progetto **Softair**
3. Vai su **SQL Editor**
4. Clicca su **New query**
5. Copia e incolla il contenuto di `webapp/sql/create_webauthn_credentials.sql`
6. Clicca su **Run**

### 2. Configurare HTTPS (OBBLIGATORIO)

⚠️ **IMPORTANTE**: WebAuthn funziona SOLO su connessioni HTTPS (o localhost).

#### Per sviluppo locale:
- Usa `localhost` (già sicuro)
- Oppure usa un tunnel HTTPS come:
  - **ngrok**: `ngrok http 8000`
  - **Cloudflare Tunnel**: `cloudflared tunnel --url http://localhost:8000`

#### Per produzione:
- Assicurati che il sito sia servito su HTTPS
- Usa certificati SSL validi (Let's Encrypt, Cloudflare, etc.)

### 3. Testare l'implementazione

#### Test su Safari (iPhone/iPad/Mac):

1. Apri la webapp su Safari
2. Vai alla pagina di login
3. Dovresti vedere il pulsante **"Accedi con Face ID"** o **"Accedi con Touch ID"**
4. Fai login con email/password la prima volta
5. Ti verrà chiesto se vuoi abilitare Face ID/Touch ID
6. Accetta e segui le istruzioni del sistema
7. Fai logout
8. Clicca sul pulsante Face ID/Touch ID
9. Autentica con il viso o l'impronta
10. Dovresti essere loggato automaticamente

#### Browser compatibili:
- ✅ Safari (iOS 14+, macOS Big Sur+)
- ✅ Chrome (Android, Windows con Windows Hello)
- ✅ Edge (Windows con Windows Hello)
- ❌ Firefox (supporto limitato)

## 🔧 Come funziona

### Flusso di registrazione:
1. Utente fa login con email/password
2. Sistema rileva che il dispositivo supporta WebAuthn
3. Sistema chiede all'utente se vuole abilitare Face ID/Touch ID
4. L'utente accetta e viene chiesto di autenticarsi biometricamente
5. Le credenziali vengono salvate nel database Supabase

### Flusso di autenticazione:
1. Utente clicca su "Accedi con Face ID"
2. Sistema chiede l'autenticazione biometrica
3. Sistema verifica le credenziali nel database
4. Se valide, l'utente viene loggato automaticamente

## ⚠️ Limitazioni attuali

### Limitazione principale: Creazione sessione Supabase

L'implementazione attuale ha una limitazione: **non può creare sessioni Supabase Auth con l'anon key**.

#### Soluzione 1: Usa sessioni esistenti (IMPLEMENTATA)
- L'utente deve fare login almeno una volta con email/password
- La sessione Supabase rimane attiva (default: 7 giorni)
- Face ID/Touch ID riautentica senza richiedere la password
- Funziona finché la sessione Supabase è valida

#### Soluzione 2: Implementa Supabase Edge Function (CONSIGLIATA per produzione)

Crea una Edge Function con service_role key:

```javascript
// supabase/functions/biometric-auth/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  // Crea client admin con service_role key
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Service Role Key!
  )

  const { userId } = await req.json()

  // Verifica le credenziali WebAuthn (già fatto nel client)

  // Crea sessione per l'utente
  const { data, error } = await supabaseAdmin.auth.admin.createSession({
    user_id: userId
  })

  if (error) throw error

  return new Response(
    JSON.stringify({ session: data }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

Poi aggiorna `auth.js`:

```javascript
export async function loginWithBiometric() {
  // Autentica con WebAuthn
  const { userId } = await authenticateWithCredential();

  // Chiama Edge Function per creare sessione
  const response = await fetch(
    'https://your-project.supabase.co/functions/v1/biometric-auth',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    }
  );

  const { session } = await response.json();

  // Imposta la sessione
  await supabase.auth.setSession(session);

  // Recupera dati utente
  // ...
}
```

## 🔐 Sicurezza

### Cosa è sicuro:
- ✅ Le credenziali biometriche NON lasciano mai il dispositivo
- ✅ Solo una chiave pubblica è salvata nel database
- ✅ Impossibile clonare o rubare le credenziali
- ✅ Ogni dispositivo ha credenziali uniche
- ✅ Counter anti-replay integrato

### Best practices:
- 🔒 Usa sempre HTTPS in produzione
- 🔒 Implementa rate limiting sui tentativi di autenticazione
- 🔒 Permetti agli utenti di rimuovere dispositivi dal profilo
- 🔒 Invia notifiche quando viene registrato un nuovo dispositivo

## 📱 Dispositivi supportati

### iOS/iPadOS:
- Face ID: iPhone X e successivi, iPad Pro (2018+)
- Touch ID: iPhone 5s-8/SE, iPad Air 2+, iPad mini 3+

### macOS:
- Touch ID: MacBook Pro (2016+), MacBook Air (2018+), iMac (2021+)

### Android:
- Impronta digitale: Maggior parte dei dispositivi moderni
- Riconoscimento facciale: Alcuni dispositivi (es. Pixel 4)

### Windows:
- Windows Hello: Dispositivi compatibili con fotocamera IR o lettore impronte

## 🧪 Debug

### Il pulsante Face ID non appare:
1. Controlla la console del browser per errori
2. Verifica che il sito sia su HTTPS o localhost
3. Controlla che il dispositivo supporti WebAuthn:
   ```javascript
   console.log('WebAuthn supported:', window.PublicKeyCredential !== undefined);
   ```

### Errore durante la registrazione:
1. Controlla che la tabella `webauthn_credentials` esista
2. Verifica i permessi RLS su Supabase
3. Controlla la console del browser per dettagli

### Errore durante l'autenticazione:
1. Verifica che le credenziali siano salvate nel database
2. Controlla che `is_active = true`
3. Assicurati che la sessione Supabase sia valida

## 📚 Risorse

- [WebAuthn Guide](https://webauthn.guide/)
- [MDN Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Can I Use WebAuthn](https://caniuse.com/webauthn)

## 🤝 Supporto

Per problemi o domande:
1. Controlla i log nella console del browser
2. Verifica lo stato del database su Supabase Dashboard
3. Consulta la documentazione WebAuthn

---

**Nota**: L'implementazione attuale è completamente funzionale per l'uso con sessioni esistenti. Per un'esperienza ottimale in produzione, si consiglia di implementare la Supabase Edge Function per la creazione di sessioni.
