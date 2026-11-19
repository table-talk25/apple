import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getProfileAge, getProfileCity } from '../../../utils/profileCompleteness';
import { Button } from '../../ui';
import styles from './PersonalInfo.module.css';

const buildInitialForm = (profileData) => ({
  nickname: profileData?.nickname || '',
  city: getProfileCity(profileData),
  bio: profileData?.bio || '',
  dateOfBirth: profileData?.dateOfBirth
    ? new Date(profileData.dateOfBirth).toISOString().split('T')[0]
    : '',
  gender: profileData?.gender || '',
  phone: profileData?.phone || '',
  showAge: profileData?.settings?.privacy?.showAge ?? true,
});

const PersonalInfo = ({
  profileData,
  onUpdate,
  isUpdating = false,
  isEditingExternal = false,
  focusField = null,
  onRequestEdit,
  onCloseEdit,
  isPublicView = false,
}) => {
  const { t } = useTranslation();
  const [internalEditing, setInternalEditing] = useState(false);
  const [formData, setFormData] = useState(() => buildInitialForm(profileData));

  const cityRef = useRef(null);
  const dobRef = useRef(null);
  const genderRef = useRef(null);
  const bioRef = useRef(null);

  const isControlled = typeof onRequestEdit === 'function';
  const isEditing = !isPublicView && (isControlled ? isEditingExternal : internalEditing);

  useEffect(() => {
    if (profileData) {
      setFormData(buildInitialForm(profileData));
    }
  }, [profileData]);

  useEffect(() => {
    if (!isEditing || !focusField) return;
    const refs = {
      city: cityRef,
      dateOfBirth: dobRef,
      gender: genderRef,
      bio: bioRef,
    };
    const targetRef = refs[focusField];
    const timer = setTimeout(() => {
      if (targetRef?.current && typeof targetRef.current.focus === 'function') {
        targetRef.current.focus();
      }
    }, 30);
    return () => clearTimeout(timer);
  }, [isEditing, focusField]);

  if (!profileData) return null;

  const cityValue = getProfileCity(profileData);
  const ageValue = getProfileAge(profileData);

  const getGenderLabel = (gender) => {
    if (!gender) return '';
    const map = {
      male: t('profile.personalInfo.male', 'Maschio'),
      female: t('profile.personalInfo.female', 'Femmina'),
      'non-binary': t('profile.personalInfo.nonBinary', 'Non binario'),
      other: t('profile.personalInfo.other', 'Altro'),
    };
    return map[gender] || gender;
  };

  const openEdit = (field = null) => {
    if (isPublicView) return;
    if (onRequestEdit) {
      onRequestEdit(field);
    } else {
      setInternalEditing(true);
    }
  };

  const closeEdit = () => {
    if (onCloseEdit) {
      onCloseEdit();
    } else {
      setInternalEditing(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setFormData(buildInitialForm(profileData));
    closeEdit();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isPublicView || !onUpdate) return;

    const trimmedCity = String(formData.city || '').trim();
    const existingCoords = profileData.location?.coordinates;
    const hasCoords = Array.isArray(existingCoords) && existingCoords.length === 2;

    const locationPayload = hasCoords
      ? {
          type: 'Point',
          coordinates: existingCoords,
          address: trimmedCity,
        }
      : {
          address: trimmedCity,
        };

    const existingSettings = profileData.settings || {};
    const existingPrivacy = existingSettings.privacy || {};

    const dataToUpdate = {
      nickname: String(formData.nickname || '').trim(),
      bio: String(formData.bio || '').trim(),
      gender: formData.gender || '',
      phone: String(formData.phone || '').trim(),
      location: locationPayload,
      residence: trimmedCity,
      settings: {
        ...existingSettings,
        privacy: {
          ...existingPrivacy,
          showAge: formData.showAge,
        },
      },
    };

    if (formData.dateOfBirth) {
      dataToUpdate.dateOfBirth = formData.dateOfBirth;
    }

    await onUpdate(dataToUpdate);
    closeEdit();
  };

  const genderLabel = getGenderLabel(profileData.gender);
  const bioValue = String(profileData.bio || '').trim();

  return (
    <section className={styles.pCard} data-testid="personal-info-card">
      <div className={styles.headingRow}>
        <h3>{t('profileUi.personalInfoTitle', 'Informazioni personali')}</h3>
      </div>

      {!isEditing ? (
        <div className={styles.rows}>
          <div className={styles.pRow}>
            <span className={styles.rowKey}>{t('profile.personalInfo.location', 'Posizione')}</span>
            {cityValue ? (
              <span className={styles.rowVal}>{cityValue}</span>
            ) : !isPublicView ? (
              <button
                type="button"
                className={styles.linklike}
                onClick={() => openEdit('city')}
                data-testid="prompt-add-city"
              >
                {t('profileUi.addCityPrompt', '＋ Aggiungi la tua città')}
              </button>
            ) : (
              <span className={styles.rowVal}>—</span>
            )}
          </div>

          <div className={styles.pRow}>
            <span className={styles.rowKey}>{t('profile.personalInfo.age', 'Età')}</span>
            {ageValue !== null ? (
              <span className={styles.rowVal}>{ageValue}</span>
            ) : !isPublicView ? (
              <button
                type="button"
                className={styles.linklike}
                onClick={() => openEdit('dateOfBirth')}
                data-testid="prompt-add-age"
              >
                {t('profileUi.addBirthDatePrompt', '＋ Aggiungi data di nascita')}
              </button>
            ) : (
              <span className={styles.rowVal}>—</span>
            )}
          </div>

          <div className={styles.pRow}>
            <span className={styles.rowKey}>{t('profile.personalInfo.gender', 'Genere')}</span>
            {genderLabel ? (
              <span className={styles.rowVal}>{genderLabel}</span>
            ) : !isPublicView ? (
              <button
                type="button"
                className={styles.linklike}
                onClick={() => openEdit('gender')}
                data-testid="prompt-add-gender"
              >
                {t('profileUi.specifyPrompt', '＋ Specifica')}
              </button>
            ) : (
              <span className={styles.rowVal}>—</span>
            )}
          </div>

          <div className={styles.pRow}>
            <span className={styles.rowKey}>{t('profile.personalInfo.bio', 'Bio')}</span>
            {bioValue ? (
              <span className={styles.rowVal}>{bioValue}</span>
            ) : !isPublicView ? (
              <button
                type="button"
                className={styles.linklike}
                onClick={() => openEdit('bio')}
                data-testid="prompt-add-bio"
              >
                {t('profileUi.addBioPrompt', '＋ Raccontati in due righe')}
              </button>
            ) : (
              <span className={styles.rowVal}>—</span>
            )}
          </div>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSave}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="p-nickname">{t('profile.personalInfo.nickname', 'Nickname')}</label>
              <input
                id="p-nickname"
                name="nickname"
                type="text"
                value={formData.nickname}
                onChange={handleChange}
                className={styles.input}
                placeholder={t('profile.personalInfo.nickname', 'Nickname')}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="p-city">{t('profileUi.cityLabel', 'Città / Posizione')}</label>
              <input
                ref={cityRef}
                id="p-city"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                className={styles.input}
                placeholder={t('profileUi.cityPlaceholder', 'Es. Milano, Italia')}
                data-testid="input-city"
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="p-dob">{t('profileUi.dateOfBirthLabel', 'Data di nascita')}</label>
              <input
                ref={dobRef}
                id="p-dob"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className={styles.input}
                data-testid="input-dob"
              />
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={formData.showAge}
                  onChange={() =>
                    setFormData((prev) => ({ ...prev, showAge: !prev.showAge }))
                  }
                />
                <span>{t('profileUi.showAgeLabel', 'Mostra l’età sul profilo pubblico')}</span>
              </label>
            </div>

            <div className={styles.field}>
              <label htmlFor="p-gender">{t('profile.personalInfo.gender', 'Genere')}</label>
              <select
                ref={genderRef}
                id="p-gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={styles.select}
                data-testid="input-gender"
              >
                <option value="">{t('profile.personalInfo.selectGender', 'Seleziona genere...')}</option>
                <option value="male">{t('profile.personalInfo.male', 'Maschio')}</option>
                <option value="female">{t('profile.personalInfo.female', 'Femmina')}</option>
                <option value="non-binary">{t('profile.personalInfo.nonBinary', 'Non binario')}</option>
                <option value="other">{t('profile.personalInfo.other', 'Altro')}</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="p-bio">{t('profile.personalInfo.bio', 'Bio')}</label>
            <textarea
              ref={bioRef}
              id="p-bio"
              name="bio"
              rows={3}
              maxLength={500}
              value={formData.bio}
              onChange={handleChange}
              className={styles.textarea}
              placeholder={t('profile.personalInfo.bioPlaceholder', 'La tua bio...')}
              data-testid="input-bio"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="p-phone">{t('profileUi.phoneLabel', 'Telefono (privato)')}</label>
            <input
              id="p-phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className={styles.input}
              placeholder={t('profile.personalInfo.phonePlaceholder', 'Numero di telefono (privato)')}
            />
          </div>

          <div className={styles.formActions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isUpdating}
            >
              {t('profile.personalInfo.cancel', 'Annulla')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isUpdating}
              data-testid="personal-save-btn"
            >
              {isUpdating
                ? t('forms.saving', 'Salvataggio...')
                : t('profile.personalInfo.save', 'Salva')}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};

export default PersonalInfo;
