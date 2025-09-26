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

const createStructuredPrompt = (formattedWeather, activePreferences) => {
  const weatherContext = `Current weather: ${formattedWeather.condition} in ${formattedWeather.city}, ${formattedWeather.country}. Temperature: ${formattedWeather.temperature}°C, Humidity: ${formattedWeather.humidity}%.`;

  const systemPrompt = `You are a weather assistant providing practical advice. Always respond with structured advice in exactly this format:

CLOTHING: [specific clothing recommendations]
ACTIVITIES: [activity suggestions for this weather]
HEALTH: [health and safety tips]

Keep each section to 1-2 concise sentences. Be specific and actionable.`;

  const userPrompt = `${weatherContext}

Provide structured advice focusing on: ${generatePreferencePrompt(activePreferences)}.

Remember to format your response with CLOTHING:, ACTIVITIES:, and HEALTH: sections.`;

  return { systemPrompt, userPrompt };
};

const parseStructuredResponse = (response) => {
  try {
    const sections = {
      clothing: '',
      activities: '',
      health: ''
    };

    const lines = response.split('\n').filter(line => line.trim());

    let currentSection = null;

    lines.forEach(line => {
      const upperLine = line.toUpperCase().trim();

      if (upperLine.startsWith('CLOTHING:')) {
        currentSection = 'clothing';
        sections.clothing = line.substring(line.indexOf(':') + 1).trim();
      } else if (upperLine.startsWith('ACTIVITIES:')) {
        currentSection = 'activities';
        sections.activities = line.substring(line.indexOf(':') + 1).trim();
      } else if (upperLine.startsWith('HEALTH:')) {
        currentSection = 'health';
        sections.health = line.substring(line.indexOf(':') + 1).trim();
      } else if (currentSection && line.trim()) {
        // Continue previous section if no new header found
        sections[currentSection] += ' ' + line.trim();
      }
    });

    // Validate that we have meaningful content
    const hasContent = Object.values(sections).some(content => content.length > 10);

    return hasContent ? sections : null;
  } catch (error) {
    console.error('Error parsing structured response:', error);
    return null;
  }
};

const getFallbackAdvice = (formattedWeather) => {
  const temp = parseInt(formattedWeather.temperature);
  const condition = formattedWeather.condition.toLowerCase();

  const fallback = {
    clothing: '',
    activities: '',
    health: ''
  };

  // Temperature-based clothing advice
  if (temp <= 0) {
    fallback.clothing = 'Wear heavy winter coat, gloves, hat, and warm boots. Layer up with thermal underwear.';
  } else if (temp <= 10) {
    fallback.clothing = 'Dress in warm layers: jacket, sweater, long pants, and closed-toe shoes.';
  } else if (temp <= 20) {
    fallback.clothing = 'Light jacket or sweater recommended. Long pants and comfortable shoes.';
  } else if (temp <= 30) {
    fallback.clothing = 'Light, breathable clothing. T-shirt, shorts or light pants, and comfortable shoes.';
  } else {
    fallback.clothing = 'Wear minimal, light-colored, breathable fabrics. Sun hat and sunglasses recommended.';
  }

  // Condition-based activity advice
  if (condition.includes('rain') || condition.includes('drizzle')) {
    fallback.activities = 'Indoor activities recommended. If going out, bring an umbrella and wear waterproof shoes.';
  } else if (condition.includes('snow')) {
    fallback.activities = 'Great for winter sports like skiing or snowball fights. Drive carefully and allow extra time.';
  } else if (condition.includes('clear') || condition.includes('sunny')) {
    fallback.activities = 'Perfect weather for outdoor activities like walking, cycling, or picnics in the park.';
  } else {
    fallback.activities = 'Mixed conditions. Check forecast before planning outdoor activities.';
  }

  // General health advice
  if (temp > 30) {
    fallback.health = 'Stay hydrated, avoid prolonged sun exposure, and take breaks in shade or AC.';
  } else if (temp < 0) {
    fallback.health = 'Limit time outdoors, protect exposed skin, and watch for signs of hypothermia.';
  } else if (condition.includes('rain')) {
    fallback.health = 'Stay dry to avoid getting cold. Be cautious of slippery surfaces.';
  } else {
    fallback.health = 'Maintain regular hydration and dress appropriately for the temperature.';
  }

  return fallback;
};

const validateAdviceContent = (advice) => {
  if (!advice || typeof advice !== 'object') return false;

  const sections = ['clothing', 'activities', 'health'];
  return sections.every(section =>
    advice[section] &&
    typeof advice[section] === 'string' &&
    advice[section].length > 5 &&
    advice[section].length < 500
  );
};

const getWeatherAdvice = async (weatherData, activePreferences = []) => {
  if (!weatherData) {
    throw new Error("Weather data is required");
  }

  const formattedWeather = formatWeatherData(weatherData);

  try {
    const { systemPrompt, userPrompt } = createStructuredPrompt(formattedWeather, activePreferences);

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKeys.openaiApiKey}`
        }
      }
    );

    const rawResponse = response.data.choices[0].message.content.trim();
    const structuredAdvice = parseStructuredResponse(rawResponse);

    if (structuredAdvice && validateAdviceContent(structuredAdvice)) {
      return structuredAdvice;
    } else {
      // Fallback to generated advice if parsing fails
      console.warn('Using fallback advice due to parsing failure');
      return getFallbackAdvice(formattedWeather);
    }
  } catch (error) {
    console.error("Error getting weather advice:", error);
    // Return fallback advice on API error
    return getFallbackAdvice(formattedWeather);
  }
};

export default getWeatherAdvice;