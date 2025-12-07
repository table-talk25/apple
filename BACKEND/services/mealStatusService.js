const Meal = require('../models/Meal');

/**
 * 🕐 SERVIZIO STATUS PASTI
 * Gestisce aggiornamenti di status in tempo reale e sincronizzazione
 */

/**
 * 🔄 Sincronizza lo status di tutti i pasti attivi
 * @returns {Promise<Object>} Risultato della sincronizzazione
 */
const syncAllMealStatuses = async () => {
  try {
    console.log('🔄 [MealStatusService] Inizio sincronizzazione status pasti...');
    
    // Trova tutti i pasti non cancellati
    const meals = await Meal.find({ 
      status: { $ne: 'cancelled' } 
    }).select('_id title date duration status');
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const meal of meals) {
      try {
        // Calcola lo status virtuale
        const now = new Date();
        const startTime = meal.date;
        const endTime = new Date(startTime.getTime() + (meal.duration || 60) * 60 * 1000);
        
        let virtualStatus = meal.status;
        
        if (now < startTime) {
          virtualStatus = 'upcoming';
        } else if (now >= startTime && now < endTime) {
          virtualStatus = 'ongoing';
        } else {
          virtualStatus = 'completed';
        }
        
        // Aggiorna solo se necessario
        if (virtualStatus !== meal.status) {
          await Meal.findByIdAndUpdate(meal._id, { 
            status: virtualStatus,
            lastStatusUpdate: new Date()
          });
          
          updatedCount++;
          console.log(`🔄 [MealStatusService] Status aggiornato: ${meal.title} (${meal.status} -> ${virtualStatus})`);
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ [MealStatusService] Errore aggiornamento pasto ${meal._id}:`, error);
      }
    }
    
    console.log(`✅ [MealStatusService] Sincronizzazione completata: ${updatedCount} aggiornati, ${skippedCount} saltati`);
    
    return {
      success: true,
      updated: updatedCount,
      skipped: skippedCount,
      total: meals.length
    };
    
  } catch (error) {
    console.error('❌ [MealStatusService] Errore sincronizzazione generale:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 🕐 Sincronizza lo status di un pasto specifico
 * @param {string} mealId - ID del pasto da sincronizzare
 * @returns {Promise<Object>} Risultato della sincronizzazione
 */
const syncMealStatus = async (mealId) => {
  try {
    const meal = await Meal.findById(mealId);
    if (!meal) {
      return { success: false, error: 'Pasto non trovato' };
    }
    
    if (meal.status === 'cancelled') {
      return { success: true, message: 'Pasto cancellato, status non modificabile' };
    }
    
    // Calcola lo status virtuale
    const now = new Date();
    const startTime = meal.date;
    const endTime = new Date(startTime.getTime() + (meal.duration || 60) * 60 * 1000);
    
    let virtualStatus = meal.status;
    
    if (now < startTime) {
      virtualStatus = 'upcoming';
    } else if (now >= startTime && now < endTime) {
      virtualStatus = 'ongoing';
    } else {
      virtualStatus = 'completed';
    }
    
    // Aggiorna solo se necessario
    if (virtualStatus !== meal.status) {
      const updatedMeal = await Meal.findByIdAndUpdate(mealId, { 
        status: virtualStatus,
        lastStatusUpdate: new Date()
      }, { new: true });
      
      console.log(`🔄 [MealStatusService] Status pasto ${meal.title} aggiornato: ${meal.status} -> ${virtualStatus}`);
      
      return {
        success: true,
        mealId: meal._id,
        oldStatus: meal.status,
        newStatus: virtualStatus,
        updatedMeal
      };
    } else {
      return {
        success: true,
        message: 'Status già aggiornato',
        mealId: meal._id,
        status: meal.status
      };
    }
    
  } catch (error) {
    console.error(`❌ [MealStatusService] Errore sincronizzazione pasto ${mealId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 🕐 Ottieni pasti che necessitano aggiornamento status
 * @returns {Promise<Array>} Array di pasti da aggiornare
 */
const getMealsNeedingStatusUpdate = async () => {
  try {
    const now = new Date();
    
    // Trova pasti che potrebbero necessitare aggiornamento
    const meals = await Meal.find({
      status: { $ne: 'cancelled' },
      $or: [
        // Pasti che dovrebbero essere 'ongoing'
        {
          status: 'upcoming',
          date: { $lte: now }
        },
        // Pasti che dovrebbero essere 'completed'
        {
          status: { $in: ['upcoming', 'ongoing'] },
          $expr: {
            $lte: [
              { $add: ['$date', { $multiply: ['$duration', 60000] }] },
              now
            ]
          }
        }
      ]
    }).select('_id title date duration status');
    
    return meals;
    
  } catch (error) {
    console.error('❌ [MealStatusService] Errore ricerca pasti da aggiornare:', error);
    return [];
  }
};

/**
 * 🕐 Calcola statistiche status pasti
 * @returns {Promise<Object>} Statistiche sui status
 */
const getMealStatusStats = async () => {
  try {
    const now = new Date();
    
    // Aggregazione per status
    const statusStats = await Meal.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Calcola status virtuali per statistiche precise
    const allMeals = await Meal.find({ status: { $ne: 'cancelled' } })
      .select('date duration status');
    
    let virtualUpcoming = 0;
    let virtualOngoing = 0;
    let virtualCompleted = 0;
    
    allMeals.forEach(meal => {
      const startTime = meal.date;
      const endTime = new Date(startTime.getTime() + (meal.duration || 60) * 60 * 1000);
      
      if (now < startTime) {
        virtualUpcoming++;
      } else if (now >= startTime && now < endTime) {
        virtualOngoing++;
      } else {
        virtualCompleted++;
      }
    });
    
    return {
      success: true,
      stored: statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      virtual: {
        upcoming: virtualUpcoming,
        ongoing: virtualOngoing,
        completed: virtualCompleted
      },
      timestamp: now
    };
    
  } catch (error) {
    console.error('❌ [MealStatusService] Errore calcolo statistiche:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 🕐 Inizializza il servizio di status
 * @returns {Promise<Object>} Risultato inizializzazione
 */
const initializeStatusService = async () => {
  try {
    console.log('🚀 [MealStatusService] Inizializzazione servizio status pasti...');
    
    // Prima sincronizzazione
    const initialSync = await syncAllMealStatuses();
    
    console.log('✅ [MealStatusService] Servizio inizializzato con successo');
    
    return {
      success: true,
      message: 'Servizio status pasti inizializzato',
      initialSync
    };
    
  } catch (error) {
    console.error('❌ [MealStatusService] Errore inizializzazione:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  syncAllMealStatuses,
  syncMealStatus,
  getMealsNeedingStatusUpdate,
  getMealStatusStats,
  initializeStatusService
};
