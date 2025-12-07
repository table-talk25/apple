const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Inizializza il client OAuth2 di Google
const googleClient = new OAuth2Client(
  '534454809499-4vsllugc4jbuft2n20p5sakupvvdcjrb.apps.googleusercontent.com' // Web Client ID
);

// --- VERSIONE DIAGNOSTICA ---
const googleAuth = async (req, res) => {
  console.log('--- Inizio richiesta login Google ---');
  try {
    const { idToken } = req.body;
    if (!idToken) {
      console.log('❌ Errore: idToken non fornito nel corpo della richiesta.');
      return res.status(400).json({ success: false, message: 'Token ID richiesto' });
    }
    console.log('✅ Ricevuto idToken, avvio la verifica con Google...');

    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: '534454809499-4vsllugc4jbuft2n20p5sakupvvdcjrb.apps.googleusercontent.com'
    });
    console.log('✅ Token verificato con successo!');

    const payload = ticket.getPayload();
    const { email, name: fullName, picture: profileImage, sub: googleId } = payload;
    console.log(`Dati dal token: email=${email}, nome=${fullName}`);

    console.log('Cerco utente nel database...');
    let user = await User.findOne({ $or: [{ email: email }, { googleId: googleId }] });

    if (user) {
      console.log(`👤 Utente trovato: ${user._id}. Aggiorno se necessario.`);
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
      }
      if (profileImage && !user.profileImage) {
        user.profileImage = profileImage;
      }
      try {
        await user.save();
        console.log('✅ Utente esistente salvato con successo.');
      } catch (saveError) {
        console.error('❌ ERRORE CRITICO durante il salvataggio dell\'utente ESISTENTE:', saveError);
        throw saveError;
      }
    } else {
      console.log('🆕 Utente non trovato, procedo con la creazione.');
      const nameParts = fullName.split(' ');
      const name = nameParts.shift() || '';
      const surname = nameParts.join(' ') || name;
      console.log(`Nome diviso in: name='${name}', surname='${surname}'`);

      const newUser = new User({
        name,
        surname,
        email,
        googleId,
        profileImage,
        authProvider: 'google',
        isEmailVerified: true,
      });

      try {
        user = await newUser.save();
        console.log(`✅ Nuovo utente creato con successo: ${user._id}`);
      } catch (saveError) {
        console.error('❌ ERRORE CRITICO durante la creazione del NUOVO utente:', saveError);
        throw saveError;
      }
    }

    console.log('Generazione token JWT...');
    const token = jwt.sign({ userId: user._id, email: user.email }, config.jwtSecret, { expiresIn: '7d' });
    console.log('✅ Token generato. Invio risposta al client.');

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login Google completato con successo',
      token: token,
      user: userResponse
    });

  } catch (error) {
    console.error('--- 💥 ERRORE FINALE NEL BLOCCO CATCH 💥 ---');
    console.error(error); // Stampa l'errore completo che è stato lanciato
    res.status(500).json({ success: false, message: 'Errore interno del server durante l\'autenticazione Google.' });
  }
};

/**
 * Autenticazione con Apple
 * TODO: Implementare la verifica del token Apple
 */
const appleAuth = async (req, res) => {
  try {
    const { identityToken, authorizationCode, user } = req.body;

    if (!identityToken || !authorizationCode) {
      return res.status(400).json({
        success: false,
        message: 'Token e codice di autorizzazione richiesti'
      });
    }

    // TODO: Verifica del token Apple usando la libreria appropriata
    // Per ora, accettiamo i dati come validi
    
    const email = user?.email;
    const name = user?.name;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email richiesta per l\'autenticazione Apple'
      });
    }

    // Cerca l'utente per email
    let existingUser = await User.findOne({ email: email });

    if (existingUser) {
      // Aggiorna le informazioni se necessario
      if (!existingUser.appleId) {
        existingUser.appleId = authorizationCode; // Usa il codice come ID temporaneo
        existingUser.authProvider = 'apple';
      }
      
      if (name && !existingUser.name) {
        existingUser.name = name;
      }

      await existingUser.save();
    } else {
      // Crea un nuovo utente
      existingUser = new User({
        email: email,
        name: name,
        appleId: authorizationCode, // Usa il codice come ID temporaneo
        authProvider: 'apple',
        isEmailVerified: true, // Apple verifica automaticamente l'email
        password: undefined // Non serve password per login social
      });

      await existingUser.save();
    }

    // Genera il token JWT
    const token = jwt.sign(
      { 
        userId: existingUser._id,
        email: existingUser.email,
        authProvider: existingUser.authProvider
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Rimuovi la password dalla risposta
    const userResponse = existingUser.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login Apple completato con successo',
      token: token,
      user: userResponse
    });

  } catch (error) {
    console.error('Errore autenticazione Apple:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'autenticazione Apple'
    });
  }
};

module.exports = {
  googleAuth,
  appleAuth
};
