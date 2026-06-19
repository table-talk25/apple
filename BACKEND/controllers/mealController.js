const { calculateDistance, validateCoordinates, validateRadius } = require('../utils/geospatial');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');
const Meal = require('../models/Meal');
const User = require('../models/User');
const Chat = require('../models/Chat');
const { v4: uuidv4 } = require('uuid');

// Servizi importati per delegare la logica complessa
const mealCreationService = require('../services/mealCreationService');
const { sanitizeMealData } = require('../services/sanitizationService');
const mealStatusService = require('../services/mealStatusService');
const notificationService = require('../services/notificationService');
const sendEmail = require('../utils/sendEmail');

// 📱 Funzione centralizzata per inviare notifiche sui pasti
const sendMealNotifications = async (meal, eventType) => {
  try {
    let title, body;
    
    switch(eventType) {
      case 'new_meal_nearby':
        title = '🍽️ Nuovo TableTalk® vicino a te!';
        body = `${meal.title} - ${meal.restaurant || 'Ristorante'} • ${meal.distance || 'Nelle vicinanze'}`;
        break;
      case 'meal_starting_soon':
        title = '⏰ Il tuo TableTalk® inizia tra poco!';
        body = `${meal.title} tra 30 minuti`;
        break;
      case 'new_participant':
        title = '👥 Nuovo partecipante!';
        body = `Qualcuno si è unito al tuo TableTalk®: ${meal.title}`;
        break;
      case 'meal_cancelled':
        title = '❌ TableTalk® cancellato';
        body = `Il TableTalk® "${meal.title}" è stato cancellato`;
        break;
      case 'meal_reminder':
        title = '⏰ Promemoria TableTalk®';
        body = `Il tuo TableTalk® "${meal.title}" inizia tra 1 ora`;
        break;
      default:
        title = '🍽️ Aggiornamento TableTalk®';
        body = `Novità per il TableTalk®: ${meal.title}`;
    }

    // 1. GESTIONE EMAIL CANCELLAZIONE
    if (eventType === 'meal_cancelled') {
      const mealWithParticipants = await Meal.findById(meal._id).populate('participants', 'email nickname name');
      
      if (mealWithParticipants && mealWithParticipants.participants) {
          console.log(`📧 Invio email cancellazione a ${mealWithParticipants.participants.length} partecipanti`);
          
          for (const participant of mealWithParticipants.participants) {
              if (participant._id.toString() !== meal.host.toString()) {
                  try {
                      await sendEmail.sendMealCancellationEmail(
                          participant.email, 
                          participant.nickname || participant.name, 
                          meal
                      );
                  } catch (emailErr) {
                      console.error(`❌ Errore email cancellazione per ${participant.email}:`, emailErr.message);
                  }
              }
          }
      }
    }

    if (meal.location && meal.location.coordinates) {
      const nearbyUsers = await User.find({
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: meal.location.coordinates
            },
            $maxDistance: 5000
          }
        },
        fcmToken: { $exists: true, $ne: null },
        _id: { $ne: meal.host }
      }).limit(20); 

      console.log(`📱 Invio notifiche ${eventType} a ${nearbyUsers.length} utenti nelle vicinanze`);

      for (const user of nearbyUsers) {
        if (user.fcmToken) {
          try {
            await notificationService.sendPushNotification(
              user.fcmToken,
              title,
              body,
              {
                mealId: meal._id.toString(),
                type: eventType,
                hostName: meal.host?.nickname || 'Host',
                mealTitle: meal.title,
                timestamp: new Date().toISOString()
              }
            );
          } catch (pushError) {
            console.error(`⚠️ Errore push per utente ${user._id}:`, pushError.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error sending meal notifications:', error);
  }
};

const normalizeMealLocation = (mealDoc) => {
  const meal = mealDoc && typeof mealDoc.toObject === 'function' ? mealDoc.toObject() : mealDoc;
  if (meal && meal.location) {
    if (typeof meal.location === 'string') {
      const match = meal.location.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (match) {
        const latNum = parseFloat(match[1]);
        const lngNum = parseFloat(match[2]);
        if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
          meal.location = {
            address: meal.location,
            coordinates: [lngNum, latNum]
          };
        }
      } else {
        meal.location = {
          address: meal.location,
          coordinates: undefined
        };
      }
    }
  }
  return meal;
};

// 🔒 NUOVO: Filtra location in base all'autorizzazione
//const filterMealLocationByAuthorization = (meal, requestingUser) => {
  // Se è un pasto virtuale, non c'è location
  if (meal.mealType === 'virtual') {
    return meal;
  }
  
  // Se è fisico, controlla autorizzazioni
  if (meal.mealType === 'physical' && meal.location) {
    const userId = requestingUser ? requestingUser._id.toString() : null;
    const hostId = meal.host ? meal.host.toString() : null;
    
    const isHost = userId && hostId && userId === hostId;
    
    const isParticipant = meal.participants && 
                          userId && 
                          meal.participants.some(p => p.toString() === userId);
    
    // Se privato E utente non è host/partecipante → nascondi location
    if (meal.isPublic === false && !isHost && !isParticipant) {
      meal.location = null;
      return meal;
    }
    
    // Se pubblico O sei host/partecipante → mostra location
    return meal;
  }
  
  return meal;
};

