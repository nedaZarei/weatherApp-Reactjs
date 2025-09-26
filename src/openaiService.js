import axios from "axios";
import apiKeys from "./apiKeys";
import { generatePreferencePrompt } from "./preferencesService";

const formatWeatherData = (weatherData) => {
  return {
    condition: weatherData.main || 'Unknown',
    city: weatherData.city || 'Unknown location',
    country: weatherData.country || '',
    temperature: weatherData.temperatureC || 'Unknown',
    humidity: weatherData.humidity || 'Unknown',
    description: weatherData.description || weatherData.main || 'Unknown'
  };
};

const getWeatherAdvice = async (weatherData, activePreferences = []) => {
  if (!weatherData) {
    throw new Error("Weather data is required");
  }

  const formattedWeather = formatWeatherData(weatherData);

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful weather assistant that provides practical advice based on current weather conditions. Keep responses concise and useful. Focus on the specific categories requested by the user."
          },
          {
            role: "user",
            content: `Based on the current weather conditions: ${formattedWeather.condition} in ${formattedWeather.city}, ${formattedWeather.country}, temperature ${formattedWeather.temperature}°C, humidity ${formattedWeather.humidity}%, provide advice focusing specifically on: ${generatePreferencePrompt(activePreferences)}. Keep it practical and actionable.`
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKeys.openaiApiKey}`
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error getting weather advice:", error);
    throw error;
  }
};

export default getWeatherAdvice;