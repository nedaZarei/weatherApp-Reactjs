const PREFERENCES_KEY = 'weatherApp_preferences';

const defaultPreferences = {
  clothing: true,
  activities: true,
  health: true,
  commute: false,
  home: false
};

export const preferenceLabels = {
  clothing: 'Clothing & What to Wear',
  activities: 'Activity Suggestions',
  health: 'Health & Safety Tips',
  commute: 'Commute & Travel Advice',
  home: 'Home & Garden Tips'
};

export const getPreferences = () => {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    return stored ? { ...defaultPreferences, ...JSON.parse(stored) } : defaultPreferences;
  } catch (error) {
    console.error('Error loading preferences:', error);
    return defaultPreferences;
  }
};

export const savePreferences = (preferences) => {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    return true;
  } catch (error) {
    console.error('Error saving preferences:', error);
    return false;
  }
};

export const getActivePreferences = () => {
  const prefs = getPreferences();
  return Object.keys(prefs).filter(key => prefs[key]);
};

export const generatePreferencePrompt = (activePreferences) => {
  const prompts = {
    clothing: "clothing recommendations and what to wear",
    activities: "activity suggestions and outdoor/indoor recommendations",
    health: "health and safety tips including UV protection and air quality advice",
    commute: "commute and travel advice including transportation recommendations",
    home: "home and garden tips including energy efficiency and plant care"
  };

  if (activePreferences.length === 0) {
    return "general weather advice";
  }

  const preferenceTexts = activePreferences.map(pref => prompts[pref]).filter(Boolean);

  if (preferenceTexts.length === 1) {
    return preferenceTexts[0];
  } else if (preferenceTexts.length === 2) {
    return preferenceTexts.join(" and ");
  } else {
    return preferenceTexts.slice(0, -1).join(", ") + ", and " + preferenceTexts.slice(-1);
  }
};