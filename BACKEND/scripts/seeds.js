// File: BACKEND/scripts/seeds.js
// 🌱 SCRIPT DI SEEDING PER DATABASE PULITO
// 
// Questo script popola il database con dati realistici e puliti
// per permettere ai tester di utilizzare l'app senza trovarla vuota

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Meal = require('../models/Meal');
const Chat = require('../models/Chat');
// const Message = require('../models/Message'); // Modello non esistente

// Configurazione connessione MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TableTalk';

// Dati realistici per il seeding
const REALISTIC_DATA = {
  users: [
    {
      name: 'Marco',
      surname: 'Rossi',
      nickname: 'MarcoFood',
      email: 'marco.rossi@example.com',
      password: 'Password123!',
      bio: 'Appassionato di cucina italiana e di conoscere nuove persone. Amo organizzare cene a tema e scoprire nuovi ristoranti.',
      interests: ['cucina italiana', 'vino', 'cultura', 'viaggi'],
      location: {
        coordinates: [12.4964, 41.9028],
        address: 'Roma, Lazio, Italia'
      },
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      isEmailVerified: true,
      dateOfBirth: new Date('1990-01-01'), // Data di nascita obbligatoria
      settings: {
        notifications: {
          email: true, // Booleano semplice
          push: true,  // Booleano semplice
          pushPreferences: {
            meals: {
              invitations: true,
              joinRequests: true,
              mealUpdates: true,
              mealReminders: true,
              mealCancellations: true
            },
            chat: {
              newMessages: true,
              typingIndicators: false,
              readReceipts: false
            },
            social: {
              newFollowers: true,
              profileViews: false,
              friendRequests: true
            },
            system: {
              accountUpdates: true,
              securityAlerts: true,
              maintenance: true,
              updates: true
            },
            moderation: {
              reportUpdates: true,
              contentApprovals: true,
              policyChanges: true
            }
          },
          geolocation: {
            enabled: true,
            radius: 10,
            mealTypes: ['breakfast', 'lunch', 'dinner', 'aperitif'],
            maxDistance: 10
          }
        },
        privacy: {
          showLocationOnMap: false,
          showResidence: true,
          showPhone: false,
          showAge: true
        }
      }
    },
    {
      name: 'Sofia',
      surname: 'Bianchi',
      nickname: 'SofiaChef',
      email: 'sofia.bianchi@example.com',
      password: 'Password123!',
      bio: 'Chef professionista con passione per la pasticceria. Mi piace insegnare e condividere la mia esperienza culinaria.',
      interests: ['pasticceria', 'cucina francese', 'insegnamento', 'arte'],
      location: {
        coordinates: [9.1859, 45.4642],
        address: 'Milano, Lombardia, Italia'
      },
      profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      isEmailVerified: true,
      dateOfBirth: new Date('1988-05-15'), // Data di nascita obbligatoria
      settings: {
        notifications: {
          email: true, // Booleano semplice
          push: true,  // Booleano semplice
          pushPreferences: {
            meals: {
              invitations: true,
              joinRequests: true,
              mealUpdates: true,
              mealReminders: true,
              mealCancellations: true
            },
            chat: {
              newMessages: true,
              typingIndicators: false,
              readReceipts: false
            },
            social: {
              newFollowers: true,
              profileViews: false,
              friendRequests: true
            },
            system: {
              accountUpdates: true,
              securityAlerts: true,
              maintenance: true,
              updates: true
            },
            moderation: {
              reportUpdates: true,
              contentApprovals: true,
              policyChanges: true
            }
          },
          geolocation: {
            enabled: true,
            radius: 10,
            mealTypes: ['breakfast', 'lunch', 'dinner', 'aperitif'],
            maxDistance: 10
          }
        },
        privacy: {
          showLocationOnMap: false,
          showResidence: true,
          showPhone: false,
          showAge: true
        }
      }
    },
    {
      name: 'Luca',
      surname: 'Verdi',
      nickname: 'LucaTravel',
      email: 'luca.verdi@example.com',
      password: 'Password123!',
      bio: 'Viaggiatore e food blogger. Amo esplorare culture diverse attraverso il cibo e condividere le mie esperienze.',
      interests: ['viaggi', 'cucina internazionale', 'fotografia', 'scrittura'],
      location: {
        coordinates: [11.3426, 44.4949],
        address: 'Bologna, Emilia-Romagna, Italia'
      },
      profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      isEmailVerified: true,
      dateOfBirth: new Date('1992-08-22'), // Data di nascita obbligatoria
      settings: {
        notifications: {
          email: true, // Booleano semplice
          push: true,  // Booleano semplice
          pushPreferences: {
            meals: {
              invitations: true,
              joinRequests: true,
              mealUpdates: true,
              mealReminders: true,
              mealCancellations: true
            },
            chat: {
              newMessages: true,
              typingIndicators: false,
              readReceipts: false
            },
            social: {
              newFollowers: true,
              profileViews: false,
              friendRequests: true
            },
            system: {
              accountUpdates: true,
              securityAlerts: true,
              maintenance: true,
              updates: true
            },
            moderation: {
              reportUpdates: true,
              contentApprovals: true,
              policyChanges: true
            }
          },
          geolocation: {
            enabled: true,
            radius: 10,
            mealTypes: ['breakfast', 'lunch', 'dinner', 'aperitif'],
            maxDistance: 10
          }
        },
        privacy: {
          showLocationOnMap: false,
          showResidence: true,
          showPhone: false,
          showAge: true
        }
      }
    },
    {
      name: 'Elena',
      surname: 'Neri',
      nickname: 'ElenaWine',
      email: 'elena.neri@example.com',
      password: 'Password123!',
      bio: 'Sommelier e appassionata di enogastronomia. Organizzo degustazioni e cene di abbinamento vino-cibo.',
      interests: ['vino', 'enogastronomia', 'degustazioni', 'cultura del cibo'],
      location: {
        coordinates: [11.2558, 43.7696],
        address: 'Firenze, Toscana, Italia'
      },
      profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      isEmailVerified: true,
      dateOfBirth: new Date('1985-12-10'), // Data di nascita obbligatoria
      settings: {
        notifications: {
          email: true, // Booleano semplice
          push: true,  // Booleano semplice
          pushPreferences: {
            meals: {
              invitations: true,
              joinRequests: true,
              mealUpdates: true,
              mealReminders: true,
              mealCancellations: true
            },
            chat: {
              newMessages: true,
              typingIndicators: false,
              readReceipts: false
            },
            social: {
              newFollowers: true,
              profileViews: false,
              friendRequests: true
            },
            system: {
              accountUpdates: true,
              securityAlerts: true,
              maintenance: true,
              updates: true
            },
            moderation: {
              reportUpdates: true,
              contentApprovals: true,
              policyChanges: true
            }
          },
          geolocation: {
            enabled: true,
            radius: 10,
            mealTypes: ['breakfast', 'lunch', 'dinner', 'aperitif'],
            maxDistance: 10
          }
        },
        privacy: {
          showLocationOnMap: false,
          showResidence: true,
          showPhone: false,
          showAge: true
        }
      }
    },
    {
      name: 'Giuseppe',
      surname: 'Esposito',
      nickname: 'GiuseppePizza',
      email: 'giuseppe.esposito@example.com',
      password: 'Password123!',
      bio: 'Pizzaiolo napoletano DOC. La mia passione è tramandare l\'arte della vera pizza napoletana.',
      interests: ['pizza napoletana', 'tradizioni', 'cucina mediterranea', 'famiglia'],
      location: {
        coordinates: [14.2681, 40.8518],
        address: 'Napoli, Campania, Italia'
      },
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      isEmailVerified: true,
      dateOfBirth: new Date('1978-03-25'), // Data di nascita obbligatoria
      settings: {
        notifications: {
          email: true, // Booleano semplice
          push: true,  // Booleano semplice
          pushPreferences: {
            meals: {
              invitations: true,
              joinRequests: true,
              mealUpdates: true,
              mealReminders: true,
              mealCancellations: true
            },
            chat: {
              newMessages: true,
              typingIndicators: false,
              readReceipts: false
            },
            social: {
              newFollowers: true,
              profileViews: false,
              friendRequests: true
            },
            system: {
              accountUpdates: true,
              securityAlerts: true,
              maintenance: true,
              updates: true
            },
            moderation: {
              reportUpdates: true,
              contentApprovals: true,
              policyChanges: true
            }
          },
          geolocation: {
            enabled: true,
            radius: 10,
            mealTypes: ['breakfast', 'lunch', 'dinner', 'aperitif'],
            maxDistance: 10
          }
        },
        privacy: {
          showLocationOnMap: false,
          showResidence: true,
          showPhone: false,
          showAge: true
        }
      }
    }
  ],
  
  meals: [
    {
      title: 'Cena Tradizionale Romana',
      description: 'Una serata dedicata alla cucina tradizionale romana. Prepareremo insieme piatti come Cacio e Pepe, Saltimbocca alla Romana e Tiramisù. Perfetto per chi vuole imparare i segreti della cucina della capitale.',
      mealType: 'physical',
      type: 'dinner', // Campo obbligatorio
      language: 'Italiano', // Campo obbligatorio
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 giorni da oggi
      duration: 180, // 3 ore
      maxParticipants: 8,
      location: {
        coordinates: [12.4964, 41.9028],
        address: 'Roma, Lazio, Italia'
      },
      cuisine: 'italiana',
      dietaryRestrictions: ['vegetariano'],
      price: 25,
      coverImage: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop',
      status: 'upcoming',
      tags: ['cucina romana', 'tradizione', 'cena', 'social']
    },
    {
      title: 'Masterclass di Pasticceria Francese',
      description: 'Impara l\'arte della pasticceria francese con Sofia! Prepareremo insieme Croissant, Éclairs e Macarons. Tutti i livelli sono benvenuti, forniremo tutto il necessario.',
      mealType: 'physical',
      type: 'lunch', // Campo obbligatorio
      language: 'Italiano', // Campo obbligatorio
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 giorni da oggi
      duration: 180, // 3 ore (massimo consentito)
      maxParticipants: 6,
      location: {
        coordinates: [9.1859, 45.4642],
        address: 'Milano, Lombardia, Italia'
      },
      cuisine: 'francese',
      dietaryRestrictions: [],
      price: 45,
      coverImage: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=300&fit=crop',
      status: 'upcoming',
      tags: ['pasticceria', 'francese', 'masterclass', 'dolci']
    },
    {
      title: 'Viaggio Culinario in Asia',
      description: 'Un viaggio virtuale attraverso le cucine di Giappone, Corea e Thailandia. Cucineremo insieme piatti autentici e scopriremo le tecniche e gli ingredienti tipici.',
      mealType: 'virtual',
      type: 'dinner', // Campo obbligatorio
      language: 'Italiano', // Campo obbligatorio
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 giorni da oggi
      duration: 120, // 2 ore
      maxParticipants: 10,
      location: {
        coordinates: [11.3426, 44.4949],
        address: 'Bologna, Emilia-Romagna, Italia'
      },
      cuisine: 'asiatica',
      dietaryRestrictions: ['vegano', 'senza glutine'],
      price: 0,
      coverImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
      status: 'upcoming',
      tags: ['cucina asiatica', 'virtuale', 'cultura', 'tecnica']
    },
    {
      title: 'Degustazione Vini e Formaggi',
      description: 'Una serata raffinata di abbinamento vino-formaggio. Elena ci guiderà attraverso 5 abbinamenti perfetti, spiegando le caratteristiche e le sinergie tra vini e formaggi.',
      mealType: 'physical',
      type: 'aperitif', // Campo obbligatorio
      language: 'Italiano', // Campo obbligatorio
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 giorni da oggi
      duration: 150, // 2.5 ore
      maxParticipants: 10,
      location: {
        coordinates: [11.2558, 43.7696],
        address: 'Firenze, Toscana, Italia'
      },
      cuisine: 'italiana',
      dietaryRestrictions: ['vegetariano'],
      price: 35,
      coverImage: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop',
      status: 'upcoming',
      tags: ['vino', 'formaggi', 'degustazione', 'abbinamento']
    },
    {
      title: 'Pizza Napoletana Autentica',
      description: 'Impara i segreti della vera pizza napoletana con Giuseppe! Dalla preparazione dell\'impasto alla cottura nel forno a legna. Un\'esperienza unica per tutti gli amanti della pizza.',
      mealType: 'physical',
      type: 'dinner', // Campo obbligatorio
      language: 'Italiano', // Campo obbligatorio
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 giorni da oggi
      duration: 180, // 3 ore (massimo consentito)
      maxParticipants: 8,
      location: {
        coordinates: [14.2681, 40.8518],
        address: 'Napoli, Campania, Italia'
      },
      cuisine: 'italiana',
      dietaryRestrictions: ['vegetariano'],
      price: 30,
      coverImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
      status: 'upcoming',
      tags: ['pizza', 'napoletana', 'tradizione', 'forno a legna']
    }
  ],
  
  sampleMessages: [
    'Ciao! Sono molto interessato a partecipare al tuo evento. Posso portare qualcosa?',
    'Perfetto! Conto di essere presente. Che ingredienti dovrei portare?',
    'Grazie per l\'organizzazione, è stata una serata fantastica!',
    'Mi piacerebbe molto partecipare alla prossima edizione!',
    'Hai già provato questa ricetta? È davvero deliziosa!',
    'Grazie per aver condiviso la tua passione per la cucina!',
    'È stato un piacere conoscerti e cucinare insieme!',
    'Non vedo l\'ora di partecipare al prossimo evento!',
    'La tua cucina è sempre sorprendente!',
    'È stato un onore imparare da te!'
  ]
};

