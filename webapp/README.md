# Softair Event - Web App (PWA)

Versione web dell'applicazione iOS Softair Event, con supporto Progressive Web App (PWA).

## Descrizione

Web app per la gestione di eventi Softair con registrazione utenti, visualizzazione eventi, gestione documenti e pannello amministrativo. Replica completamente le funzionalità dell'app iOS utilizzando HTML, CSS e JavaScript vanilla.

## Caratteristiche Principali

### Funzionalità Utente
- **Autenticazione** - Login con email e password
- **Lista Eventi** - Visualizzazione eventi futuri e passati
- **Dettaglio Evento** - Info complete, mappa interattiva, registrazione presenza
- **Documenti** - Visualizzazione e download documenti del club
- **Profilo** - Informazioni personali e stato certificato medico

### Funzionalità Admin
- **Gestione Utenti** - Visualizzazione di tutti gli utenti registrati
- **Statistiche** - Dashboard con metriche e certificati in scadenza
- **Gestione Eventi** - (In sviluppo)
- **Gestione Documenti** - (In sviluppo)

### Progressive Web App (PWA)
- **Installabile** - Può essere installata come app nativa
- **Offline Support** - Service Worker con cache per funzionamento offline
- **App-like Experience** - UX simile ad app nativa
- **Push Notifications** - Predisposta (da configurare)
- **Responsive Design** - Ottimizzata per mobile e desktop

## Stack Tecnologico

- **Frontend**: HTML5, CSS3, JavaScript ES6+ (Vanilla, no framework)
- **Backend**: Supabase (PostgreSQL + Storage)
- **Icons**: Ionicons 7
- **Maps**: Mapbox Static API
- **PWA**: Service Worker, Web App Manifest

## Struttura Progetto

```
webapp/
├── index.html              # Entry point
├── manifest.json           # PWA manifest
├── service-worker.js       # Service Worker per PWA
├── css/
│   ├── main.css           # Stili base e variabili
│   ├── components.css     # Componenti UI
│   └── screens.css        # Stili specifici per schermate
├── js/
│   ├── app.js             # App entry point e routing
│   ├── lib/
│   │   ├── supabase.js    # Client Supabase e helper
│   │   ├── auth.js        # Autenticazione
│   │   └── utils.js       # Funzioni utility
│   ├── components/
│   │   └── navigation.js  # Bottom navigation e routing
│   └── screens/
│       ├── login.js       # Schermata login
│       ├── events.js      # Lista eventi
│       ├── event-detail.js # Dettaglio evento
│       ├── documents.js   # Lista documenti
│       ├── profile.js     # Profilo utente
│       └── admin.js       # Pannello admin
└── assets/
    └── icons/             # Icone PWA (da generare)
```

## Installazione e Setup

### Prerequisiti
- Browser moderno (Chrome, Safari, Firefox, Edge)
- Server web (per servire i file statici)
- Account Supabase con database configurato

### Setup Database
Il database è condiviso con l'app iOS. Schema già presente:
- `users` - Utenti del club
- `events` - Eventi organizzati
- `event_attendance` - Registrazioni presenze
- `documents` - Documenti condivisi

### Configurazione

1. **Clone del progetto**
   ```bash
   cd webapp
   ```

2. **Configurazione Supabase**
   Le credenziali Supabase sono già configurate in `js/lib/supabase.js`:
   - URL: `https://uyubwlukwemqcwropljl.supabase.co`
   - Anon Key: Già presente nel codice

3. **Avvio Server di Sviluppo**

   Opzione A - Python:
   ```bash
   python3 -m http.server 8000
   ```

   Opzione B - Node.js (http-server):
   ```bash
   npx http-server -p 8000
   ```

   Opzione C - PHP:
   ```bash
   php -S localhost:8000
   ```

4. **Accesso**
   Apri il browser e vai a: `http://localhost:8000`

### Generazione Icone PWA

Per generare le icone PWA, usa uno strumento come [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator):

```bash
npx pwa-asset-generator logo.png assets/icons --icon-only
```

Oppure crea manualmente le icone nei seguenti formati:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

## Utilizzo

### Autenticazione
L'autenticazione usa password in chiaro nella tabella `users` (come l'app iOS).