// @desc    Get meals within a certain radius for the map
// @route   GET /api/meals/map
// @access  Public
exports.getMealsForMap = asyncHandler(async (req, res, next) => {
  try {
    const { lat, lng, radius, mealType = 'physical', status = 'upcoming' } = req.query;

    if (!lat || !lng || !radius) {
      return next(new ErrorResponse('Coordinate e raggio richiesti: lat, lng, radius', 400));
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    if (!validateCoordinates(latitude, longitude)) {
      return next(new ErrorResponse('Coordinate non valide. Lat: -90 a 90, Lng: -180 a 180', 400));
    }

    if (!validateRadius(radiusKm)) {
      return next(new ErrorResponse('Raggio non valido. Deve essere tra 0 e 1000 km', 400));
    }

    const radiusInRad = radiusKm / 6371;

    const baseQuery = {
      mealType: mealType,
      status: { $in: status.split(',') },
      'location.coordinates': { $exists: true, $ne: null },
      isPublic: true
    }; 

    const geoQuery = {
      ...baseQuery,
      'location.coordinates': {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusInRad]
        }
      }
    };

    const meals = await Meal.find(geoQuery)
      .select('_id title description date duration mealType location host maxParticipants participants status')
      .populate('host', 'nickname profileImage')
      .lean()
      .exec();

    const mealsWithDistance = meals.map(meal => {
      const mealData = normalizeMealLocation(meal);
      
      if (mealData.location && mealData.location.coordinates) {
        const [mealLng, mealLat] = mealData.location.coordinates;
        const distance = calculateDistance(latitude, longitude, mealLat, mealLng);
        
        return {
          ...mealData,
          distance: Math.round(distance * 100) / 100,
          distanceFormatted: `${Math.round(distance * 100) / 100} km`
        };
      }
      
      return mealData;
    });

    mealsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    res.status(200).json({
      success: true,
      count: mealsWithDistance.length,
      data: mealsWithDistance,
      searchParams: {
        center: { lat: latitude, lng: longitude },
        radius: radiusKm,
        mealType,
        status
      }
    });

  } catch (error) {
    console.error('❌ [MealController] Errore in getMealsForMap:', error);
    return next(new ErrorResponse('Errore nella ricerca geospaziale', 500));
  }
});

// @desc    Get geospatial statistics for meals
exports.getMealsGeoStats = asyncHandler(async (req, res, next) => {
    res.status(200).json({ success: true, message: "Stats endpoint placeholder" });
});

// @desc    Advanced geospatial search
exports.advancedGeospatialSearch = asyncHandler(async (req, res, next) => {
    res.status(200).json({ success: true, message: "Advanced Search endpoint placeholder" });
});

