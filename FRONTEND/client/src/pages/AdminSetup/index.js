import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const AdminSetup = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nickname: '',
    setupKey: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuthData } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post('/api/auth/setup-first-admin', formData);
      
      // Salva i dati di autenticazione
      setAuthData({
        token: response.data.token,
        user: response.data.user
      });
      
      toast.success('Account admin configurato con successo!');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Errore durante la configurazione dell\'admin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.minHScreen}>
      <div className={styles.maxWmd}>
        <div>
          <h2 className={styles.mt6}>
            Configura il primo amministratore
          </h2>
          <p className={styles.mt2}>
            Questa operazione può essere eseguita solo una volta
          </p>
        </div>
        <form className={styles.mt8} onSubmit={handleSubmit}>
          <div className={styles.roundedMd}>
            <div>
              <label htmlFor="email" className={styles.block}>Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={styles.appearanceNone}
                placeholder="Email amministratore"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className={styles.block}>Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={styles.appearanceNone}
                placeholder="Password sicura"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="nickname" className={styles.block}>Nickname</label>
              <input
                id="nickname"
                name="nickname"
                type="text"
                required
                className={styles.appearanceNone}
                placeholder="Nickname"
                value={formData.nickname}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="setupKey" className={styles.block}>Chiave di setup</label>
              <input
                id="setupKey"
                name="setupKey"
                type="password"
                required
                className={styles.appearanceNone}
                placeholder="Chiave segreta di setup"
                value={formData.setupKey}
                onChange={handleChange}
              />
              <p className={styles.mt1}>La chiave di setup è definita nel file .env del server</p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className={styles.group}
              disabled={isLoading}
            >
              {isLoading ? 'Configurazione in corso...' : 'Configura Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSetup;