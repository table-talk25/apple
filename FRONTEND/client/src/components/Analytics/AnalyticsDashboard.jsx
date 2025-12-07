import React, { useState, useEffect } from 'react';

const AnalyticsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/analytics/dashboard?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        margin: '20px'
      }}>
        <div style={{ fontSize: '18px', color: '#FF6B35', marginBottom: '10px' }}>
          📊 Caricamento analytics...
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Analisi dei dati in corso...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#fff5f5',
        borderRadius: '8px',
        margin: '20px',
        border: '1px solid #fed7d7'
      }}>
        <div style={{ fontSize: '18px', color: '#e53e3e', marginBottom: '10px' }}>
          ❌ Errore nel caricamento
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          {error}
        </div>
        <button
          onClick={loadAnalytics}
          style={{
            padding: '8px 16px',
            backgroundColor: '#FF6B35',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Riprova
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2 style={{ 
          margin: '0 0 20px 0', 
          color: '#FF6B35',
          fontSize: '28px',
          fontWeight: 'bold'
        }}>
          📊 Analytics Dashboard
        </h2>
        
        {/* Time Range Selector */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            marginBottom: '10px',
            color: '#333'
          }}>
            Periodo di analisi:
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { key: 'day', label: 'Oggi' },
              { key: 'week', label: 'Settimana' },
              { key: 'month', label: 'Mese' }
            ].map(range => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: timeRange === range.key ? '#FF6B35' : '#f0f0f0',
                  color: timeRange === range.key ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && stats.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {stats.map(stat => (
            <div key={stat.event} style={{
              padding: '25px',
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <h3 style={{ 
                margin: '0 0 15px 0', 
                color: '#FF6B35',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                {formatEventName(stat.event)}
              </h3>
              <div style={{ 
                fontSize: '36px', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: '#2d3748'
              }}>
                {stat.count.toLocaleString()}
              </div>
              <div style={{ 
                color: '#666', 
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                👥 {stat.uniqueUsers} utenti unici
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📈</div>
          <h3 style={{ color: '#666', marginBottom: '10px' }}>
            Nessun dato disponibile
          </h3>
          <p style={{ color: '#999', fontSize: '14px' }}>
            Non ci sono ancora dati per il periodo selezionato.
          </p>
        </div>
      )}

      {/* Summary Stats */}
      {stats && stats.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginTop: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 15px 0', 
            color: '#FF6B35',
            fontSize: '20px'
          }}>
            📋 Riepilogo
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d3748' }}>
                {stats.reduce((sum, stat) => sum + stat.count, 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Eventi Totali</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d3748' }}>
                {stats.length}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Tipi di Eventi</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d3748' }}>
                {Math.max(...stats.map(stat => stat.uniqueUsers))}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Max Utenti Unici</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const formatEventName = (event) => {
  const eventMap = {
    'meal_created': '🍽️ Pasti Creati',
    'user_joined': '👥 Utenti Uniti',
    'meal_completed': '✅ Pasti Completati',
    'app_opened': '📱 Aperture App',
    'search_performed': '🔍 Ricerche Effettuate',
    'message_sent': '💬 Messaggi Inviati',
    'meal_viewed': '👀 Pasti Visualizzati',
    'user_registered': '📝 Nuovi Utenti',
    'meal_joined': '🤝 Partecipazioni',
    'meal_cancelled': '❌ Pasti Cancellati',
    'profile_updated': '👤 Profili Aggiornati',
    'location_shared': '📍 Posizioni Condivise'
  };
  return eventMap[event] || event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default AnalyticsDashboard;