// Query builder helper
const buildGetMealsQuery = async (queryParams, user) => {
  const { status, mealType, near } = queryParams;
  const statusFilter = status ? status.split(',') : ['upcoming'];
  let query = { status: { $in: statusFilter } };

  if (mealType) query.mealType = mealType;
  if (near) {
    try {
      const [lat, lng] = near.split(',').map(coord => parseFloat(coord.trim()));
      if (validateCoordinates(lat, lng)) {
        const defaultRadius = 50;
        const radiusInRad = defaultRadius / 6371;
        query.mealType = 'physical';
        query['location.coordinates'] = {
          $geoWithin: { $centerSphere: [[lng, lat], radiusInRad] }
        };
      }
    } catch (error) {}
  }

  if (user) {
    const currentUser = await User.findById(user.id).select('blockedUsers');
    const usersWhoBlockedMe = await User.find({ blockedUsers: user.id }).select('_id');
    const excludedIds = [...currentUser.blockedUsers, ...usersWhoBlockedMe.map(u => u._id)];
    if (excludedIds.length > 0) query.host = { $nin: excludedIds };

    query.$or = [
      { isPublic: true },
      { host: user.id },
      { participants: user.id }
    ];
  } else {
    query.isPublic = true;
  }

  return query;
};

exports.getMeals = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const query = await buildGetMealsQuery(req.query, req.user);

  const [meals, total] = await Promise.all([
    Meal.find(query).sort({ date: 1 }).skip(skip).limit(limit).populate('host', 'nickname profileImage').lean(),
    Meal.countDocuments(query)
  ]);

  const mealsWithVirtualStatus = meals.map(meal => {
    const now = new Date();
    const startTime = new Date(meal.date);
    const endTime = new Date(startTime.getTime() + (meal.duration || 60) * 60 * 1000);
    let virtualStatus = meal.status;
    if (meal.status !== 'cancelled') {
      if (now < startTime) virtualStatus = 'upcoming';
      else if (now >= startTime && now < endTime) virtualStatus = 'ongoing';
      else virtualStatus = 'completed';
    }
    const normalizedMeal = normalizeMealLocation(meal);
const filteredMeal = filterMealLocationByAuthorization(normalizedMeal, req.user);
return { ...filteredMeal, virtualStatus };
  });

  res.status(200).json({
    success: true,
    count: meals.length,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    data: mealsWithVirtualStatus
  });
});

exports.getMealHistory = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user.id);
  const usersWhoBlockedMe = await User.find({ blockedUsers: req.user.id }).select('_id');
  const excludedIds = [...currentUser.blockedUsers, ...usersWhoBlockedMe.map(u => u._id)];

  const meals = await Meal.find({ 
      participants: req.user.id,
      status: { $in: ['completed', 'cancelled'] },
      host: { $nin: excludedIds }
  }).sort({ date: -1 }).populate('host', 'nickname profileImage');

  res.status(200).json({ success: true, data: meals });
});

exports.getMeal = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id)
    .populate('host participants', 'nickname profileImage')
    .populate('chatId', 'name participants');
  if (!meal) return next(new ErrorResponse(`Pasto non trovato`, 404));

  if (meal.isPublic === false) {
    const userId = req.user ? req.user.id : null;
    const hostId = (meal.host && meal.host._id) ? meal.host._id.toString() : (meal.host ? meal.host.toString() : null);
    const isHost = userId && hostId && hostId === userId;
    const isParticipant = userId && meal.participants.some(p => {
      const pid = (p && p._id) ? p._id.toString() : p.toString();
      return pid === userId;
    });
    if (!isHost && !isParticipant) {
      return next(new ErrorResponse(`Pasto non trovato`, 404));
    }
  }

  const normalizedMeal = normalizeMealLocation(meal);
  if (normalizedMeal.chatId && typeof normalizedMeal.chatId === 'object' && normalizedMeal.chatId !== null) {
    normalizedMeal.chatId = normalizedMeal.chatId._id ? normalizedMeal.chatId._id.toString() : String(normalizedMeal.chatId);
  }
  res.status(200).json({ success: true, data: normalizedMeal });
});