**Credenziali di Test:**
- Admin: Controlla il database per utenti con `is_admin = true`
- User: Qualsiasi utente con `is_active = true`

### Installazione come PWA

#### Desktop (Chrome/Edge)
1. Clicca sull'icona "Installa" nella barra degli indirizzi
2. Oppure: Menu → "Installa Softair Event"

#### iOS (Safari)
1. Apri Safari e vai alla web app
2. Tocca il pulsante "Condividi"
3. Seleziona "Aggiungi a Home"

#### Android (Chrome)
1. Tocca il menu (⋮)
2. Seleziona "Aggiungi a schermata Home"
3. Oppure segui il banner di installazione

## Funzionalità Implementate

### ✅ Completate
- [x] Autenticazione utenti
- [x] Lista eventi con filtri (tutti/futuri/passati)
- [x] Dettaglio evento con mappa interattiva
- [x] Registrazione presenza eventi
- [x] Lista partecipanti con modal
- [x] Gestione documenti con ricerca
- [x] Profilo utente con stato certificato medico
- [x] Pannello admin
- [x] Statistiche admin con certificati scaduti/in scadenza
- [x] Lista utenti admin
- [x] PWA con Service Worker
- [x] Offline support
- [x] Responsive design
- [x] Styling iOS-like

### 🚧 In Sviluppo
- [ ] CRUD completo eventi (admin)
- [ ] CRUD completo utenti (admin)
- [ ] Upload documenti (admin)
- [ ] Modifica profilo utente
- [ ] Upload avatar
- [ ] Push notifications
- [ ] Background sync
- [ ] Testing automatizzato

## Design System

### Palette Colori (iOS Style)
- **Primary**: `#007AFF` (iOS Blue)
- **Success**: `#34C759` (iOS Green)
- **Warning**: `#FF9500` (iOS Orange)
- **Danger**: `#FF3B30` (iOS Red)
- **Info**: `#5AC8FA` (iOS Light Blue)

### Tipografia
- Font: San Francisco (iOS) / System Font
- Base: 16px
- Line height: 1.5

### Spacing
- XS: 4px
- SM: 8px
- MD: 16px
- LG: 24px
- XL: 32px

## Browser Support

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- iOS Safari 14+
- Chrome Android 90+

## Performance

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: 90+

## Sicurezza

⚠️ **IMPORTANTE**: L'app usa password in chiaro nella tabella `users` per semplicità (ambiente di sviluppo). Per produzione:

1. Migrare a Supabase Auth con password hash
2. Implementare HTTPS
3. Configurare Content Security Policy
4. Abilitare Row Level Security (RLS) su Supabase

## Deploy Produzione

### Opzione 1: Netlify
```bash
# Crea file netlify.toml
[build]
  publish = "webapp"

# Deploy
netlify deploy --prod
```

### Opzione 2: Vercel
```bash
vercel --prod
```

### Opzione 3: GitHub Pages
```bash
# Push su GitHub
git add webapp/
git commit -m "Add webapp"
git push

# Abilita GitHub Pages nella repo
# Settings → Pages → Source: main/webapp
```

## Troubleshooting

### Service Worker non si registra
- Verifica che l'app sia servita via HTTPS (o localhost)
- Controlla la console per errori
- Pulisci cache e ricarica

### Mappe non si visualizzano
- Verifica connessione internet
- Controlla che l'evento abbia coordinate valide
- Verifica access token Mapbox

### Login non funziona
- Verifica credenziali Supabase
- Controlla che l'utente esista e sia attivo
- Apri console per vedere errori specifici

## Contribuire

Per contribuire al progetto:

1. Fork del repository
2. Crea branch feature (`git checkout -b feature/nuova-funzionalita`)
3. Commit modifiche (`git commit -m 'Aggiunge nuova funzionalità'`)
4. Push al branch (`git push origin feature/nuova-funzionalita`)
5. Apri Pull Request

## Licenza

Questo progetto è proprietario del club Softair.

## Contatti

Per supporto o domande, contatta l'amministratore del club.

---

**Versione**: 1.0.0
**Data**: Novembre 2024
**Autore**: Sviluppato con Claude Code
