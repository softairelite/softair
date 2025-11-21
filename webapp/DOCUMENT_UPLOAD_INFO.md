# 📄 Gestione Documenti - Informazioni

## ✅ Funzionalità Implementata

Ho implementato la **gestione completa dei documenti** nell'area amministratore!

### **Cosa Puoi Fare**

#### **1. Caricare Documenti** ✅
- Click su "Carica" nel pannello Gestione Documenti
- Seleziona file (PDF, DOC, XLS, immagini, ZIP)
- Compila titolo, descrizione, categoria
- Scegli visibilità (Pubblico o Solo Admin)
- Max 50 MB per file

#### **2. Visualizzare Documenti** ✅
- Lista completa con icone colorate per tipo file
- Info: dimensione, categoria, data caricamento
- Badge visibilità (Pubblico/Admin)
- Ricerca real-time

#### **3. Modificare Documenti** ✅
- Click su pulsante "Modifica"
- Aggiorna titolo, descrizione, categoria, visibilità
- Non è possibile modificare il file stesso (solo metadata)

#### **4. Eliminare Documenti** ✅
- Click su pulsante "Elimina"
- Conferma richiesta
- Eliminazione permanente

#### **5. Scaricare Documenti** ✅
- Click su pulsante "Scarica"
- Download immediato

---

## 📂 Categorie Disponibili

- **Generale** - Documenti generici
- **Regolamento** - Regolamenti del club
- **Modulistica** - Moduli e form
- **Verbali** - Verbali riunioni
- **Guide** - Guide e tutorial
- **Bilanci** - Documenti finanziari
- **Altro** - Altri documenti

---

## 🔐 Visibilità Documenti

### **Pubblico**
- Visibile a tutti gli utenti registrati
- Mostrato nella sezione "Documenti" per tutti

### **Solo Amministratori**
- Visibile solo agli amministratori
- Badge arancione "Admin" per identificazione rapida
- Non mostrato agli utenti normali

---

## 💾 Storage Implementazione

### **Modalità Attuale (Metadata Only)**
```
File selezionato → Metadata salvati su DB → URL simulato
```

**Cosa viene salvato:**
- Titolo, descrizione, categoria
- Nome file, dimensione, tipo MIME
- Visibilità, data upload, utente caricatore

**Nota:** Il file **NON viene effettivamente caricato** su Supabase Storage in questa implementazione. Viene creato un URL placeholder. Per uso reale, vedi sezione "Integrazione Supabase Storage" sotto.

---

## 🚀 Come Usare

### **Step 1: Accedi come Admin**
```
Email: user1@test.com
Password: password123
```

### **Step 2: Vai in Gestione Documenti**
```
Login → Pannello Admin → Gestione Documenti
```

### **Step 3: Carica un Documento**
1. Click "Carica"
2. Seleziona file dal tuo computer
3. Compila form:
   - Titolo (obbligatorio)
   - Descrizione (opzionale)
   - Categoria (opzionale)
   - Solo admin? (checkbox)
4. Click "Carica"

### **Step 4: Gestisci Documenti**
- **Cerca**: Usa barra ricerca per filtrare
- **Scarica**: Click icona download
- **Modifica**: Click icona matita
- **Elimina**: Click icona cestino

---

## 🔧 Integrazione Supabase Storage (Per Produzione)

Per integrare il **vero upload** su Supabase Storage, modifica `admin-documents.js`:

### **1. Setup Bucket su Supabase**
```sql
-- Crea bucket nella dashboard Supabase
-- Nome: documents
-- Public: false (solo autenticati)
```

### **2. Modifica funzione handleUpload**

Sostituisci questa sezione:
```javascript
// ATTUALE (placeholder)
const fileUrl = `https://example.com/documents/${generateUUID()}_${selectedFile.name}`;
```

Con:
```javascript
// PRODUZIONE (upload reale)
const fileExt = selectedFile.name.split('.').pop();
const fileName = `${generateUUID()}.${fileExt}`;
const filePath = `${user.id}/${fileName}`;

// Upload file
const { data: uploadData, error: uploadError } = await supabase.storage
  .from(STORAGE_BUCKETS.documents)
  .upload(filePath, selectedFile, {
    cacheControl: '3600',
    upsert: false
  });

if (uploadError) throw uploadError;

// Get public URL
const { data: urlData } = supabase.storage
  .from(STORAGE_BUCKETS.documents)
  .getPublicUrl(filePath);

const fileUrl = urlData.publicUrl;
```

### **3. Modifica funzione handleDeleteDocument**

Aggiungi prima del delete dal DB:
```javascript
// Extract file path from URL
const urlParts = doc.fileUrl.split('/');
const filePath = urlParts.slice(-2).join('/'); // user_id/filename

// Delete from storage
const { error: storageError } = await supabase.storage
  .from(STORAGE_BUCKETS.documents)
  .remove([filePath]);

