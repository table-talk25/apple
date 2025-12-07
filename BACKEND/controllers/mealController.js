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

    // Trova utenti nelle vicinanze per notificare
    if (meal.location && meal.location.coordinates) {
      const nearbyUsers = await User.find({
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: meal.location.coordinates
            },
            $maxDistance: 5000 // 5km per notifiche immediate
          }
        },
        fcmToken: { $exists: true, $ne: null },
        _id: { $ne: meal.host } // Escludi l'host
      }).limit(20); // Limita a 20 utenti per evitare spam

      console.log(`📱 Invio notifiche ${eventType} a ${nearbyUsers.length} utenti nelle vicinanze`);

      // Invia notifiche push agli utenti nelle vicinanze
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
            // Continua con gli altri utenti anche se uno fallisce
          }
        }
      }
      
      console.log(`✅ Notifiche ${eventType} inviate con successo`);
    } else {
      console.log(`⚠️ Nessuna location per il pasto ${meal._id}, notifiche saltate`);
    }
  } catch (error) {
    console.error('❌ Error sending meal notifications:', error);
    // Non bloccare l'operazione principale se le notifiche falliscono
  }
};

// Helper function per normalizzare la location
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

// @desc    Get meals within a certain radius for the map (OTIMIZZATA)
// @route   GET /api/meals/map?lat=45.46&lng=9.18&radius=50
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

    console.log(`🗺️ [MealController] Ricerca pasti per mappa: lat=${latitude}, lng=${longitude}, radius=${radiusKm}km`);

    const radiusInRad = radiusKm / 6371;

    const baseQuery = {
      mealType: mealType,
      status: { $in: status.split(',') },
      'location.coordinates': { $exists: true, $ne: null }
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

    console.log(`✅ [MealController] Trovati ${meals.length} pasti nel raggio di ${radiusKm}km`);

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
      },
      performance: {
        queryType: 'geospatial',
        radiusKm,
        resultsCount: mealsWithDistance.length
      }
    });

  } catch (error) {
    console.error('❌ [MealController] Errore in getMealsForMap:', error);
    return next(new ErrorResponse('Errore nella ricerca geospaziale', 500));
  }
});