class DatabaseSeeder {
  constructor() {
    this.connection = null;
    this.createdUsers = [];
    this.createdMeals = [];
    this.createdChats = [];
    this.stats = {
      usersCreated: 0,
      mealsCreated: 0,
      chatsCreated: 0,
      messagesCreated: 0
    };
  }

  /**
   * 🔌 Connette al database
   */
  async connect() {
    try {
      console.log('🔌 [DatabaseSeeder] Connessione al database...');
      
      this.connection = await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      console.log('✅ [DatabaseSeeder] Connesso al database:', MONGODB_URI);
      return true;
    } catch (error) {
      console.error('❌ [DatabaseSeeder] Errore connessione:', error);
      return false;
    }
  }

  /**
   * 🚪 Disconnette dal database
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        console.log('✅ [DatabaseSeeder] Disconnesso dal database');
      }
    } catch (error) {
      console.error('❌ [DatabaseSeeder] Errore disconnessione:', error);
    }
  }

  /**
   * 🌱 Popola il database con dati realistici
   */
  async seedDatabase() {
    try {
      console.log('🌱 [DatabaseSeeder] Inizio popolamento database con dati realistici...');
      
      // 1. Crea utenti
      await this.createUsers();
      
      // 2. Crea pasti
      await this.createMeals();
      
      // 3. Crea chat e messaggi
      await this.createChatsAndMessages();
      
      // 4. Simula alcune iscrizioni ai pasti
      await this.simulateMealRegistrations();
      
      console.log('✅ [DatabaseSeeder] Popolamento completato con successo!');
      this.printStats();
      
    } catch (error) {
      console.error('❌ [DatabaseSeeder] Errore durante il popolamento:', error);
      throw error;
    }
  }

