const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const axios = require('axios');

// Helper function per ottenere gli ID degli utenti da escludere (blocchi bidirezionali)
const getExcludedUserIds = async (currentUserId) => {
  const currentUser = await User.findById(currentUserId);
  const usersWhoBlockedMe = await User.find({ blockedUsers: currentUserId }).select('_id');
  const usersWhoBlockedMeIds = usersWhoBlockedMe.map(user => user._id);
  
  return {
    usersIBlocked: currentUser.blockedUsers || [],
    usersWhoBlockedMe: usersWhoBlockedMeIds,
    allExcludedIds: [...currentUser.blockedUsers, ...usersWhoBlockedMeIds, currentUserId]
  };
};


// Configurazione di multer per il caricamento delle immagini
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/profile-images/');
  },
  filename: function(req, file, cb) {
    cb(null, `user-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Filtro per accettare solo immagini
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Puoi caricare solo file immagine'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
}).single('profileImage');

/**
 * @desc    Ottieni il profilo dell'utente corrente
 * @route   GET /api/users/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Carica l'immagine del profilo
 * @route   POST /api/users/profile/picture
 * @access  Private
 */
exports.uploadProfileImage = (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

  if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nessun file caricato'
      });
  }

    try {
      const user = await User.findById(req.user.id);

      // Elimina la vecchia immagine se non è quella di default
      if (user.profileImage !== 'default-profile.jpg') {
        const oldImagePath = path.join(__dirname, '..', 'uploads', 'profiles', user.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Aggiorna l'immagine del profilo
      user.profileImage = req.file.filename;
      await user.save();

  res.status(200).json({
    success: true,
        data: {
          profileImage: user.profileImage
        }
  });
    } catch (err) {
      next(err);
    }
});
};

/**
 * @desc    Ottieni tutti gli utenti
 * @route   GET /api/users
 * @access  Private/Admin
 */
exports.getUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Costruisci la query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    // Ottieni gli ID degli utenti da escludere (blocchi bidirezionali)
    const excludedIds = await getExcludedUserIds(req.user.id);
    query._id = { $nin: excludedIds.allExcludedIds };

    // Esegui la query con paginazione
    const users = await User.find(query)
      .select('-password')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Conta il totale degli utenti
    const count = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalUsers: count
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Errore del server');
  }
};

/**
 * @desc    Ottieni un utente specifico
 * @route   GET /api/users/:id
 * @access  Private
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
  if (!user) {
      return res.status(404).json({ msg: 'Utente non trovato' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Utente non trovato' });
  }
    res.status(500).send('Errore del server');
  }
};

/**
 * @desc    Cambia la password dell'utente
 * @route   PUT /api/users/password
 * @access  Private
 */
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id);
  
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return next(new ErrorResponse('Password attuale non valida', 401));
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password aggiornata con successo'
  });
});

// Placeholder per ricerca utenti
exports.searchUsers = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, message: 'Ricerca utenti non ancora implementata.' });
});

/**
 * @desc    Blocca un utente (user-to-user blocking)
 * @route   POST /api/users/:id/block
 * @access  Private
 */
exports.blockUser = async (req, res) => {
  try {
    const userToBlockId = req.params.id;
    const currentUserId = req.user.id;

    // Verifica che l'utente non stia cercando di bloccare se stesso
    if (currentUserId === userToBlockId) {
      return res.status(400).json({ 
        success: false,
        message: 'Non puoi bloccare te stesso' 
      });
    }

    // Verifica che l'utente da bloccare esista
    const userToBlock = await User.findById(userToBlockId);
    if (!userToBlock) {
      return res.status(404).json({ 
        success: false,
        message: 'Utente non trovato' 
      });
    }

    // Ottieni l'utente corrente e blocca l'altro utente
    const currentUser = await User.findById(currentUserId);
    await currentUser.blockUser(userToBlockId);

    res.status(200).json({
      success: true,
      message: 'Utente bloccato con successo',
      data: {
        blockedUserId: userToBlockId,
        blockedUsersCount: currentUser.blockedUsers.length
      }
    });
  } catch (err) {
    console.error('Errore nel blocco utente:', err);
    res.status(500).json({ 
      success: false,
      message: 'Errore nel blocco utente' 
    });
  }
};

/**
 * @desc    Sblocca un utente (user-to-user unblocking)
 * @route   DELETE /api/users/:id/block
 * @access  Private
 */
exports.unblockUser = async (req, res) => {
  try {
    const userToUnblockId = req.params.id;
    const currentUserId = req.user.id;

    // Ottieni l'utente corrente e sblocca l'altro utente
    const currentUser = await User.findById(currentUserId);
    await currentUser.unblockUser(userToUnblockId);

    res.status(200).json({
      success: true,
      message: 'Utente sbloccato con successo',
      data: {
        unblockedUserId: userToUnblockId,
        blockedUsersCount: currentUser.blockedUsers.length
      }
    });
  } catch (err) {
    console.error('Errore nello sblocco utente:', err);
    res.status(500).json({ 
      success: false,
      message: 'Errore nello sblocco utente' 
    });
  }
};

/**
 * @desc    Cambia il ruolo di un utente
 * @route   PUT /api/users/:id/role
 * @access  Private/Admin
 */
exports.changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ msg: 'Utente non trovato' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Utente non trovato' });
    }
    res.status(500).send('Errore del server');
  }
};

/**
 * @desc    Cambia lo stato di un utente
 * @route   PUT /api/users/:id/status
 * @access  Private/Admin
 */
exports.changeUserStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        status,
        statusReason: reason,
        statusChangedAt: Date.now()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ msg: 'Utente non trovato' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Utente non trovato' });
    }
    res.status(500).send('Errore del server');
  }
};

// Placeholder per ottenere la lista degli utenti bloccati
exports.getBlockedUsers = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, message: 'Lista utenti bloccati non ancora implementata.' });
});

// Placeholder per eliminare l'account
exports.deleteAccount = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, message: 'Eliminazione account non ancora implementata.' });
});

/**
 * @desc    Aggiorna la posizione geografica dell'utente
 * @route   PUT /api/users/me/location
 * @access  Private
 */
exports.updateUserLocation = asyncHandler(async (req, res, next) => {
  const { longitude, latitude, address } = req.body;

  if (!longitude || !latitude) {
    return next(new ErrorResponse('Latitudine e Longitudine sono obbligatorie', 400));
  }

  // Verifica che le coordinate siano numeri validi
  const lon = parseFloat(longitude);
  const lat = parseFloat(latitude);
  
  if (isNaN(lon) || isNaN(lat)) {
    return next(new ErrorResponse('Coordinate non valide', 400));
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorResponse('Utente non trovato', 404));
  }

  // Aggiorna il campo location con il formato GeoJSON
  user.location = {
    type: 'Point',
    coordinates: [lon, lat],
    address: address || user.location.address || ''
  };

  await user.save();

  res.status(200).json({
    success: true,
    data: user.location
  });
});

/**
* @desc    Aggiorna l'indirizzo dell'utente partendo dalle coordinate (Reverse Geocoding)
* @route   PUT /api/users/me/location-from-coords
* @access  Private
*/
exports.updateUserLocationFromCoords = asyncHandler(async (req, res, next) => {
 const { latitude, longitude } = req.body;

 if (!latitude || !longitude) {
   return next(new ErrorResponse('Latitudine e Longitudine sono obbligatorie', 400));
 }

 const GOOGLE_API_KEY = process.env.Maps_API_KEY; // Usa la tua chiave dal file .env
 const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}&language=it`;

 const response = await axios.get(url);

 if (response.data.status !== 'OK' || !response.data.results[0]) {
   return next(new ErrorResponse('Impossibile trovare un indirizzo per queste coordinate', 404));
 }
 
 // Estraiamo la città e la nazione
 const addressComponents = response.data.results[0].address_components;
 const city = addressComponents.find(c => c.types.includes('locality'))?.long_name;
 const country = addressComponents.find(c => c.types.includes('country'))?.long_name;

 let formattedAddress = 'Posizione sconosciuta';
 if (city && country) {
   formattedAddress = `${city}, ${country}`;
 } else if (country) {
   formattedAddress = country;
 }

 // Aggiorniamo l'utente
 const user = await User.findById(req.user.id);
 
 // Manteniamo le coordinate esistenti e aggiorniamo solo l'indirizzo testuale
 user.location.address = formattedAddress;
 
 await user.save();

 res.status(200).json({
   success: true,
   data: {
     address: user.location.address
   }
 });
});