// @desc    Get geospatial statistics for meals
// @route   GET /api/meals/geostats?lat=45.46&lng=9.18&radius=50
// @access  Public
exports.getMealsGeoStats = asyncHandler(async (req, res, next) => {
  try {
    const { lat, lng, radius = 50 } = req.query;

    if (!lat || !lng) {
      return next(new ErrorResponse('Coordinate richieste: lat, lng', 400));
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    if (!validateCoordinates(latitude, longitude)) {
      return next(new ErrorResponse('Coordinate non valide', 400));
    }

    if (!validateRadius(radiusKm)) {
      return next(new ErrorResponse('Raggio non valido', 400));
    }

    console.log(`📊 [MealController] Statistiche geospaziali: lat=${latitude}, lng=${longitude}, radius=${radiusKm}km`);

    const radiusInRad = radiusKm / 6371;

    const stats = await Meal.aggregate([
      {
        $match: {
          mealType: 'physical',
          'location.coordinates': {
            $geoWithin: {
              $centerSphere: [[longitude, latitude], radiusInRad]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalMeals: { $sum: 1 },
          upcomingMeals: {
            $sum: {
              $cond: [
                { $gte: ['$date', new Date()] },
                1,
                0
              ]
            }
          },
          ongoingMeals: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lte: ['$date', new Date()] },
                    { $gte: [{ $add: ['$date', { $multiply: ['$duration', 60000] }] }, new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          },
          avgParticipants: { $avg: { $size: '$participants' } },
          maxParticipants: { $max: { $size: '$participants' } },
          mealTypes: { $addToSet: '$mealType' },
          hosts: { $addToSet: '$host' }
        }
      }
    ]);

    const result = stats[0] || {
      totalMeals: 0,
      upcomingMeals: 0,
      ongoingMeals: 0,
      avgParticipants: 0,
      maxParticipants: 0,
      mealTypes: [],
      hosts: []
    };

    const area = Math.PI * radiusKm * radiusKm;
    const density = result.totalMeals / area;

    res.status(200).json({
      success: true,
      data: {
        ...result,
        searchArea: {
          center: { lat: latitude, lng: longitude },
          radius: radiusKm,
          areaKm2: Math.round(area * 100) / 100
        },
        density: {
          mealsPerKm2: Math.round(density * 1000) / 1000,
          mealsPer100Km2: Math.round(density * 100 * 100) / 100
        },
        performance: {
          queryType: 'geospatial_aggregation',
          radiusKm,
          resultsCount: result.totalMeals
        }
      }
    });

  } catch (error) {
    console.error('❌ [MealController] Errore in getMealsGeoStats:', error);
    return next(new ErrorResponse('Errore nelle statistiche geospaziali', 500));
  }
});

// @desc    Advanced geospatial search with multiple filters
// @route   GET /api/meals/search/advanced?lat=45.46&lng=9.18&radius=50&mealType=physical&date=2024-01-01&maxDistance=25
// @access  Public
exports.advancedGeospatialSearch = asyncHandler(async (req, res, next) => {
  try {
    const { 
      lat, lng, radius = 50, 
      mealType = 'physical', 
      status = 'upcoming',
      date,
      maxDistance,
      minParticipants,
      maxParticipants,
      hostId,
      tags
    } = req.query;

    if (!lat || !lng) {
      return next(new ErrorResponse('Coordinate richieste: lat, lng', 400));
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    if (!validateCoordinates(latitude, longitude)) {
      return next(new ErrorResponse('Coordinate non valide', 400));
    }

    if (!validateRadius(radiusKm)) {
      return next(new ErrorResponse('Raggio non valido', 400));
    }

    console.log(`🔍 [MealController] Ricerca avanzata: lat=${latitude}, lng=${longitude}, radius=${radiusKm}km`);

    const radiusInRad = radiusKm / 6371;

    let geoQuery = {
      mealType: mealType,
      status: { $in: status.split(',') },
      'location.coordinates': {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusInRad]
        }
      }
    };

    if (date) {
      const targetDate = new Date(date);
      if (!isNaN(targetDate.getTime())) {
        geoQuery.date = {
          $gte: targetDate,
          $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        };
      }
    }

    if (minParticipants || maxParticipants) {
      geoQuery.participants = {};
      if (minParticipants) geoQuery.participants.$gte = parseInt(minParticipants);
      if (maxParticipants) geoQuery.participants.$lte = parseInt(maxParticipants);
    }

    if (hostId) {
      geoQuery.host = hostId;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      geoQuery.tags = { $in: tagArray };
    }

    const meals = await Meal.find(geoQuery)
      .select('_id title description date duration mealType location host maxParticipants participants status tags')
      .populate('host', 'nickname profileImage')
      .lean()
      .exec();

    console.log(`✅ [MealController] Ricerca avanzata completata: ${meals.length} risultati`);

    let mealsWithDistance = meals.map(meal => {
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

    if (maxDistance) {
      const maxDist = parseFloat(maxDistance);
      if (!isNaN(maxDist)) {
        mealsWithDistance = mealsWithDistance.filter(meal => meal.distance <= maxDist);
        console.log(`📍 [MealController] Filtrati per distanza max ${maxDist}km: ${mealsWithDistance.length} risultati`);
      }
    }

    mealsWithDistance.sort((a, b) => {
      const distDiff = (a.distance || 0) - (b.distance || 0);
      if (distDiff !== 0) return distDiff;
      return new Date(a.date) - new Date(b.date);
    });

    res.status(200).json({
      success: true,
      count: mealsWithDistance.length,
      data: mealsWithDistance
    });

  } catch (error) {
    console.error('❌ [MealController] Errore in advancedGeospatialSearch:', error);
    return next(new ErrorResponse('Errore nella ricerca avanzata geospaziale', 500));
  }
});

// NUOVA FUNZIONE HELPER PER COSTRUIRE LA QUERY
const buildGetMealsQuery = async (queryParams, user) => {
  const { status, mealType, near } = queryParams;
  const statusFilter = status ? status.split(',') : ['upcoming'];

  // 1. Query di base
  let query = { status: { $in: statusFilter } };
  
  // 2. Aggiungi filtro per tipo di pasto
  if (mealType) {
    query.mealType = mealType;
  }

  // 3. Aggiungi filtro geospaziale (se richiesto)
  if (near) {
    try {
      const [lat, lng] = near.split(',').map(coord => parseFloat(coord.trim()));
      
      if (validateCoordinates(lat, lng)) { // Usiamo la nostra funzione dalla cassetta degli attrezzi!
        const defaultRadius = 50; // Raggio di ricerca predefinito di 50km
        const radiusInRad = defaultRadius / 6371;
        
        query.mealType = 'physical'; // I pasti "vicini" possono essere solo fisici
        query['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusInRad]
          }
        };
        console.log(`[Query Builder] Filtro geospaziale applicato: lat=${lat}, lng=${lng}, radius=${defaultRadius}km`);
      }
    } catch (error) {
      console.error('⚠️ [Query Builder] Formato coordinate "near" non valido:', near);
    }
  }

  // 4. Aggiungi filtro per escludere utenti bloccati
  if (user) {
    const currentUser = await User.findById(user.id).select('blockedUsers');
    const usersWhoBlockedMe = await User.find({ blockedUsers: user.id }).select('_id');
    const usersWhoBlockedMeIds = usersWhoBlockedMe.map(u => u._id);
    const excludedIds = [...currentUser.blockedUsers, ...usersWhoBlockedMeIds];
    
    if (excludedIds.length > 0) {
      query.host = { $nin: excludedIds };
    }
  }

  return query;
};

// GET /api/meals --- VERSIONE RIFATTORIZZATA ---
exports.getMeals = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // 1. Usa il "costruttore" per preparare la query
  const query = await buildGetMealsQuery(req.query, req.user);

  // 2. Esegui la query sul database per ottenere i pasti e il conteggio totale
  const [meals, total] = await Promise.all([
    Meal.find(query)
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .populate('host', 'nickname profileImage')
      .lean(), // lean() per performance migliori!
    Meal.countDocuments(query)
  ]);

  // 3. Arricchisci i dati (es. calcolo dello stato virtuale)
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
    
    // Normalizziamo anche la location qui
    const normalizedMeal = normalizeMealLocation(meal);

    return { ...normalizedMeal, virtualStatus };
  });

  // 4. Invia la risposta
  res.status(200).json({
    success: true,
    count: meals.length,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    },
    data: mealsWithVirtualStatus
  });
});

