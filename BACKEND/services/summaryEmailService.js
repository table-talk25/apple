// File: BACKEND/services/summaryEmailService.js
// 📧 SERVIZIO PER EMAIL DI RIEPILOGO
// 
// Questo servizio gestisce l'invio di email di riepilogo personalizzate:
// - Riepilogo settimanale con statistiche e attività
// - Riepilogo mensile con achievement e confronti
// - Generazione contenuti personalizzati per ogni utente

const User = require('../models/User');
const Meal = require('../models/Meal');
const Chat = require('../models/Chat');
const sendEmail = require('../utils/sendEmail');
const path = require('path');
const fs = require('fs').promises;

class SummaryEmailService {
  constructor() {
    this.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.ENABLE_WEEKLY_SUMMARY = process.env.ENABLE_WEEKLY_SUMMARY !== 'false';
    this.ENABLE_MONTHLY_SUMMARY = process.env.ENABLE_MONTHLY_SUMMARY !== 'false';
    this.WEEKLY_SUMMARY_DAY = process.env.WEEKLY_SUMMARY_DAY || 'monday'; // monday, tuesday, etc.
    this.MONTHLY_SUMMARY_DAY = process.env.MONTHLY_SUMMARY_DAY || 1; // 1-31
    this.WEEKLY_SUMMARY_HOUR = process.env.WEEKLY_SUMMARY_HOUR || 9; // 0-23
    this.MONTHLY_SUMMARY_HOUR = process.env.MONTHLY_SUMMARY_HOUR || 10; // 0-23
  }

  /**
   * 📊 Genera e invia riepilogo settimanale per un utente
   * @param {string} userId - ID dell'utente
   * @param {Date} weekStart - Inizio della settimana
   * @param {Date} weekEnd - Fine della settimana
   * @returns {Object} Risultato dell'operazione
   */
  async sendWeeklySummary(userId, weekStart, weekEnd) {
    try {
      console.log(`📧 [SummaryEmail] Generazione riepilogo settimanale per utente: ${userId}`);
      
      // Trova l'utente
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`Utente non trovato: ${userId}`);
      }

      // Verifica preferenze email
      if (!this.shouldSendSummaryEmail(user, 'weekly')) {
        console.log(`📧 [SummaryEmail] Utente ${userId} ha disabilitato i riepiloghi settimanali`);
        return {
          success: false,
          message: 'Utente ha disabilitato i riepiloghi settimanali',
          code: 'EMAILS_DISABLED'
        };
      }

      // Genera i dati del riepilogo
      const summaryData = await this.generateWeeklySummaryData(user, weekStart, weekEnd);
      
      // Invia l'email
      const emailResult = await this.sendWeeklySummaryEmail(user.email, summaryData);
      
