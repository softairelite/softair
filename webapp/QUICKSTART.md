# Quick Start - Softair Event Web App

## Avvio Rapido

### 1. Avvia il server di sviluppo

Scegli uno dei seguenti metodi:

```bash
# Opzione A - Python (raccomandato)
cd /Users/mariofo/Python_projects/Softair/webapp
python3 -m http.server 8000

# Opzione B - Node.js
npx http-server -p 8000

# Opzione C - PHP
php -S localhost:8000
```

### 2. Apri il browser

Vai a: **http://localhost:8000**

### 3. Login

Usa le credenziali di un utente esistente nel database Supabase.

Per trovare utenti di test, esegui questa query su Supabase:

```sql
SELECT email, password, is_admin, first_name, last_name
FROM users
WHERE is_active = true
LIMIT 5;
```

## Test della PWA

### Desktop
1. Apri Chrome o Edge
2. Clicca sull'icona "Installa" nella barra degli indirizzi
3. L'app verrà installata come applicazione standalone

### Mobile
1. Apri Safari (iOS) o Chrome (Android)
2. Usa la funzione "Aggiungi a Home"
3. L'app apparirà come icona sulla home screen

## Verifica Funzionamento

### ✅ Checklist
- [ ] Login funzionante
- [ ] Lista eventi visualizzata
- [ ] Clic su evento apre dettaglio
- [ ] Mappa evento cliccabile
- [ ] Registrazione presenza funzionante
- [ ] Documenti visualizzati
- [ ] Profilo utente completo
- [ ] Pannello admin visibile (solo admin)
- [ ] Service Worker registrato (console)
- [ ] App installabile (icona browser)

## Troubleshooting Rapido

### Errore: "Failed to fetch"
→ Verifica che Supabase sia raggiungibile e le credenziali siano corrette

### Service Worker non registrato
→ Usa HTTPS o localhost (non IP locale)

### Login fallisce
→ Verifica che l'utente esista nel database e `is_active = true`

### Icone PWA mancanti
→ Normale per ora, non influisce sul funzionamento

## Prossimi Passi

1. **Popola il database** con i dati di test:
   ```bash
   # Esegui lo script SQL
   psql < ../scripts/populate_test_data.sql
   ```

2. **Genera icone PWA** per una migliore esperienza:
   ```bash
   npx pwa-asset-generator logo.png assets/icons --icon-only
   ```

3. **Test su dispositivi reali** per verificare PWA e responsive

## Supporto

Per problemi o domande, consulta il [README.md](README.md) completo.