// GET /api/meals/history
exports.getMealHistory = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user.id);
  const usersWhoBlockedMe = await User.find({ blockedUsers: req.user.id }).select('_id');
  const usersWhoBlockedMeIds = usersWhoBlockedMe.map(user => user._id);
  const excludedIds = [...currentUser.blockedUsers, ...usersWhoBlockedMeIds];

  const meals = await Meal.find({ 
      participants: req.user.id,
      status: { $in: ['completed', 'cancelled'] },
      host: { $nin: excludedIds }
  })
  .sort({ date: -1 })
  .populate('host', 'nickname profileImage');

  res.status(200).json({ 
    success: true, 
    data: meals
  });
});

// GET /api/meals/:id
exports.getMeal = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id)
    .populate('host participants', 'nickname profileImage')
    .populate('chatId', 'name participants');
  if (!meal) return next(new ErrorResponse(`Pasto non trovato`, 404));
  
  const normalizedMeal = normalizeMealLocation(meal);
  
  // Normalizza chatId: se è popolato come oggetto, estrai solo l'ID come stringa
  if (normalizedMeal.chatId && typeof normalizedMeal.chatId === 'object' && normalizedMeal.chatId !== null) {
    normalizedMeal.chatId = normalizedMeal.chatId._id ? normalizedMeal.chatId._id.toString() : String(normalizedMeal.chatId);
    console.log('🔧 [getMeal] chatId normalizzato da oggetto a stringa:', normalizedMeal.chatId);
  }
  
  res.status(200).json({ success: true, data: normalizedMeal });
});


