import { useTranslation } from 'react-i18next';
import { MEAL_TYPES, MEAL_MODES } from '../constants/mealConstants';

export const useMealTranslations = () => {
  const { t } = useTranslation();

  const getMealTypeText = (typeKey) => {
    const translationKey = `meals.mealTypes.${typeKey}`;
    return t(translationKey, typeKey); // Fallback al typeKey se la traduzione non esiste
  };

  const getMealModeText = (modeKey) => {
    const translationKey = `meals.mealModes.${modeKey}`;
    return t(translationKey, modeKey); // Fallback al modeKey se la traduzione non esiste
  };

  const getMealStatusText = (statusKey) => {
    const translationKey = `meals.mealStatus.${statusKey}`;
    return t(translationKey, statusKey); // Fallback al statusKey se la traduzione non esiste
  };

  const getMealTypeOptions = () => [
    { value: MEAL_TYPES.BREAKFAST, label: getMealTypeText(MEAL_TYPES.BREAKFAST) },
    { value: MEAL_TYPES.LUNCH, label: getMealTypeText(MEAL_TYPES.LUNCH) },
    { value: MEAL_TYPES.DINNER, label: getMealTypeText(MEAL_TYPES.DINNER) },
    { value: MEAL_TYPES.APERITIF, label: getMealTypeText(MEAL_TYPES.APERITIF) }
  ];

  const getMealModeOptions = () => [
    { value: MEAL_MODES.VIRTUAL, label: getMealModeText(MEAL_MODES.VIRTUAL) },
    { value: MEAL_MODES.PHYSICAL, label: getMealModeText(MEAL_MODES.PHYSICAL) }
  ];

  return {
    getMealTypeText,
    getMealModeText,
    getMealStatusText,
    getMealTypeOptions,
    getMealModeOptions
  };
}; 