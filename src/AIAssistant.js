import React, { useState, useEffect } from "react";
import PreferencesPanel from "./PreferencesPanel";
import { getPreferences, getActivePreferences } from "./preferencesService";
import getWeatherAdvice from "./openaiService";

function AIAssistant({ weatherData }) {
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [userPreferences, setUserPreferences] = useState(getPreferences());

  useEffect(() => {
    setUserPreferences(getPreferences());
  }, []);

  const handleGetAdvice = async () => {
    if (!weatherData) {
      setError("Weather data not available");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const activePrefs = getActivePreferences();
      const adviceText = await getWeatherAdvice(weatherData, activePrefs);
      setAdvice(adviceText);
    } catch (err) {
      setError("Failed to get weather advice. Please try again.");
      console.error("Error getting advice:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesChange = (newPreferences) => {
    setUserPreferences(newPreferences);
  };

  return (
    <div className="ai-assistant">
      <button
        className="ai-assistant-button"
        onClick={() => setIsVisible(!isVisible)}
      >
        🤖 Get Weather Advice
      </button>

      {isVisible && (
        <div className="ai-assistant-popup">
          <div className="ai-assistant-header">
            <h3>AI Weather Assistant</h3>
            <div className="header-buttons">
              <button
                className="preferences-button"
                onClick={() => setShowPreferences(true)}
                title="Customize advice preferences"
              >
                ⚙️
              </button>
              <button
                className="close-button"
                onClick={() => setIsVisible(false)}
              >
                ×
              </button>
            </div>
          </div>

          <div className="ai-assistant-content">
            {loading && (
              <div className="loading">
                <p>Getting personalized weather advice...</p>
              </div>
            )}

            {error && (
              <div className="error">
                <p>Error: {error}</p>
                <button onClick={handleGetAdvice}>Try Again</button>
              </div>
            )}

            {advice && !loading && !error && (
              <div className="advice">
                <p>{advice}</p>
                <button onClick={handleGetAdvice} className="refresh-advice-button">
                  Get New Advice
                </button>
              </div>
            )}

            {!advice && !loading && !error && (
              <div className="placeholder">
                <p>Click "Get Advice" to receive personalized weather recommendations!</p>
                <div className="active-preferences">
                  <small>Active preferences: {getActivePreferences().length} categories</small>
                </div>
                <button className="get-advice-button" onClick={handleGetAdvice}>
                  Get Advice
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showPreferences && (
        <div className="preferences-overlay">
          <PreferencesPanel
            onClose={() => setShowPreferences(false)}
            onPreferencesChange={handlePreferencesChange}
          />
        </div>
      )}
    </div>
  );
}

export default AIAssistant;