// ==========================================================================================
// --- FUNZIONE createMeal RIFATTORIZZATA ---
// Ora è snella, pulita e delega il lavoro pesante a un servizio specializzato.
// ==========================================================================================
exports.createMeal = asyncHandler(async (req, res, next) => {
  // 1. Il controller prepara solo gli "ingredienti"
  console.log('[Controller] Ricevuta richiesta di creazione pasto.');
  console.log('🔍 [CreateMeal] === ANALISI RICHIESTA ===');
  console.log('🔍 [CreateMeal] req.file:', req.file);
  console.log('🔍 [CreateMeal] req.files:', req.files);
  console.log('🔍 [CreateMeal] req.body keys:', Object.keys(req.body));
  console.log('🔍 [CreateMeal] Content-Type:', req.headers['content-type']);
  console.log('🔍 [CreateMeal] Content-Length:', req.headers['content-length']);
  console.log('🔍 [CreateMeal] req.body completo:', req.body);
  
  const sanitizedBody = sanitizeMealData(req.body);
  const mealData = { ...sanitizedBody };

  // 🔍 DEBUG: Log del file se presente
  if (req.file) {
    console.log('📷 [CreateMeal] === IMMAGINE RICEVUTA ===');
    console.log('📷 [CreateMeal] Immagine ricevuta:', req.file.path);
    console.log('📷 [CreateMeal] req.file completo:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      destination: req.file.destination,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    });
    console.log('📷 [CreateMeal] === FINE ANALISI IMMAGINE ===');
  } else {
    console.log('❌ [CreateMeal] === NESSUNA IMMAGINE RICEVUTA ===');
    console.log('❌ [CreateMeal] req.file è undefined/null');
    console.log('❌ [CreateMeal] Possibili cause:');
    console.log('❌ [CreateMeal] 1. Frontend non sta inviando il file');
    console.log('❌ [CreateMeal] 2. Nome del campo non corrisponde ("image")');
    console.log('❌ [CreateMeal] 3. Middleware multer non configurato correttamente');
    console.log('❌ [CreateMeal] === FINE ANALISI PROBLEMA ===');
  }
  
  // Normalizza i dati numerici che potrebbero arrivare come stringhe dal form
  if (typeof mealData.duration === 'string') mealData.duration = parseInt(mealData.duration, 10);
  if (typeof mealData.maxParticipants === 'string') mealData.maxParticipants = parseInt(mealData.maxParticipants, 10);
  if (typeof mealData.isPublic === 'string') mealData.isPublic = mealData.isPublic === 'true';
  if (typeof mealData.date === 'string') {
    try { mealData.date = new Date(mealData.date); } catch (_) {}
  }

  // Gestione della location
  if (req.body.location) {
    try {
      const parsedLocation = JSON.parse(req.body.location);
      if (parsedLocation && typeof parsedLocation === 'object') {
        mealData.location = {
          address: parsedLocation.address || parsedLocation.formattedAddress || parsedLocation.label || '',
          coordinates: parsedLocation.coordinates || undefined
        };
      } else {
        mealData.location = { address: String(req.body.location) };
      }
    } catch (error) {
      mealData.location = { address: String(req.body.location) };
    }
  }

  // 2. Il controller chiama l'esperto (il servizio) per fare il lavoro pesante
  try {
    // ⚠️ IMPORTANTE: Passare req.file come terzo argomento per l'upload dell'immagine
    const meal = await mealCreationService.createFullMeal(
      mealData,  // Dati del form sanitizzati
      req.user,  // Utente loggato
      req.file   // File caricato (immagine del pasto)
    );

    // 🔍 DEBUG: Verifica che imageUrl sia stato salvato correttamente
    console.log('🔍 [CreateMeal] Pasto creato con ID:', meal._id);
    console.log('🔍 [CreateMeal] imageUrl salvato nel DB:', meal.imageUrl);
    console.log('🔍 [CreateMeal] mealData.imageUrl originale:', mealData.imageUrl);

    // Popoliamo i dati dell'host prima di inviare la risposta al client
    const populatedMeal = await Meal.findById(meal._id).populate('host', 'nickname profileImage');
    
    // 🔍 DEBUG: Verifica anche dopo il populate
    console.log('🔍 [CreateMeal] Dopo populate - imageUrl:', populatedMeal.imageUrl);
    
    // 📱 Invia notifiche push per nuovo pasto creato
    await sendMealNotifications(meal, 'new_meal_nearby');
    
    // 3. Il controller invia la risposta di successo
    res.status(201).json({ success: true, data: populatedMeal });
    console.log('[Controller] Risposta di successo inviata.');

  } catch (error) {
    // Se il servizio fallisce, il controller lo sa e passa l'errore al gestore generale
    console.error('❌ [Controller] Il servizio di creazione pasto ha fallito:', error);
    
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors || {}).map(e => e.message);
        return next(new ErrorResponse(messages.join(' | '), 400));
    }
    
    return next(new ErrorResponse('Errore interno nella creazione del pasto.', 500));
  }
});


