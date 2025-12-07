# Social Login Buttons - TableTalk

## 📱 Componente per l'autenticazione social

Questo componente fornisce pulsanti per il login con Google e Apple Sign-In.

## 🚀 Utilizzo

```jsx
import SocialLoginButtons from '../../../components/common/SocialLoginButtons';

<SocialLoginButtons
  onSuccess={(result) => {
    console.log('Login social completato:', result);
    // Gestisci il successo del login
  }}
  onError={(errorMessage) => {
    console.error('Errore login social:', errorMessage);
    // Gestisci l'errore
  }}
  disabled={false}
/>
```

## ⚙️ Props

- `onSuccess`: Callback chiamato quando il login social ha successo
- `onError`: Callback chiamato quando si verifica un errore
- `disabled`: Disabilita i pulsanti quando true

## 🔧 Configurazione

### Google Auth
- **Web Client ID**: `534454809499-4vsllugc4jbuft2n20p5sakupvvdcjrb.apps.googleusercontent.com`
- **Android Client ID**: `534454809499-cc8nullh817gf2qqdff570rta5i1hmv7.apps.googleusercontent.com`
- **iOS Client ID**: `534454809499-1f66hg06varvottb4pgal89ojqip7rg4.apps.googleusercontent.com`

### Apple Sign-In
- **Bundle ID**: `com.tabletalk.socialapp`
- **Redirect URI**: `https://tabletalk.app/auth/apple/callback`

## 📱 Piattaforme Supportate

- ✅ **Web**: Google Auth
- ✅ **Android**: Google Auth
- ✅ **iOS**: Google Auth + Apple Sign-In

## 🎨 Styling

Il componente utilizza CSS Modules con classi personalizzabili:
- `.socialLoginContainer`: Container principale
- `.socialButton`: Stile base per i pulsanti
- `.googleButton`: Stile specifico per Google
- `.appleButton`: Stile specifico per Apple

## 🔒 Sicurezza

- I token vengono verificati lato backend
- Le credenziali OAuth sono protette nel `.gitignore`
- Utilizza HTTPS per tutte le comunicazioni