exports.createMeal = asyncHandler(async (req, res, next) => {
  const sanitizedBody = sanitizeMealData(req.body);
  const mealData = { ...sanitizedBody };
  if (typeof mealData.duration === 'string') mealData.duration = parseInt(mealData.duration, 10);
  if (typeof mealData.maxParticipants === 'string') mealData.maxParticipants = parseInt(mealData.maxParticipants, 10);
  if (typeof mealData.isPublic === 'string') mealData.isPublic = mealData.isPublic === 'true';
  if (typeof mealData.date === 'string') { try { mealData.date = new Date(mealData.date); } catch (_) {} }
  
  if (req.body.location) {
    try {
      const parsedLocation = JSON.parse(req.body.location);
      if (parsedLocation && typeof parsedLocation === 'object') {
        mealData.location = {
          address: parsedLocation.address || parsedLocation.formattedAddress || '',
          coordinates: parsedLocation.coordinates || undefined
        };
      } else { mealData.location = { address: String(req.body.location) }; }
    } catch (error) { mealData.location = { address: String(req.body.location) }; }
  }

  try {
    const meal = await mealCreationService.createFullMeal(mealData, req.user, req.file);
    const populatedMeal = await Meal.findById(meal._id).populate('host', 'nickname profileImage');
    await sendMealNotifications(meal, 'new_meal_nearby');
    res.status(201).json({ success: true, data: populatedMeal });
  } catch (error) {
    console.error('❌ [Controller] Errore creazione pasto:', error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors || {}).map(e => e.message);
        return next(new ErrorResponse(messages.join(' | '), 400));
    }
    return next(new ErrorResponse('Errore interno nella creazione del pasto.', 500));
  }
});

// Campi che non devono mai essere modificati tramite updateMeal
const IMMUTABLE_FIELDS = ['_id', '__v', 'host', 'participants', 'chatId', 'videoCallLink', 'createdAt', 'updatedAt'];

exports.updateMeal = asyncHandler(async (req, res, next) => {
  let meal = await Meal.findById(req.params.id);
  if (!meal) return next(new ErrorResponse(`Pasto non trovato`, 404));
  if (meal.host.toString() !== req.user.id) return next(new ErrorResponse(`Non autorizzato`, 401));

  // ✅ FIX: rimuovi _id e tutti i campi immutabili prima di passare a Mongoose
  const rawUpdates = sanitizeMealData(req.body);
  const updates = {};
  for (const key of Object.keys(rawUpdates)) {
    if (!IMMUTABLE_FIELDS.includes(key)) {
      updates[key] = rawUpdates[key];
    }
  }

  // Converti tipi stringa → corretti
  if (typeof updates.duration === 'string') updates.duration = parseInt(updates.duration, 10);
  if (typeof updates.maxParticipants === 'string') updates.maxParticipants = parseInt(updates.maxParticipants, 10);
  if (typeof updates.isPublic === 'string') updates.isPublic = updates.isPublic === 'true';
  if (typeof updates.date === 'string') { try { updates.date = new Date(updates.date); } catch (_) {} }

  // Gestione immagine con Firebase
  if (req.file && req.file.buffer) {
    const { uploadImage, deleteImage } = require('../services/firebaseStorageService');

    try {
      if (meal.imageUrl && meal.imageUrl.includes('storage.googleapis.com')) {
        try {
          await deleteImage(meal.imageUrl);
          console.log('✅ [UpdateMeal] Immagine vecchia eliminata da Firebase');
        } catch (err) {
          console.error('⚠️ [UpdateMeal] Errore eliminazione immagine vecchia:', err);
        }
      }

      const imageUrl = await uploadImage(
        req.file.buffer,
        req.file.originalname,
        'meal-images'
      );
      updates.imageUrl = imageUrl;
      console.log('✅ [UpdateMeal] Nuova immagine caricata su Firebase:', imageUrl);
    } catch (error) {
      console.error('❌ [UpdateMeal] Errore upload Firebase:', error);
    }
  }

  // Gestione location
  if (updates.location) {
    try {
      const parsedLocation = typeof updates.location === 'string'
        ? JSON.parse(updates.location)
        : updates.location;
      if (parsedLocation && typeof parsedLocation === 'object') {
        updates.location = {
          address: parsedLocation.address || parsedLocation.formattedAddress || '',
          coordinates: parsedLocation.coordinates || undefined
        };
      } else {
        updates.location = String(updates.location);
      }
    } catch (error) {
      updates.location = String(updates.location);
    }
  }

  meal = await Meal.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    .populate('host', 'nickname profileImage');

  if (updates.status === 'cancelled') await sendMealNotifications(meal, 'meal_cancelled');

  res.status(200).json({ success: true, data: normalizeMealLocation(meal) });
});