// @desc    Update a meal (partial updates allowed)
// @route   PATCH /api/meals/:id
// @access  Private
exports.updateMeal = asyncHandler(async (req, res, next) => {
  let meal = await Meal.findById(req.params.id);

  if (!meal) {
    return next(
      new ErrorResponse(`Pasto non trovato con id ${req.params.id}`, 404)
    );
  }

  if (meal.host.toString() !== req.user.id) {
    return next(
      new ErrorResponse(
        `Utente ${req.user.id} non autorizzato a modificare questo pasto`,
        401
      )
    );
  }

  const sanitizedBody = sanitizeMealData(req.body);
  const updates = { ...sanitizedBody };

  if (req.file) {
    updates.imageUrl = `/uploads/meal-images/${req.file.filename}`;
    console.log('📷 [UpdateMeal] Immagine aggiornata:', req.file.path);
  }

  if (updates.location) {
    try {
      const parsedLocation = JSON.parse(updates.location);
      if (parsedLocation && typeof parsedLocation === 'object') {
        updates.location = {
          address: parsedLocation.address || parsedLocation.formattedAddress || parsedLocation.label || '',
          coordinates: parsedLocation.coordinates || undefined
        };
      } else {
        updates.location = String(updates.location);
      }
    } catch (error) {
      updates.location = String(updates.location);
    }
  }

  meal = await Meal.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate('host', 'nickname profileImage');

  // 📱 Esempio: Invia notifica se il pasto è stato cancellato
  if (updates.status === 'cancelled') {
    await sendMealNotifications(meal, 'meal_cancelled');
  }

  const normalizedMeal = normalizeMealLocation(meal);
  res.status(200).json({ success: true, data: normalizedMeal });
});

// DELETE /api/meals/:id (Cancella pasto)
exports.deleteMeal = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id);
  if (!meal) return next(new ErrorResponse(`Pasto non trovato`, 404));
  if (meal.host.toString() !== req.user.id) return next(new ErrorResponse(`Non autorizzato`, 403));
  
  const mealEndTime = new Date(meal.date.getTime() + (meal.duration || 0) * 60000);
  if (meal.status === 'completed' || meal.status === 'cancelled' || new Date() > mealEndTime) {
    return next(new ErrorResponse('Non puoi eliminare un pasto già terminato o cancellato.', 403));
  }

  await Meal.findByIdAndDelete(req.params.id); // Il middleware pre-remove in Meal.js gestirà la pulizia
  res.status(200).json({ success: true, data: {} });
});

// 🕐 GET /api/meals/status/stats - Statistiche status pasti in tempo reale
exports.getMealStatusStats = asyncHandler(async (req, res, next) => {
  try {
    const stats = await mealStatusService.getMealStatusStats();
    
    if (stats.success) {
      res.status(200).json({
        success: true,
        data: stats
      });
    } else {
      return next(new ErrorResponse('Errore nel calcolo delle statistiche', 500));
    }
  } catch (error) {
    return next(new ErrorResponse('Errore interno del server', 500));
  }
});

// 🕐 POST /api/meals/:id/sync-status - Sincronizza status di un pasto specifico
exports.syncMealStatus = asyncHandler(async (req, res, next) => {
  try {
    const result = await mealStatusService.syncMealStatus(req.params.id);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result
      });
    } else {
      return next(new ErrorResponse(result.error || 'Errore nella sincronizzazione', 400));
    }
  } catch (error) {
    return next(new ErrorResponse('Errore interno del server', 500));
  }
});

/**
 * @desc    Unisciti a un pasto
 * @route   POST /api/meals/:id/participants
 */
exports.joinMeal = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id).populate('host', 'nickname');
  if (!meal) { return next(new ErrorResponse(`Pasto non trovato`, 404)); }
  if (meal.status !== 'upcoming') {
    return next(new ErrorResponse('Non è più possibile iscriversi a questo pasto', 400));
  }
  if (meal.participants.length >= meal.maxParticipants) {
    return next(new ErrorResponse('Questo pasto è al completo', 400));
  }
  if (meal.host.toString() === req.user.id) {
    return next(new ErrorResponse('Sei l\'host di questo pasto', 400));
  }
  if (meal.participants.some(p => p.toString() === req.user.id)) {
    return next(new ErrorResponse('Sei già iscritto a questo pasto', 400));
  }
  
  await meal.addParticipant(req.user.id);
  
  // 💬 Aggiungi l'utente anche alla Chat collegata
  if (meal.chatId) {
    await Chat.findByIdAndUpdate(meal.chatId, { 
      $addToSet: { participants: req.user.id } 
    });
    console.log(`✅ [joinMeal] Utente ${req.user.id} aggiunto alla chat ${meal.chatId}`);
  }
  
  // 📱 Notifica Socket.IO all'host
  notificationService.sendNotification(meal.host, 'participant_joined', `${req.user.nickname} si è unito al tuo pasto "${meal.title}".`, { mealId: meal._id });
  
  // 📱 Notifica push all'host (se ha FCM token)
  const host = await User.findById(meal.host);
  if (host?.fcmToken) {
    await notificationService.sendPushNotification(
      host.fcmToken,
      '👥 Nuovo partecipante!',
      `${req.user.nickname} si è unito al tuo TableTalk®: ${meal.title}`,
      {
        mealId: meal._id.toString(),
        type: 'new_participant',
        participantName: req.user.nickname,
        mealTitle: meal.title
      }
    );
  }
  
  const participant = await User.findById(req.user.id);
  if (participant?.settings?.notifications?.email) {
    try {
      await sendEmail.sendMealRegistrationEmail(
        participant.email,
        participant.nickname || participant.name,
        {
          title: meal.title,
          date: meal.date,
          hostName: meal.host.nickname || 'Host'
        }
      );
    } catch (err) {
      console.error('Errore invio email conferma iscrizione:', err.message);
    }
  }
  
  const updatedMeal = await Meal.findById(meal._id)
    .populate('host', 'nickname profileImage')
    .populate('participants', 'nickname profileImage');

  res.status(200).json({ 
    success: true, 
    message: 'Ti sei unito al pasto con successo',
    data: updatedMeal
  });
});

