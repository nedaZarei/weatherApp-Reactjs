import axios from "axios";
import apiKeys from "./apiKeys";

const getWeatherAdvice = async (weatherData) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful weather assistant that provides practical advice based on current weather conditions. Keep responses concise and useful."
          },
          {
            role: "user",
            content: `Based on the current weather conditions: ${weatherData.main} in ${weatherData.city}, ${weatherData.country}, temperature ${weatherData.temperatureC}°C, humidity ${weatherData.humidity}%, provide helpful advice for someone going outside today.`
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