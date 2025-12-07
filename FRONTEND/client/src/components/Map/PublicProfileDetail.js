import React from 'react';
import { Accordion, Badge } from 'react-bootstrap';
import BlockUserMenu from '../common/BlockUserMenu';

const PublicProfileDetail = ({ user, onInvite, onBack }) => {
  if (!user) return null;

          // Filtra le partecipazioni recenti (esclude TableTalk® organizzati)
  const participatedMeals = (user.joinedMeals || []).filter(
    joinedMeal => !(user.createdMeals || []).some(createdMeal => createdMeal._id === joinedMeal._id)
  );

  return (
    <div>
      <button onClick={onBack}>← Torna alla lista</button>
      <div style={{ textAlign: 'center', padding: '20px 0', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0 }}>
          <BlockUserMenu userId={user._id} reportedUser={user} />
        </div>
        <img
          src={user.profileImage ? `/uploads/profile-images/${user.profileImage}` : '/default-avatar.jpg'}
          alt={user.nickname}
          style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }}
        />
        <h3>{user.nickname || user.name}</h3>
        <p>{user.bio || 'Nessuna biografia.'}</p>
        {/* Dati pubblici aggiuntivi */}
        {user.gender && <div>Genere: <strong>{user.gender}</strong></div>}
        {user.age && <div>Età: <strong>{user.age}</strong></div>}
        {user.location && <div>Località: <strong>{user.location}</strong></div>}
        {user.languages && user.languages.length > 0 && (
          <div>Lingue: {user.languages.map(lang => <Badge key={lang} pill bg="success" style={{ marginRight: 4 }}>{lang}</Badge>)}</div>
        )}
        {user.preferredCuisine && <div>Cucina preferita: <Badge pill bg="warning" text="dark">{user.preferredCuisine}</Badge></div>}
        {user.interests && user.interests.length > 0 && (
          <div>Interessi: {user.interests.map(interest => <Badge key={interest} pill bg="info" style={{ marginRight: 4 }}>{interest}</Badge>)}</div>
        )}
      </div>
              {/* Accordion per TableTalk® organizzati e partecipazioni */}
      <Accordion>
        <Accordion.Item eventKey="0">
          <Accordion.Header>TableTalk Organizzati ({user.createdMeals?.length || 0})</Accordion.Header>
          <Accordion.Body>
            {user.createdMeals && user.createdMeals.length > 0 ? (
              <ul>
                {user.createdMeals.map(meal => (
                  <li key={meal._id}>
                    <span style={{ fontWeight: 500 }}>{meal.title}</span>
                    <span style={{ marginLeft: 8, color: '#888' }}>{meal.date ? new Date(meal.date).toLocaleDateString('it-IT') : ''}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted small">Nessun TableTalk organizzato.</p>}
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="1">
          <Accordion.Header>Partecipazioni Recenti ({participatedMeals.length})</Accordion.Header>
          <Accordion.Body>
            {participatedMeals.length > 0 ? (
              <ul>
                {participatedMeals.map(meal => (
                  <li key={meal._id}>
                    <span style={{ fontWeight: 500 }}>{meal.title}</span>
                    <span style={{ marginLeft: 8, color: '#888' }}>{meal.date ? new Date(meal.date).toLocaleDateString('it-IT') : ''}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted small">Nessuna partecipazione recente.</p>}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
      <button onClick={onInvite} style={{ width: '100%', padding: '10px', marginTop: 16 }}>
        Invita a un TableTalk 🍽️
      </button>
    </div>
  );
};

export default PublicProfileDetail;