exports.deleteMeal = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id);
  if (!meal) return next(new ErrorResponse(`Pasto non trovato`, 404));
  if (meal.host.toString() !== req.user.id) return next(new ErrorResponse(`Non autorizzato`, 403));

  if (meal.imageUrl && meal.imageUrl.includes('storage.googleapis.com')) {
    try {
      const { deleteImage } = require('../services/firebaseStorageService');
      await deleteImage(meal.imageUrl);
      console.log('✅ [DeleteMeal] Immagine eliminata da Firebase');
    } catch (error) {
      console.error('⚠️ [DeleteMeal] Errore eliminazione immagine:', error);
    }
  }

  await Meal.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, data: {} });
});

exports.getMealStatusStats = asyncHandler(async (req, res, next) => {
  try {
    const stats = await mealStatusService.getMealStatusStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) { return next(new ErrorResponse('Errore interno', 500)); }
});

exports.syncMealStatus = asyncHandler(async (req, res, next) => {
  try {
    const result = await mealStatusService.syncMealStatus(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) { return next(new ErrorResponse('Errore interno', 500)); }
});

exports.joinMeal = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id).populate('host', 'nickname');
  if (!meal) return next(new ErrorResponse(`Pasto non trovato`, 404));
  if (meal.status !== 'upcoming') return next(new ErrorResponse('Non possibile iscriversi', 400));
  if (meal.participants.length >= meal.maxParticipants) return next(new ErrorResponse('Pasto al completo', 400));
  const hostId = (meal.host && meal.host._id) ? meal.host._id.toString() : meal.host.toString();
  if (hostId === req.user.id) return next(new ErrorResponse('Sei l\'host', 400));
  if (meal.participants.some(p => p.toString() === req.user.id)) return next(new ErrorResponse('Già iscritto', 400));
  if (meal.isPublic === false) {
    return next(new ErrorResponse('Questo TableTalk® è privato. Puoi unirti solo su invito dell\'host.', 403));
  }
  
  await meal.addParticipant(req.user.id);
  if (meal.chatId) await Chat.findByIdAndUpdate(meal.chatId, { $addToSet: { participants: req.user.id } });
  
  notificationService.sendNotification(meal.host, 'participant_joined', `${req.user.nickname} si è unito.`, { mealId: meal._id });
  
  const updatedMeal = await Meal.findById(meal._id).populate('host', 'nickname profileImage').populate('participants', 'nickname profileImage');
  res.status(200).json({ success: true, data: updatedMeal });
});

exports.leaveMeal = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id);
  if (!meal) return next(new ErrorResponse(`Pasto non trovato`, 404));
  if (meal.host.toString() === req.user.id) return next(new ErrorResponse('L\'host non può lasciare il pasto', 400));
  
  await meal.removeParticipant(req.user.id);
  notificationService.sendNotification(meal.host, 'participant_left', `${req.user.nickname} ha lasciato il pasto.`, { mealId: meal._id });
  
  const updatedMeal = await Meal.findById(meal._id).populate('host', 'nickname profileImage').populate('participants', 'nickname profileImage');
  res.status(200).json({ success: true, data: updatedMeal });
});