      if (emailResult.success) {
        console.log(`✅ [SummaryEmail] Riepilogo settimanale inviato a: ${user.email}`);
        
        // Aggiorna statistiche utente
        await this.updateUserSummaryStats(user, 'weekly', weekEnd);
        
        return {
          success: true,
          message: 'Riepilogo settimanale inviato con successo',
          email: user.email,
          userId: userId,
          summaryData: summaryData
        };
      } else {
        throw new Error(`Errore nell'invio email: ${emailResult.message}`);
      }

    } catch (error) {
      console.error(`❌ [SummaryEmail] Errore nel riepilogo settimanale per ${userId}:`, error);
      return {
        success: false,
        message: 'Errore nella generazione riepilogo settimanale',
        error: error.message
      };
    }
  }

  /**
   * 📊 Genera e invia riepilogo mensile per un utente
   * @param {string} userId - ID dell'utente
   * @param {Date} monthStart - Inizio del mese
   * @param {Date} monthEnd - Fine del mese
   * @returns {Object} Risultato dell'operazione
   */
  async sendMonthlySummary(userId, monthStart, monthEnd) {
    try {
      console.log(`📧 [SummaryEmail] Generazione riepilogo mensile per utente: ${userId}`);
      
      // Trova l'utente
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`Utente non trovato: ${userId}`);
      }

      // Verifica preferenze email
      if (!this.shouldSendSummaryEmail(user, 'monthly')) {
        console.log(`📧 [SummaryEmail] Utente ${userId} ha disabilitato i riepiloghi mensili`);
        return {
          success: false,
          message: 'Utente ha disabilitato i riepiloghi mensili',
          code: 'EMAILS_DISABLED'
        };
      }

      // Genera i dati del riepilogo
      const summaryData = await this.generateMonthlySummaryData(user, monthStart, monthEnd);
      
      // Invia l'email
      const emailResult = await this.sendMonthlySummaryEmail(user.email, summaryData);
      
      if (emailResult.success) {
        console.log(`✅ [SummaryEmail] Riepilogo mensile inviato a: ${user.email}`);
        
        // Aggiorna statistiche utente
        await this.updateUserSummaryStats(user, 'monthly', monthEnd);
        
        return {
          success: true,
          message: 'Riepilogo mensile inviato con successo',
          email: user.email,
          userId: userId,
          summaryData: summaryData
        };
      } else {
        throw new Error(`Errore nell'invio email: ${emailResult.message}`);
      }

    } catch (error) {
      console.error(`❌ [SummaryEmail] Errore nel riepilogo mensile per ${userId}:`, error);
      return {
        success: false,
        message: 'Errore nella generazione riepilogo mensile',
        error: error.message
      };
    }
  }

  /**
   * 🔍 Genera i dati per il riepilogo settimanale
   * @param {Object} user - Utente
   * @param {Date} weekStart - Inizio settimana
   * @param {Date} weekEnd - Fine settimana
   * @returns {Object} Dati del riepilogo
   */
  async generateWeeklySummaryData(user, weekStart, weekEnd) {
    const weekStartStr = weekStart.toISOString();
    const weekEndStr = weekEnd.toISOString();
    
    // Statistiche base
    const stats = await this.getWeeklyStats(user._id, weekStartStr, weekEndStr);
    
    // Pasti recenti
    const recentMeals = await this.getRecentMeals(user._id, weekStartStr, weekEndStr, 5);
    
    // Eventi imminenti
    const upcomingMeals = await this.getUpcomingMeals(user._id, 7, 3);
    
    // Fatti divertenti
    const funFacts = this.generateFunFacts(stats, user);
    
    return {
      name: user.name,
      surname: user.surname,
      email: user.email,
      periodStart: this.formatDate(weekStart),
      periodEnd: this.formatDate(weekEnd),
      stats: stats,
      recentMeals: recentMeals,
      upcomingMeals: upcomingMeals,
      funFacts: funFacts,
      appUrl: this.FRONTEND_URL,
      currentYear: new Date().getFullYear()
    };
  }

  /**
   * 🔍 Genera i dati per il riepilogo mensile
   * @param {Object} user - Utente
   * @param {Date} monthStart - Inizio mese
   * @param {Date} monthEnd - Fine mese
   * @returns {Object} Dati del riepilogo
   */
  async generateMonthlySummaryData(user, monthStart, monthEnd) {
    const monthStartStr = monthStart.toISOString();
    const monthEndStr = monthEnd.toISOString();
    const previousMonthStart = new Date(monthStart);
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
    const previousMonthEnd = new Date(monthStart);
    previousMonthEnd.setDate(previousMonthEnd.getDate() - 1);
    
    // Statistiche del mese corrente
    const currentStats = await this.getMonthlyStats(user._id, monthStartStr, monthEndStr);
    
    // Statistiche del mese precedente per confronto
    const previousStats = await this.getMonthlyStats(user._id, previousMonthStart.toISOString(), previousMonthEnd.toISOString());
    
    // Confronto tra mesi
    const comparison = this.compareMonthlyStats(currentStats, previousStats);
    
    // Top pasti del mese
    const topMeals = await this.getTopMeals(user._id, monthStartStr, monthEndStr, 5);
    
    // Achievement del mese
    const achievements = this.generateMonthlyAchievements(currentStats, user);
    
    // Crescita sociale
    const socialGrowth = await this.getSocialGrowth(user._id, monthStartStr, monthEndStr);
    
    // Fatti divertenti
    const funFacts = this.generateMonthlyFunFacts(currentStats, comparison, user);
    
    // Anteprima prossimo mese
    const upcomingEvents = await this.getUpcomingEventsPreview(user._id, 30);
    
    return {
      name: user.name,
      surname: user.surname,
      email: user.email,
      monthName: this.getMonthName(monthStart),
      year: monthStart.getFullYear(),
      previousMonthName: this.getMonthName(previousMonthStart),
      stats: currentStats,
      comparison: comparison,
      topMeals: topMeals,
      achievements: achievements,
      socialGrowth: socialGrowth,
      funFacts: funFacts,
      upcomingEvents: upcomingEvents,
      appUrl: this.FRONTEND_URL,
      currentYear: new Date().getFullYear()
    };
  }

  /**
   * 📊 Ottiene statistiche settimanali per un utente
   * @param {string} userId - ID utente
   * @param {string} weekStart - Inizio settimana ISO string
   * @param {string} weekEnd - Fine settimana ISO string
   * @returns {Object} Statistiche
   */
  async getWeeklyStats(userId, weekStart, weekEnd) {
    // Pasti partecipati
    const mealsParticipated = await Meal.countDocuments({
      participants: userId,
      date: { $gte: weekStart, $lte: weekEnd },
      status: { $in: ['completed', 'ongoing'] }
    });

    // Nuove connessioni (utenti conosciuti in pasti)
    const newConnections = await this.getNewConnectionsCount(userId, weekStart, weekEnd);

    // Pasti creati
    const mealsCreated = await Meal.countDocuments({
      host: userId,
      createdAt: { $gte: weekStart, $lte: weekEnd }
    });

    // Messaggi totali
    const totalMessages = await this.getMessageCount(userId, weekStart, weekEnd);

    // Inviti in attesa
    const pendingInvitations = await this.getPendingInvitationsCount(userId);

    return {
      mealsParticipated,
      newConnections,
      mealsCreated,
      totalMessages,
      pendingInvitations,
      pendingInvitations_plural: pendingInvitations !== 1
    };
  }

  /**
   * 📊 Ottiene statistiche mensili per un utente
   * @param {string} userId - ID utente
   * @param {string} monthStart - Inizio mese ISO string
   * @param {string} monthEnd - Fine mese ISO string
   * @returns {Object} Statistiche
   */
  async getMonthlyStats(userId, monthStart, monthEnd) {
    // Statistiche base
    const baseStats = await this.getWeeklyStats(userId, monthStart, monthEnd);
    
    // Achievement e milestone
    const achievements = await this.getAchievementsCount(userId, monthStart, monthEnd);
    
    // Nuovi follower
    const newFollowers = await this.getNewFollowersCount(userId, monthStart, monthEnd);
    
    // Visualizzazioni profilo
    const profileViews = await this.getProfileViewsCount(userId, monthStart, monthEnd);
    
    return {
      ...baseStats,
      achievements,
      newFollowers,
      profileViews
    };
  }

  /**
   * 🔄 Confronta statistiche tra due mesi
   * @param {Object} current - Statistiche mese corrente
   * @param {Object} previous - Statistiche mese precedente
   * @returns {Object} Confronto
   */
  compareMonthlyStats(current, previous) {
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const change = ((current - previous) / previous) * 100;
      return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
    };

    const isPositive = (current, previous) => current >= previous;

    return {
      mealsParticipated: current.mealsParticipated,
      mealsParticipatedChange: calculateChange(current.mealsParticipated, previous.mealsParticipated),
      mealsParticipatedChange_positive: isPositive(current.mealsParticipated, previous.mealsParticipated),
      
      newConnections: current.newConnections,
      newConnectionsChange: calculateChange(current.newConnections, previous.newConnections),
      newConnectionsChange_positive: isPositive(current.newConnections, previous.newConnections),
      
      totalMessages: current.totalMessages,
      totalMessagesChange: calculateChange(current.totalMessages, previous.totalMessages),
      totalMessagesChange_positive: isPositive(current.totalMessages, previous.totalMessages),
      
      mealsCreated: current.mealsCreated,
      mealsCreatedChange: calculateChange(current.mealsCreated, previous.mealsCreated),
      mealsCreatedChange_positive: isPositive(current.mealsCreated, previous.mealsCreated)
    };
  }

  /**
   * 🍽️ Ottiene pasti recenti per un utente
   * @param {string} userId - ID utente
   * @param {string} startDate - Data inizio ISO string
   * @param {string} endDate - Data fine ISO string
   * @param {number} limit - Numero massimo di pasti
   * @returns {Array} Lista pasti
   */
  async getRecentMeals(userId, startDate, endDate, limit = 5) {
    const meals = await Meal.find({
      participants: userId,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['completed', 'ongoing'] }
    })
    .populate('host', 'name surname')
    .populate('participants', 'name surname')
    .sort({ date: -1 })
    .limit(limit)
    .lean();

    return meals.map(meal => ({
      title: meal.title,
      date: meal.date,
      participantsCount: meal.participants.length,
      participantsCount_plural: meal.participants.length !== 1,
      location: meal.location,
      host: meal.host
    }));
  }

  /**
   * 📅 Ottiene eventi imminenti per un utente
   * @param {string} userId - ID utente
   * @param {number} daysAhead - Giorni in anticipo
   * @param {number} limit - Numero massimo di eventi
   * @returns {Array} Lista eventi
   */
  async getUpcomingMeals(userId, daysAhead = 7, limit = 3) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const meals = await Meal.find({
      participants: userId,
      date: { $gte: new Date(), $lte: futureDate },
      status: 'upcoming'
    })
    .select('title date location')
    .sort({ date: 1 })
    .limit(limit)
    .lean();

    return meals.map(meal => ({
      title: meal.title,
      date: meal.date,
      location: meal.location
    }));
  }

  /**
   * 🏆 Genera achievement per il mese
   * @param {Object} stats - Statistiche del mese
   * @param {Object} user - Utente
   * @returns {Array} Lista achievement
   */
  generateMonthlyAchievements(stats, user) {
    const achievements = [];
    
    // Achievement per pasti partecipati
    if (stats.mealsParticipated >= 10) {
      achievements.push({
        icon: '🍽️',
        description: 'Social Butterfly: Hai partecipato a 10+ pasti questo mese!'
      });
    } else if (stats.mealsParticipated >= 5) {
      achievements.push({
        icon: '🍴',
        description: 'Food Explorer: Hai partecipato a 5+ pasti questo mese!'
      });
    }
    
    // Achievement per nuove connessioni
    if (stats.newConnections >= 20) {
      achievements.push({
        icon: '👥',
        description: 'Network Master: Hai conosciuto 20+ nuove persone!'
      });
    } else if (stats.newConnections >= 10) {
      achievements.push({
        icon: '🤝',
        description: 'People Person: Hai conosciuto 10+ nuove persone!'
      });
    }
    
    // Achievement per pasti creati
    if (stats.mealsCreated >= 5) {
      achievements.push({
        icon: '🎯',
        description: 'Event Organizer: Hai creato 5+ pasti questo mese!'
      });
    }
    
    // Achievement per messaggi
    if (stats.totalMessages >= 100) {
      achievements.push({
        icon: '💬',
        description: 'Chat Champion: Hai scambiato 100+ messaggi!'
      });
    }
    
    // Achievement speciali
    if (stats.mealsParticipated >= 15 && stats.newConnections >= 15) {
      achievements.push({
        icon: '🌟',
        description: 'TableTalk Legend: Mese eccezionale per socialità e connessioni!'
      });
    }
    
    return achievements;
  }

  /**
   * 🎉 Genera fatti divertenti per la settimana
   * @param {Object} stats - Statistiche
   * @param {Object} user - Utente
   * @returns {Array} Lista fatti divertenti
   */
  generateFunFacts(stats, user) {
    const facts = [];
    
    if (stats.mealsParticipated > 0) {
      facts.push(`Hai partecipato a ${stats.mealsParticipated} pasto${stats.mealsParticipated !== 1 ? 'i' : ''} questa settimana!`);
    }
    
    if (stats.newConnections > 0) {
      facts.push(`Hai conosciuto ${stats.newConnections} nuova${stats.newConnections !== 1 ? 'e' : ''} persona${stats.newConnections !== 1 ? 'e' : ''}!`);
    }
    
    if (stats.totalMessages > 50) {
      facts.push('Sei stato molto attivo nelle chat questa settimana!');
    }
    
    if (stats.mealsCreated > 0) {
      facts.push(`Hai creato ${stats.mealsCreated} pasto${stats.mealsCreated !== 1 ? 'i' : ''} per la comunità!`);
    }
    
    // Fatti generici se non ci sono statistiche interessanti
    if (facts.length === 0) {
      facts.push('È il momento perfetto per creare il tuo primo pasto!');
      facts.push('La prossima settimana potrebbe essere quella giusta per nuove connessioni!');
    }
    
    return facts;
  }

  /**
   * 🎉 Genera fatti divertenti per il mese
   * @param {Object} stats - Statistiche del mese
   * @param {Object} comparison - Confronto con mese precedente
   * @param {Object} user - Utente
   * @returns {Array} Lista fatti divertenti
   */
  generateMonthlyFunFacts(stats, comparison, user) {
    const facts = [];
    
    // Fatti basati sulle statistiche
    if (stats.mealsParticipated >= 10) {
      facts.push(`Hai partecipato a ${stats.mealsParticipated} pasti questo mese - sei un vero social butterfly!`);
    }
    
    if (stats.newConnections >= 15) {
      facts.push(`Hai conosciuto ${stats.newConnections} nuove persone - la tua rete sociale sta crescendo!`);
    }
    
    // Fatti basati sui miglioramenti
    if (comparison.mealsParticipatedChange_positive) {
      facts.push('Hai partecipato a più pasti rispetto al mese scorso - continua così!');
    }
    
    if (comparison.newConnectionsChange_positive) {
      facts.push('Hai fatto più connessioni rispetto al mese scorso - la tua rete si sta espandendo!');
    }
    
    // Fatti speciali
    if (stats.achievements > 0) {
      facts.push(`Hai sbloccato ${stats.achievements} achievement questo mese!`);
    }
    
    if (stats.mealsCreated >= 3) {
      facts.push('Sei stato un organizzatore attivo questo mese - la comunità ti ringrazia!');
    }
    
    return facts;
  }

  /**
   * 📧 Invia email riepilogo settimanale
   * @param {string} email - Email destinatario
   * @param {Object} data - Dati per il template
   * @returns {Object} Risultato invio
   */
  async sendWeeklySummaryEmail(email, data) {
    try {
      const templatePath = path.join(__dirname, '../templates/email/weekly-summary.hbs');
      const templateContent = await fs.readFile(templatePath, 'utf8');
      
      const emailOptions = {
        to: email,
        subject: `📊 Il tuo riepilogo settimanale su TableTalk - ${data.periodStart} al ${data.periodEnd}`,
        html: templateContent,
        templateData: data
      };

      const result = await sendEmail(emailOptions);
      
      return {
        success: true,
        message: 'Email riepilogo settimanale inviata con successo',
        result: result
      };

    } catch (error) {
      console.error(`❌ [SummaryEmail] Errore template email settimanale:`, error);
      return {
        success: false,
        message: 'Errore nella preparazione template email settimanale',
        error: error.message
      };
    }
  }

  /**
   * 📧 Invia email riepilogo mensile
   * @param {string} email - Email destinatario
   * @param {Object} data - Dati per il template
   * @returns {Object} Risultato invio
   */
  async sendMonthlySummaryEmail(email, data) {
    try {
      const templatePath = path.join(__dirname, '../templates/email/monthly-summary.hbs');
      const templateContent = await fs.readFile(templatePath, 'utf8');
      
      const emailOptions = {
        to: email,
        subject: `🌟 Il tuo riepilogo mensile su TableTalk - ${data.monthName} ${data.year}`,
        html: templateContent,
        templateData: data
      };

      const result = await sendEmail(emailOptions);
      
      return {
        success: true,
        message: 'Email riepilogo mensile inviata con successo',
        result: result
      };

    } catch (error) {
      console.error(`❌ [SummaryEmail] Errore template email mensile:`, error);
      return {
        success: false,
        message: 'Errore nella preparazione template email mensile',
        error: error.message
      };
    }
  }

  /**
   * 🔍 Verifica se inviare email di riepilogo
   * @param {Object} user - Utente
   * @param {string} type - Tipo di riepilogo (weekly/monthly)
   * @returns {boolean} True se inviare
   */
  shouldSendSummaryEmail(user, type) {
    // Verifica preferenze utente
    if (user.settings?.notifications?.email?.summaryEmails === false) {
      return false;
    }
    
    // Verifica tipo specifico
    if (type === 'weekly' && user.settings?.notifications?.email?.weeklySummary === false) {
      return false;
    }
    
    if (type === 'monthly' && user.settings?.notifications?.email?.monthlySummary === false) {
      return false;
    }
    
    return true;
  }

  /**
   * 📊 Aggiorna statistiche riepilogo utente
   * @param {Object} user - Utente
   * @param {string} type - Tipo riepilogo
   * @param {Date} date - Data riepilogo
   */
  async updateUserSummaryStats(user, type, date) {
    try {
      const updateData = {};
      
      if (type === 'weekly') {
        updateData.lastWeeklySummary = date;
        updateData.weeklySummaryCount = (user.weeklySummaryCount || 0) + 1;
      } else if (type === 'monthly') {
        updateData.lastMonthlySummary = date;
        updateData.monthlySummaryCount = (user.monthlySummaryCount || 0) + 1;
      }
      
      await User.findByIdAndUpdate(user._id, updateData);
      
    } catch (error) {
      console.error(`❌ [SummaryEmail] Errore aggiornamento statistiche utente:`, error);
    }
  }

  // Funzioni helper
  formatDate(date) {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getMonthName(date) {
    return date.toLocaleDateString('it-IT', { month: 'long' });
  }

  async getNewConnectionsCount(userId, startDate, endDate) {
    // Implementazione semplificata - conta utenti unici nei pasti
    const meals = await Meal.find({
      participants: userId,
      date: { $gte: startDate, $lte: endDate }
    }).select('participants');
    
    const allParticipants = meals.flatMap(meal => meal.participants);
    const uniqueParticipants = new Set(allParticipants.map(p => p.toString()));
    uniqueParticipants.delete(userId.toString());
    
    return uniqueParticipants.size;
  }

  async getMessageCount(userId, startDate, endDate) {
    // Implementazione semplificata - conta messaggi nelle chat dell'utente
    const chats = await Chat.find({
      participants: userId
    }).select('_id');
    
    const chatIds = chats.map(chat => chat._id);
    
    // Nota: questa è una stima semplificata
    // In un'implementazione reale, dovresti contare i messaggi effettivi
    return Math.floor(Math.random() * 50) + 10; // Placeholder
  }

  async getPendingInvitationsCount(userId) {
    // Implementazione semplificata
    return Math.floor(Math.random() * 5); // Placeholder
  }

  async getAchievementsCount(userId, startDate, endDate) {
    // Implementazione semplificata
    return Math.floor(Math.random() * 3) + 1; // Placeholder
  }

  async getNewFollowersCount(userId, startDate, endDate) {
    // Implementazione semplificata
    return Math.floor(Math.random() * 10); // Placeholder
  }

  async getProfileViewsCount(userId, startDate, endDate) {
    // Implementazione semplificata
    return Math.floor(Math.random() * 50) + 20; // Placeholder
  }

  async getTopMeals(userId, startDate, endDate, limit) {
    // Implementazione semplificata
    const meals = await Meal.find({
      host: userId,
      createdAt: { $gte: startDate, $lte: endDate }
    })
    .select('title date participants location')
    .sort({ participants: -1 })
    .limit(limit)
    .lean();

    return meals.map((meal, index) => ({
      rank: index + 1,
      title: meal.title,
      date: meal.date,
      participantsCount: meal.participants.length,
      location: meal.location
    }));
  }

  async getSocialGrowth(userId, startDate, endDate) {
    // Implementazione semplificata
    return {
      followers: Math.floor(Math.random() * 100) + 50,
      profileViews: Math.floor(Math.random() * 200) + 100,
      connections: Math.floor(Math.random() * 150) + 75,
      reputation: Math.floor(Math.random() * 1000) + 500
    };
  }

  async getUpcomingEventsPreview(userId, daysAhead) {
    // Implementazione semplificata
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const upcomingMeals = await Meal.countDocuments({
      participants: userId,
      date: { $gte: new Date(), $lte: futureDate },
      status: 'upcoming'
    });
    
    return {
      count: upcomingMeals,
      invitations: Math.floor(Math.random() * 5)
    };
  }
}

// Esporta un'istanza singleton
const summaryEmailService = new SummaryEmailService();

// Log della configurazione all'avvio
console.log(`✅ [SummaryEmail] Servizio configurato:`);
console.log(`  - Riepilogo settimanale: ${summaryEmailService.ENABLE_WEEKLY_SUMMARY ? 'Abilitato' : 'Disabilitato'}`);
console.log(`  - Riepilogo mensile: ${summaryEmailService.ENABLE_MONTHLY_SUMMARY ? 'Abilitato' : 'Disabilitato'}`);
console.log(`  - Giorno settimanale: ${summaryEmailService.WEEKLY_SUMMARY_DAY}`);
console.log(`  - Giorno mensile: ${summaryEmailService.MONTHLY_SUMMARY_DAY}`);
console.log(`  - Ora settimanale: ${summaryEmailService.WEEKLY_SUMMARY_HOUR}:00`);
console.log(`  - Ora mensile: ${summaryEmailService.MONTHLY_SUMMARY_HOUR}:00`);

module.exports = summaryEmailService;
