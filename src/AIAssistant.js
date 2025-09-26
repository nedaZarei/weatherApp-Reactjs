import React, { useState } from "react";

function AIAssistant({ weatherData }) {
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(false);

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
            <button
              className="close-button"
              onClick={() => setIsVisible(false)}
            >
              ×
            </button>
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
                <button onClick={() => setError("")}>Try Again</button>
              </div>
            )}

            {advice && !loading && !error && (
              <div className="advice">
                <p>{advice}</p>
              </div>
            )}

            {!advice && !loading && !error && (
              <div className="placeholder">
                <p>Click "Get Advice" to receive personalized weather recommendations!</p>
                <button className="get-advice-button">
                  Get Advice
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AIAssistant;