exports.searchMeals = asyncHandler(async (req, res, next) => {
  const rawQ = req.query.q;
  const searchTerm = typeof rawQ === 'string' ? rawQ.trim() : '';
  if (!searchTerm || searchTerm.length < 2) {
    return res.status(200).json({ success: true, count: 0, total: 0, data: [] });
  }

  const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const safeTerm = escapeRegex(searchTerm);
  const regex = { $regex: safeTerm, $options: 'i' };

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const skip = (page - 1) * limit;

  const statusFilter = req.query.status
    ? req.query.status.split(',').map(s => s.trim()).filter(Boolean)
    : ['upcoming', 'ongoing'];

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radiusKm = Math.min(Math.max(parseFloat(req.query.radius) || 50, 1), 500);
  const hasGeo = !Number.isNaN(lat) && !Number.isNaN(lng);

  let matchedHostIds = [];
  try {
    const matchedUsers = await User.find({
      $or: [
        { nickname: regex },
        { bio: regex },
        { preferredCuisine: regex },
        { interests: regex },
        { languages: regex },
      ],
    })
      .select('_id')
      .limit(500)
      .lean();
    matchedHostIds = matchedUsers.map(u => u._id);
  } catch (_) {}

  const baseAnd = [
    { status: { $in: statusFilter } },
    { date: { $gte: oneHourAgo } },
  ];

  const textOr = [
    { title: regex },
    { description: regex },
    { topics: regex },
    { language: regex },
  ];
  if (matchedHostIds.length > 0) {
    textOr.push({ host: { $in: matchedHostIds } });
  }
  baseAnd.push({ $or: textOr });

  if (req.user && req.user.id) {
    baseAnd.push({
      $or: [
        { isPublic: true },
        { host: req.user.id },
        { participants: req.user.id },
      ],
    });

    try {
      const currentUser = await User.findById(req.user.id).select('blockedUsers');
      const usersWhoBlockedMe = await User.find({ blockedUsers: req.user.id }).select('_id');
      const excludedIds = [
        ...((currentUser && currentUser.blockedUsers) || []),
        ...usersWhoBlockedMe.map(u => u._id),
      ];
      if (excludedIds.length > 0) {
        baseAnd.push({ host: { $nin: excludedIds } });
      }
    } catch (_) {}
  } else {
    baseAnd.push({ isPublic: true });
  }

  if (hasGeo) {
    const radiusInRad = radiusKm / 6371;
    baseAnd.push({
      $or: [
        {
          mealType: 'physical',
          'location.coordinates': {
            $geoWithin: { $centerSphere: [[lng, lat], radiusInRad] },
          },
        },
        { mealType: 'virtual' },
      ],
    });
  }

  const query = { $and: baseAnd };

  const [meals, total] = await Promise.all([
    Meal.find(query)
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .populate('host', 'nickname profileImage interests bio preferredCuisine'),
    Meal.countDocuments(query),
  ]);

  return res.status(200).json({
    success: true,
    count: meals.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    meta: {
      searchTerm,
      matchedHosts: matchedHostIds.length,
      geo: hasGeo ? { lat, lng, radiusKm } : null,
    },
    data: meals,
  });
});

exports.getUserMeals = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const statusFilter = req.query.status ? req.query.status.split(',') : ['upcoming', 'ongoing', 'completed', 'cancelled'];
  const meals = await Meal.find({
    status: { $in: statusFilter },
    $or: [ { host: userId }, { participants: userId } ]
  }).sort({ date: -1 }).populate('host', 'nickname profileImage').populate('participants', 'nickname profileImage');
  res.status(200).json({ success: true, count: meals.length, data: meals });
});

exports.getVideoCallUrl = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id).populate('participants');
  if (!meal) return next(new ErrorResponse('Pasto non trovato', 404));
  
  const isParticipant = meal.participants.some(p => p._id.equals(req.user._id));
  const isHost = meal.host.equals(req.user._id);
  if (!isParticipant && !isHost) return next(new ErrorResponse('Non autorizzato', 403));
  
  if (!meal.videoCallLink) {
    const roomName = `TableTalk-${meal._id}-${uuidv4()}`;
    meal.videoCallLink = `https://meet.jit.si/${roomName}`;
    await meal.save();
  }
  res.status(200).json({ success: true, data: { videoCallLink: meal.videoCallLink } });
});
