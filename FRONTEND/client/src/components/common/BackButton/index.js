// File: src/components/common/BackButton/index.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import styles from './BackButton.module.css';

const BackButton = ({ className = '' }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <button onClick={handleBack} className={`${styles.backButton} ${className}`}>
      <FaArrowLeft style={{ marginRight: 8 }} />
      Torna indietro
    </button>
  );
};

export default BackButton;