import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/apiService';
import { getMealCoverImageUrl } from '../../constants/mealConstants';

const AIRecommendations = ({ userLocation, onMealSelect, showTitle = true }) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userLocation && user) {
      loadAIRecommendations();
    }
  }, [userLocation, user]);

  const loadAIRecommendations = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data } = await apiClient.get('/ai/recommendations', {
        params: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          limit: 4
        },
        suppressErrorAlert: true,
        timeout: 60000 // Timeout più lungo per questa richiesta (può richiedere più tempo)
      });
      setRecommendations(data?.recommendations || data?.data || []);
      
    } catch (error) {
      console.error('❌ [AIRecommendations] Error:', error);
      setError('');
    } finally {
      setLoading(false);
    }
  };

  const handleMealClick = async (meal) => {
    try {
      // USA L'ENDPOINT DEDICATO AL TRACKING (più pulito)
      await apiClient.post('/ai/interaction', { // Assicurati che la rotta nel backend corrisponda
        mealId: meal._id,
        interactionType: 'viewed',
        mealData: {
          cuisineType: meal.cuisineType,
          price: meal.estimatedCost
        }
      }, { suppressErrorAlert: true });

      if (onMealSelect) {
        onMealSelect(meal);
      }
    } catch (error) {
      console.error('❌ Failed to track interaction:', error);
      if (onMealSelect) onMealSelect(meal);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px 15px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '16px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #FF6B35',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '12px'
          }} />
          <span style={{ color: '#666', fontSize: '16px' }}>
            L'AI sta cercando i migliori TableTalk® per te...
          </span>
        </div>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes shimmer {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    // Non mostrare nulla se non ci sono raccomandazioni
    return null;
  }

  return (
    <div style={{ margin: '25px 0' }}>
      
      {/* 🎯 HEADER ELEGANTE E MODERNO */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
        padding: '0 15px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: '0 4px 16px rgba(255, 107, 53, 0.25)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <span style={{ 
              position: 'relative', 
              zIndex: 2,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}>🤖</span>
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
              animation: 'shimmer 3s infinite'
            }} />
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '700',
              color: '#1a1a1a',
              letterSpacing: '-0.5px',
              lineHeight: '1.2'
            }}>
              Raccomandazioni AI
            </h3>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: '#666',
              fontWeight: '400',
              lineHeight: '1.4'
            }}>
              TableTalk® selezionati personalmente per te
            </p>
          </div>
        </div>
        
        <button
          onClick={loadAIRecommendations}
          disabled={loading}
          style={{
            padding: '10px 18px',
            backgroundColor: '#fff',
            border: '1.5px solid #e8e8e8',
            borderRadius: '12px',
            fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: '#666',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: loading ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
              e.currentTarget.style.borderColor = '#FF6B35';
              e.currentTarget.style.color = '#FF6B35';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#fff';
              e.currentTarget.style.borderColor = '#e8e8e8';
              e.currentTarget.style.color = '#666';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <span>🔄</span>
          <span>Aggiorna</span>
        </button>
      </div>

      {/* 🎴 CARDS GRID MODERNE CON ANIMAZIONI */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        padding: '0 15px'
      }}>
        
        {recommendations.slice(0, 4).map((meal, index) => (
          <div
            key={meal._id}
            onClick={() => handleMealClick(meal)}
            style={{
              backgroundColor: '#fff',
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid #f0f0f0',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              willChange: 'transform'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
              e.currentTarget.style.borderColor = '#FF6B35';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
              e.currentTarget.style.borderColor = '#f0f0f0';
            }}
          >
            
            {/* 🏷️ AI BADGE */}
            {index === 0 && (
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                zIndex: 3,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#FF6B35',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)'
              }}>
                ⭐ TOP MATCH
              </div>
            )}
            
            {/* 📊 COMPATIBILITY BADGE MIGLIORATO */}
            <div style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              zIndex: 3,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
              backdropFilter: 'blur(10px)',
              color: '#FF6B35',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <span style={{ fontSize: '14px' }}>✨</span>
              <span>{Math.round(meal.aiScore || meal.aiCompatibility || 85)}%</span>
            </div>

            {/* 🖼️ IMAGE SECTION ELEGANTE */}
            <div style={{
              height: '180px',
              background: meal.imageUrl || meal.image
                ? `linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.4)), url(${getMealCoverImageUrl(meal.imageUrl || meal.image)})` 
                : 'linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FF8A65 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden'
            }}>
              {/* Overlay gradient per migliore leggibilità */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '60%',
                background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
                pointerEvents: 'none'
              }} />
              
              {!meal.imageUrl && !meal.image && (
                <div style={{
                  fontSize: '56px',
                  opacity: 0.95,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}>
                  🍽️
                </div>
              )}
            </div>

            {/* 📝 CONTENT SECTION */}
            <div style={{ padding: '16px' }}>
              
              {/* Title & AI Reason */}
              <h4 style={{
                margin: '0 0 6px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1a1a1a',
                lineHeight: '1.3',
                height: '40px',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {meal.title}
              </h4>
              
              <p style={{
                margin: '0 0 12px 0',
                fontSize: '12px',
                color: '#FF6B35',
                fontWeight: '500',
                fontStyle: 'italic'
              }}>
                🤖 {meal.aiReason || 'Perfetto per i tuoi gusti'}
              </p>
              
              {/* Location & Distance */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '13px',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  marginRight: '8px'
                }}>
                  📍 {meal.location?.name || 'Ristorante'}
                </span>
                
                {meal.distanceKm && (
                  <span style={{
                    fontSize: '11px',
                    color: '#999',
                    backgroundColor: '#f8f9fa',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    flexShrink: 0
                  }}>
                    {meal.distanceKm.toFixed(1)}km
                  </span>
                )}
              </div>
              
              {/* Date & Time */}
              <div style={{
                fontSize: '13px',
                color: '#666',
                marginBottom: '10px'
              }}>
                ⏰ {new Date(meal.scheduledAt).toLocaleDateString('it-IT', {
                  month: 'short',
                  day: 'numeric'
                })} • {new Date(meal.scheduledAt).toLocaleTimeString('it-IT', {
                  hour: '2-digit', 
                  minute:'2-digit'
                })}
              </div>

              {/* Bottom Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    👥 {meal.participants?.length || 0}/{meal.maxParticipants || 8}
                  </span>
                  
                  {meal.estimatedCost && (
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#1a1a1a'
                    }}>
                      €{meal.estimatedCost}
                    </span>
                  )}
                </div>
                
                <div style={{
                  padding: '6px 12px',
                  backgroundColor: '#FF6B35',
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  Partecipa →
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 🔄 MORE SUGGESTIONS */}
      {recommendations.length > 0 && (
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          paddingTop: '16px'
        }}>
          <button
            onClick={loadAIRecommendations}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #e0e0e0',
              borderRadius: '25px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f8f9fa';
              e.target.style.borderColor = '#ccc';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.borderColor = '#e0e0e0';
            }}
          >
            🔄 Altri suggerimenti AI
          </button>
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;