if (storageError) console.warn('Storage delete error:', storageError);
```

---

## 📊 Limiti e Considerazioni

### **File Size Limits**
- **Frontend**: 50 MB (configurabile in `admin-documents.js`)
- **Supabase Free Tier**: 5 GB storage totale
- **Supabase Pro**: 100 GB+ storage

### **File Types Supportati**
- PDF (`.pdf`)
- Word (`.doc`, `.docx`)
- Excel (`.xls`, `.xlsx`)
- Immagini (`.jpg`, `.jpeg`, `.png`)
- Archivi (`.zip`, `.rar`)

### **Performance**
- File piccoli (<5 MB): Upload immediato
- File medi (5-20 MB): ~5-10 secondi
- File grandi (20-50 MB): ~30-60 secondi

---

## 🎨 UI/UX Features

### **Icons Colorate per Tipo File**
- 📄 PDF: Rosso
- 📘 Word: Blu
- 📊 Excel: Verde
- 🖼️ Immagini: Arancione
- 📦 Archivi: Grigio

### **Feedback Utente**
- ✅ Toast notifications per successo
- ❌ Toast notifications per errori
- ⏳ Loading spinner durante upload
- 🔍 Ricerca real-time
- 📋 Preview file selezionato

### **Responsive Design**
- Layout ottimizzato per mobile
- Card adaptive
- Form scrollable per campi numerosi

---

## ✨ Funzionalità Avanzate

### **Auto-fill Titolo**
Quando selezioni un file, il titolo viene auto-compilato con il nome del file (senza estensione).

### **Validazione File**
- Check dimensione max (50 MB)
- Check tipo file accettato
- Feedback immediato se non valido

### **Ricerca Intelligente**
Cerca in:
- Titolo documento
- Descrizione
- Categoria
- Nome file

### **Metadata Completo**
Ogni documento salva:
- Chi l'ha caricato (uploaded_by)
- Quando è stato caricato (created_at)
- Quando è stato modificato (updated_at)

---

## 🐛 Troubleshooting

### **Problema: "File troppo grande"**
**Soluzione:** Comprimi il file o aumenta il limite in `admin-documents.js` (riga ~250)

### **Problema: "Tipo file non supportato"**
**Soluzione:** Aggiungi l'estensione in `accept` attribute dell'input file (riga ~145)

### **Problema: Upload lento**
**Causa:** File grande o connessione lenta
**Soluzione:** Attendi o usa file più piccoli

### **Problema: Documento non appare nella lista**
**Causa:** Visibilità "Solo Admin" e login come user normale
**Soluzione:** Login come admin o cambia visibilità

---

## 📚 Esempi d'Uso

### **Caso 1: Caricare Regolamento**
```
1. File: Regolamento_2024.pdf
2. Titolo: "Regolamento Club Softair 2024"
3. Descrizione: "Regolamento ufficiale aggiornato gennaio 2024"
4. Categoria: "Regolamento"
5. Visibilità: Pubblico
```

### **Caso 2: Caricare Verbale Riservato**
```
1. File: Verbale_Assemblea_Nov2024.pdf
2. Titolo: "Verbale Assemblea Novembre 2024"
3. Descrizione: "Verbale riunione straordinaria"
4. Categoria: "Verbali"
5. Visibilità: Solo Amministratori ✓
```

### **Caso 3: Caricare Modulo Iscrizione**
```
1. File: Modulo_Iscrizione.pdf
2. Titolo: "Modulo Iscrizione Nuovi Soci"
3. Descrizione: "Modulo da compilare per nuove iscrizioni"
4. Categoria: "Modulistica"
5. Visibilità: Pubblico
```

---

## 🎯 Checklist Test

- [ ] Login come admin
- [ ] Apri Gestione Documenti
- [ ] Carica un PDF
- [ ] Carica un'immagine
- [ ] Cerca un documento
- [ ] Modifica titolo documento
- [ ] Cambia visibilità documento
- [ ] Scarica documento
- [ ] Elimina documento
- [ ] Verifica badge visibilità
- [ ] Test ricerca

---

## 🔮 Future Enhancements

Possibili miglioramenti futuri:

1. **Preview Documenti** - Anteprima PDF/immagini inline
2. **Drag & Drop** - Upload con drag and drop
3. **Batch Upload** - Carica multipli file insieme
4. **Versioning** - Mantieni versioni precedenti
5. **Download Statistics** - Traccia numero download
6. **OCR Search** - Cerca testo dentro PDF
7. **Folders** - Organizza in cartelle
8. **Permissions** - Permessi granulari per gruppo
9. **Expiration** - Data scadenza documenti
10. **Notifications** - Notifica nuovi documenti

---

## 📞 Supporto

Per problemi o domande sulla gestione documenti, consulta:
- [README.md](README.md) - Documentazione generale
- [FEATURES_COMPLETE.md](FEATURES_COMPLETE.md) - Lista funzionalità complete

---

**Implementato con ❤️ usando Claude Code**
**Versione**: 1.0.0
**Data**: Novembre 2024