/**
 * @desc    Lascia un pasto
 * @route   DELETE /api/meals/:id/participants
 */
exports.leaveMeal = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id);
  if (!meal) { return next(new ErrorResponse(`Pasto non trovato`, 404)); }
  
  if (meal.status === 'completed' || meal.status === 'cancelled') {
    return next(new ErrorResponse('Non puoi abbandonare un pasto già concluso o annullato', 400));
  }
  
  if (meal.host.toString() === req.user.id) {
    return next(new ErrorResponse('L\'host non può lasciare il proprio pasto', 400));
  }

  await meal.removeParticipant(req.user.id);

  notificationService.sendNotification(
    meal.host, 
    'participant_left', 
    `${req.user.nickname} ha lasciato il tuo pasto "${meal.title}".`, 
    { mealId: meal._id }
  );
  
  const updatedMeal = await Meal.findById(meal._id)
    .populate('host', 'nickname profileImage')
    .populate('participants', 'nickname profileImage');

  res.status(200).json({ 
      success: true, 
      message: 'Hai lasciato il pasto con successo',
      data: updatedMeal
  });
});

/**
 * @desc    Cerca pasti tramite una stringa di ricerca
 * @route   GET /api/meals/search?q=parolachiave
 * @access  Public
 */
exports.searchMeals = asyncHandler(async (req, res, next) => {
  const searchTerm = req.query.q;

  if (!searchTerm) {
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  const query = {
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { language: { $regex: searchTerm, $options: 'i' } },
      { topics: { $regex: searchTerm, $options: 'i' } }
    ]
  };

  const meals = await Meal.find(query)
    .populate('host', 'nickname profileImage')
    .sort({ date: -1 });

  res.status(200).json({
    success: true,
    count: meals.length,
    data: meals,
  });
});

// GET /api/meals/user/all?status=upcoming,ongoing,completed,cancelled
exports.getUserMeals = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const statusFilter = req.query.status ? req.query.status.split(',') : ['upcoming', 'ongoing', 'completed', 'cancelled'];
  const meals = await Meal.find({
    status: { $in: statusFilter },
    $or: [
      { host: userId },
      { participants: userId }
    ]
  })
  .sort({ date: -1 })
  .populate('host', 'nickname profileImage')
  .populate('participants', 'nickname profileImage');
  res.status(200).json({ success: true, count: meals.length, data: meals });
});

/**
 * @desc    Ottiene o crea il link per la videochiamata di un pasto
 * @route   GET /api/meals/:id/stream
 * @access  Private (solo per i partecipanti)
 */
exports.getVideoCallUrl = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id).populate('participants');

  if (!meal) {
    return next(new ErrorResponse('Pasto non trovato', 404));
  }
  
  const isParticipant = meal.participants.some(p => p._id.equals(req.user._id));
  const isHost = meal.host.equals(req.user._id);

  if (!isParticipant && !isHost) {
    return next(new ErrorResponse('Non sei autorizzato ad accedere a questa videochiamata', 403));
  }

  if (!meal.videoCallLink) {
    const roomName = `TableTalk-${meal._id}-${uuidv4()}`;
    meal.videoCallLink = `https://meet.jit.si/${roomName}`;
    await meal.save();
  }

  res.status(200).json({
    success: true,
    data: {
      videoCallLink: meal.videoCallLink
    }
  });
});