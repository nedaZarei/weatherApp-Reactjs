import React, { useState, useEffect, useRef } from "react";
import PreferencesPanel from "./PreferencesPanel";
import { getPreferences, getActivePreferences } from "./preferencesService";
import getWeatherAdvice from "./openaiService";

function AIAssistant({ weatherData }) {
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorInfo, setErrorInfo] = useState(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [userPreferences, setUserPreferences] = useState(getPreferences());
  const popupRef = useRef(null);

  useEffect(() => {
    setUserPreferences(getPreferences());
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isVisible) {
        setIsVisible(false);
        setShowPreferences(false);
      }
    };

    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) && isVisible) {
        setIsVisible(false);
        setShowPreferences(false);
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isVisible]);

  const handleGetAdvice = async () => {
    if (!weatherData) {
      setError("Weather data not available");
      setErrorInfo({ type: 'VALIDATION', retryable: false });
      return;
    }

    setLoading(true);
    setError("");
    setErrorInfo(null);
    setAdvice("");
    setIsUsingFallback(false);

    try {
      const activePrefs = getActivePreferences();
      const adviceData = await getWeatherAdvice(weatherData, activePrefs);

      if (adviceData && typeof adviceData === 'object' &&
          (adviceData.clothing || adviceData.activities || adviceData.health)) {

        // Check if this is fallback advice
        if (adviceData._isFallback) {
          setIsUsingFallback(true);
          if (adviceData._errorInfo) {
            setErrorInfo(adviceData._errorInfo);
          }
          // Remove metadata before setting advice
          const cleanedAdvice = { ...adviceData };
          delete cleanedAdvice._isFallback;
          delete cleanedAdvice._errorInfo;
          setAdvice(cleanedAdvice);
        } else {
          setAdvice(adviceData);
        }
      } else {
        throw new Error("Invalid response from AI service");
      }
    } catch (err) {
      console.error("Error getting advice:", err);

      // Check if error has classification info
      const errorInfo = err.classified || { type: 'UNKNOWN', message: 'Unknown error occurred', retryable: true };

      setError(errorInfo.message);
      setErrorInfo(errorInfo);
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
        className="ai-advice-trigger"
        onClick={() => setIsVisible(true)}
        title="Get AI Weather Advice"
      >
        🤖 AI Advice
      </button>

      {isVisible && (
        <div className="ai-assistant-overlay">
          <div className="ai-assistant-popup" ref={popupRef}>
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
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="ai-assistant-content">
              {loading && (
                <div className="loading">
                  <div className="loading-spinner">🤖</div>
                  <p>Analyzing weather conditions...</p>
                  <small>Generating personalized advice</small>
                </div>
              )}

              {error && !advice && (
                <div className="error">
                  <h4>⚠️ Unable to Get Advice</h4>
                  <p>{error}</p>
                  {errorInfo && (
                    <div className="error-details">
                      <small>Error type: {errorInfo.type}</small>
                    </div>
                  )}
                  {errorInfo && errorInfo.retryable && (
                    <button onClick={handleGetAdvice} className="retry-button">
                      🔄 Try Again
                    </button>
                  )}
                  {errorInfo && !errorInfo.retryable && (
                    <div className="non-retryable-notice">
                      <small>This error cannot be retried automatically.</small>
                    </div>
                  )}
                </div>
              )}

              {advice && !loading && (
                <div className="structured-advice">
                  {isUsingFallback && (
                    <div className="fallback-notice">
                      <div className="fallback-header">
                        <span className="fallback-icon">🔧</span>
                        <div className="fallback-text">
                          <strong>Using Offline Advice</strong>
                          <small>
                            {errorInfo ?
                              `AI service unavailable (${errorInfo.type}). Showing weather-based recommendations.` :
                              'AI service unavailable. Showing weather-based recommendations.'
                            }
                          </small>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="advice-header">
                    <h4>
                      {isUsingFallback ? '📋' : '🤖'} Weather Advice for {weatherData.city}
                    </h4>
                    <small>{weatherData.temperatureC}°C • {weatherData.main}</small>
                  </div>

                  <div className="advice-cards">
                    {advice.clothing && (
                      <div className="advice-card clothing-card">
                        <div className="card-header">
                          <span className="card-icon">👔</span>
                          <h5>What to Wear</h5>
                        </div>
                        <p>{advice.clothing}</p>
                      </div>
                    )}

                    {advice.activities && (
                      <div className="advice-card activities-card">
                        <div className="card-header">
                          <span className="card-icon">🏃</span>
                          <h5>Activities</h5>
                        </div>
                        <p>{advice.activities}</p>
                      </div>
                    )}

                    {advice.health && (
                      <div className="advice-card health-card">
                        <div className="card-header">
                          <span className="card-icon">🏥</span>
                          <h5>Health & Safety</h5>
                        </div>
                        <p>{advice.health}</p>
                      </div>
                    )}
                  </div>

                  <div className="advice-actions">
                    <button onClick={handleGetAdvice} className="refresh-advice-button">
                      🔄 Get New Advice
                    </button>
                  </div>
                </div>
              )}

              {!advice && !loading && !error && (
                <div className="placeholder">
                  <div className="placeholder-icon">🤖</div>
                  <h4>AI Weather Assistant</h4>
                  <p>Get personalized advice for today's weather conditions</p>
                  <div className="active-preferences">
                    <small>📋 {getActivePreferences().length} categories selected</small>
                  </div>
                  <button className="get-advice-button" onClick={handleGetAdvice}>
                    🎯 Get Personalized Advice
                  </button>
                </div>
              )}
            </div>

            {showPreferences && (
              <div className="preferences-overlay">
                <PreferencesPanel
                  onClose={() => setShowPreferences(false)}
                  onPreferencesChange={handlePreferencesChange}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AIAssistant;