  /**
   * 👥 Crea utenti realistici
   */
  async createUsers() {
    try {
      console.log('👥 [DatabaseSeeder] Creazione utenti realistici...');
      
      for (const userData of REALISTIC_DATA.users) {
        // Verifica se l'utente esiste già
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          console.log(`⚠️ [DatabaseSeeder] Utente ${userData.email} già esistente, saltato`);
          this.createdUsers.push(existingUser);
          continue;
        }
        
        // Hash della password
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        // Crea l'utente
        const user = new User({
          ...userData,
          password: hashedPassword,
          createdAt: new Date(),
          lastLogin: new Date(),
          lastActivity: new Date()
        });
        
        await user.save();
        this.createdUsers.push(user);
        this.stats.usersCreated++;
        
        console.log(`✅ [DatabaseSeeder] Creato utente: ${user.name} ${user.surname} (${user.email})`);
      }
      
      console.log(`✅ [DatabaseSeeder] Creati ${this.stats.usersCreated} nuovi utenti`);
      
    } catch (error) {
      console.error('❌ [DatabaseSeeder] Errore creazione utenti:', error);
      throw error;
    }
  }

  /**
   * 🍽️ Crea pasti realistici
   */
  async createMeals() {
    try {
      console.log('🍽️ [DatabaseSeeder] Creazione pasti realistici...');
      
      for (const mealData of REALISTIC_DATA.meals) {
        // Trova un host casuale tra gli utenti creati
        const randomHost = this.createdUsers[Math.floor(Math.random() * this.createdUsers.length)];
        
        // Crea il pasto
        const meal = new Meal({
          ...mealData,
          host: randomHost._id,
          participants: [randomHost._id], // L'host è automaticamente partecipante
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await meal.save();
        this.createdMeals.push(meal);
        this.stats.mealsCreated++;
        
        console.log(`✅ [DatabaseSeeder] Creato pasto: ${meal.title} (Host: ${randomHost.name})`);
      }
      
      console.log(`✅ [DatabaseSeeder] Creati ${this.stats.mealsCreated} nuovi pasti`);
      
    } catch (error) {
      console.error('❌ [DatabaseSeeder] Errore creazione pasti:', error);
      throw error;
    }
  }

  /**
   * 💬 Crea chat e messaggi realistici
   */
  async createChatsAndMessages() {
    try {
      console.log('💬 [DatabaseSeeder] Creazione chat e messaggi realistici...');
      
      // Crea una chat generale per tutti gli utenti
      const generalChat = new Chat({
        name: 'Chat Generale TableTalk',
        type: 'group',
        participants: this.createdUsers.map(user => user._id),
        messages: [], // Inizializza array messaggi vuoto
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await generalChat.save();
      this.createdChats.push(generalChat);
      this.stats.chatsCreated++;
      
      // Aggiungi alcuni messaggi di benvenuto direttamente nella chat
      for (let i = 0; i < 5; i++) {
        const randomUser = this.createdUsers[Math.floor(Math.random() * this.createdUsers.length)];
        const randomMessage = REALISTIC_DATA.sampleMessages[Math.floor(Math.random() * REALISTIC_DATA.sampleMessages.length)];
        
        // Crea un messaggio semplice come oggetto
        const message = {
          content: randomMessage,
          sender: randomUser._id,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Ultimi 7 giorni
        };
        
        // Aggiungi il messaggio alla chat
        generalChat.messages.push(message);
        this.stats.messagesCreated++;
      }
      
      await generalChat.save();
      
      console.log(`✅ [DatabaseSeeder] Creata chat generale con ${this.stats.messagesCreated} messaggi`);
      
    } catch (error) {
      console.error('❌ [DatabaseSeeder] Errore creazione chat:', error);
      throw error;
    }
  }

  /**
   * 📝 Simula alcune iscrizioni ai pasti
   */
  async simulateMealRegistrations() {
    try {
      console.log('📝 [DatabaseSeeder] Simulazione iscrizioni ai pasti...');
      
      for (const meal of this.createdMeals) {
        // Aggiungi 2-4 partecipanti casuali (escludendo l'host)
        const availableUsers = this.createdUsers.filter(user => !user._id.equals(meal.host));
        const numParticipants = Math.min(Math.floor(Math.random() * 3) + 2, availableUsers.length);
        
        const selectedParticipants = [];
        for (let i = 0; i < numParticipants; i++) {
          const randomIndex = Math.floor(Math.random() * availableUsers.length);
          const selectedUser = availableUsers.splice(randomIndex, 1)[0];
          selectedParticipants.push(selectedUser._id);
        }
        
        // Aggiungi partecipanti al pasto
        meal.participants.push(...selectedParticipants);
        await meal.save();
        
        console.log(`✅ [DatabaseSeeder] Aggiunti ${selectedParticipants.length} partecipanti al pasto: ${meal.title}`);
      }
      
    } catch (error) {
      console.error('❌ [DatabaseSeeder] Errore simulazione iscrizioni:', error);
      throw error;
    }
  }

  /**
   * 📊 Stampa le statistiche del seeding
   */
  printStats() {
    console.log('\n📊 [DatabaseSeeder] STATISTICHE SEEDING COMPLETATO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👥 Utenti creati:      ${this.stats.usersCreated}`);
    console.log(`🍽️ Pasti creati:       ${this.stats.mealsCreated}`);
    console.log(`💬 Chat create:        ${this.stats.chatsCreated}`);
    console.log(`💬 Messaggi creati:    ${this.stats.messagesCreated}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const totalCreated = Object.values(this.stats).reduce((sum, count) => sum + count, 0);
    console.log(`🎯 TOTALE ELEMENTI CREATI: ${totalCreated}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🎉 [DatabaseSeeder] Database popolato con successo! I tester ora troveranno:');
    console.log('   • 5 utenti realistici con profili completi');
    console.log('   • 5 pasti interessanti (fisici e virtuali)');
    console.log('   • 1 chat generale con messaggi di esempio');
    console.log('   • Iscrizioni simulate ai pasti');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * 🔍 Mostra lo stato finale del database
   */
  async showFinalDatabaseStatus() {
    try {
      console.log('🔍 [DatabaseSeeder] STATO FINALE DEL DATABASE:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const userCount = await User.countDocuments();
      const mealCount = await Meal.countDocuments();
      const chatCount = await Chat.countDocuments();
      // const messageCount = await Message.countDocuments(); // Modello non esistente
      const messageCount = 0; // Placeholder
      
      console.log(`👥 Utenti totali:      ${userCount}`);
      console.log(`🍽️ Pasti totali:       ${mealCount}`);
      console.log(`💬 Chat totali:        ${chatCount}`);
      console.log(`💬 Messaggi totali:    ${messageCount}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
    } catch (error) {
      console.error('❌ [DatabaseSeeder] Errore nel recupero stato finale database:', error);
    }
  }
}

// Funzione principale per eseguire il seeding
async function main() {
  const seeder = new DatabaseSeeder();
  
  try {
    // Popola il database
    await seeder.seedDatabase();
    
    // Mostra stato finale
    await seeder.showFinalDatabaseStatus();
    
    console.log('🎉 [DatabaseSeeder] Database popolato e pronto per i tester!');
    
  } catch (error) {
    console.error('💥 [DatabaseSeeder] Errore fatale durante il seeding:', error);
    process.exit(1);
  } finally {
    await seeder.disconnect();
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  main();
}

module.exports = DatabaseSeeder;