/**
 * @desc    Rimuove la posizione geografica dell'utente (quando l'app si chiude)
 * @route   DELETE /api/users/me/location
 * @access  Private
 */
exports.removeUserLocation = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorResponse('Utente non trovato', 404));
  }

  // Rimuove la posizione impostando i campi a null/vuoto
  user.location = {
    type: 'Point',
    coordinates: [],
    address: ''
  };

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Posizione rimossa con successo',
    data: user.location
  });
});

/**
 * @desc    Trova utenti vicini che condividono la posizione
 * @route   GET /api/users/nearby
 * @access  Private
 */
exports.getNearbyUsers = asyncHandler(async (req, res, next) => {
  const { longitude, latitude, distance } = req.query;

  if (!longitude || !latitude) {
    return next(new ErrorResponse('Longitudine e Latitudine sono necessarie per la ricerca', 400));
  }

  // Distanza massima in metri (default 10km se non specificata)
  const maxDistance = distance ? parseInt(distance, 10) : 20000;
  const lon = parseFloat(longitude);
  const lat = parseFloat(latitude);

  // Ottieni gli ID degli utenti da escludere (blocchi bidirezionali)
  const excludedIds = await getExcludedUserIds(req.user.id);

  const users = await User.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lon, lat]
        },
        distanceField: "dist.calculated", // Aggiunge un campo 'dist.calculated' con la distanza in metri
        maxDistance: maxDistance,
        query: { 
          'settings.privacy.showLocationOnMap': true,
          _id: { $nin: excludedIds.allExcludedIds }
        },
        spherical: true // Obbligatorio per calcoli su un globo terrestre
      }
    },
    { 
      $project: {
        _id: 1,
        name: 1,
        surname: 1,
        nickname: 1,
        profileImage: 1,
        location: 1,
        dist: 1 
      }
    }
  ]); 

  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

/**
 * @desc    Ottieni la lista degli utenti bloccati
 * @route   GET /api/users/blocked
 * @access  Private
 */
exports.getBlockedUsers = asyncHandler(async (req, res, next) => {
  const currentUserId = req.user.id;

  const currentUser = await User.findById(currentUserId)
    .populate('blockedUsers', 'nickname profileImage bio');

  res.status(200).json({
    success: true,
    data: {
      blockedUsers: currentUser.blockedUsers,
      count: currentUser.blockedUsers.length
    }
  });
});

/**
 * @desc    Verifica se un utente è bloccato
 * @route   GET /api/users/:userId/is-blocked
 * @access  Private
 */
exports.isUserBlocked = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;

  const currentUser = await User.findById(currentUserId);
  const isBlocked = currentUser.isUserBlocked(userId);

  res.status(200).json({
    success: true,
    data: {
      isBlocked,
      userId
    }
  });
});

