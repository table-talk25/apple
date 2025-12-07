import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Alert, Badge, ProgressBar, Table } from 'react-bootstrap';
import { FaGlobe, FaChartLine, FaExclamationTriangle, FaCheckCircle, FaClock } from 'react-icons/fa';
import { getLanguageStats, getTranslationPriority } from '../../services/analyticsService';
import styles from './AdminTranslationDashboard.module.css';

const AdminTranslationDashboard = () => {
  const [languageStats, setLanguageStats] = useState(null);
  const [translationPriority, setTranslationPriority] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, priorityData] = await Promise.all([
        getLanguageStats(),
        getTranslationPriority()
      ]);
      setLanguageStats(statsData.data);
      setTranslationPriority(priorityData.data);
    } catch (err) {
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'secondary';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <FaExclamationTriangle className="text-danger" />;
      case 'medium': return <FaClock className="text-warning" />;
      case 'low': return <FaCheckCircle className="text-success" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Caricamento...</span>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className={styles.dashboard}>
      <h1 className={styles.title}>
        <FaGlobe /> Dashboard Traduzioni
      </h1>

      {/* Statistiche Generali */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className={styles.statCard}>
            <Card.Body>
              <Card.Title>Utenti Totali</Card.Title>
              <Card.Text className={styles.statNumber}>
                {languageStats?.totalUsers || 0}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className={styles.statCard}>
            <Card.Body>
              <Card.Title>Con Lingue Configurate</Card.Title>
              <Card.Text className={styles.statNumber}>
                {languageStats?.usersWithLanguages || 0}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className={styles.statCard}>
            <Card.Body>
              <Card.Title>Senza Lingue</Card.Title>
              <Card.Text className={styles.statNumber}>
                {languageStats?.usersWithoutLanguages || 0}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Priorità Traduzioni */}
      <Card className="mb-4">
        <Card.Header>
          <h3><FaExclamationTriangle /> Priorità Traduzioni</h3>
        </Card.Header>
        <Card.Body>
          {translationPriority?.suggestions?.map((suggestion, index) => (
            <Alert key={index} variant={suggestion.type === 'immediate' ? 'danger' : 'warning'}>
              <strong>{suggestion.message}</strong>
              <br />
              <small>Impatto: {suggestion.impact}</small>
            </Alert>
          ))}
        </Card.Body>
      </Card>

      {/* Statistiche Lingue */}
      <Row>
        <Col lg={8}>
          <Card>
            <Card.Header>
              <h3><FaChartLine /> Uso delle Lingue</h3>
            </Card.Header>
            <Card.Body>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Lingua</th>
                    <th>Utenti</th>
                    <th>Percentuale</th>
                    <th>Priorità</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {languageStats?.languageStats?.map((stat) => {
                    const priority = translationPriority?.priorityReport?.find(
                      p => p.language === stat._id
                    );
                    const percentage = ((stat.count / languageStats.totalUsers) * 100).toFixed(1);
                    
                    return (
                      <tr key={stat._id}>
                        <td>
                          <strong>{stat._id.toUpperCase()}</strong>
                        </td>
                        <td>{stat.count}</td>
                        <td>
                          <ProgressBar 
                            now={percentage} 
                            label={`${percentage}%`}
                            variant={percentage > 20 ? 'success' : percentage > 10 ? 'warning' : 'danger'}
                          />
                        </td>
                        <td>
                          {priority && (
                            <Badge bg={getPriorityColor(priority.priority)}>
                              {getPriorityIcon(priority.priority)} {priority.priority}
                            </Badge>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary">
                            Dettagli
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {/* Raccomandazioni */}
          <Card>
            <Card.Header>
              <h4>Raccomandazioni</h4>
            </Card.Header>
            <Card.Body>
              {languageStats?.recommendations?.map((rec, index) => (
                <Alert key={index} variant={rec.priority === 'high' ? 'danger' : rec.priority === 'medium' ? 'warning' : 'info'}>
                  {rec.message}
                </Alert>
              ))}
            </Card.Body>
          </Card>

          {/* Lingue Emergenti */}
          <Card className="mt-3">
            <Card.Header>
              <h4>Lingue Emergenti (Ultimi 30 giorni)</h4>
            </Card.Header>
            <Card.Body>
              {languageStats?.recentLanguageStats?.map((stat) => (
                <div key={stat._id} className={styles.emergingLanguage}>
                  <strong>{stat._id.toUpperCase()}</strong>
                  <Badge bg="info">{stat.count} nuovi utenti</Badge>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminTranslationDashboard; 