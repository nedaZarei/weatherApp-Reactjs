import React, { useState, useEffect } from "react";
import { getPreferences, savePreferences, preferenceLabels } from "./preferencesService";

function PreferencesPanel({ onClose, onPreferencesChange }) {
  const [preferences, setPreferences] = useState(getPreferences());
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    setPreferences(getPreferences());
  }, []);

  const handlePreferenceChange = (key) => {
    const updatedPreferences = {
      ...preferences,
      [key]: !preferences[key]
    };
    setPreferences(updatedPreferences);
  };

  const handleSave = () => {
    const success = savePreferences(preferences);
    if (success) {
      setSaveStatus("Preferences saved successfully!");
      onPreferencesChange(preferences);
      setTimeout(() => setSaveStatus(""), 2000);
    } else {
      setSaveStatus("Error saving preferences. Please try again.");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  const handleReset = () => {
    const defaultPrefs = {
      clothing: true,
      activities: true,
      health: true,
      commute: false,
      home: false
    };
    setPreferences(defaultPrefs);
  };

  const getActiveCount = () => {
    return Object.values(preferences).filter(Boolean).length;
  };

  return (
    <div className="preferences-panel">
      <div className="preferences-header">
        <h3>Advice Preferences</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="preferences-content">
        <p className="preferences-description">
          Choose what types of weather advice you'd like to receive:
        </p>

        <div className="preferences-grid">
          {Object.entries(preferenceLabels).map(([key, label]) => (
            <div key={key} className="preference-item">
              <label className="preference-label">
                <input
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={() => handlePreferenceChange(key)}
                  className="preference-checkbox"
                />
                <span className="preference-text">{label}</span>
              </label>
            </div>
          ))}
        </div>

        <div className="preferences-summary">
          <p>{getActiveCount()} of {Object.keys(preferenceLabels).length} categories selected</p>
        </div>

        {saveStatus && (
          <div className={`save-status ${saveStatus.includes('Error') ? 'error' : 'success'}`}>
            {saveStatus}
          </div>
        )}

        <div className="preferences-actions">
          <button className="reset-button" onClick={handleReset}>
            Reset to Default
          </button>
          <button className="save-button" onClick={handleSave}>
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreferencesPanel;