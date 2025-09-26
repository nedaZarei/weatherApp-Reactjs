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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const classifyError = (error) => {
  if (!error.response) {
    // Network error, timeout, or connection issue
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        type: 'TIMEOUT',
        message: 'Request timed out. Please check your internet connection and try again.',
        retryable: true
      };
    }
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        type: 'NETWORK',
        message: 'Unable to connect to AI service. Please check your internet connection.',
        retryable: true
      };
    }
    return {
      type: 'NETWORK',
      message: 'Network error occurred. Please try again.',
      retryable: true
    };
  }

  const status = error.response.status;

  switch (status) {
    case 401:
      return {
        type: 'AUTH',
        message: 'AI service authentication failed. Please check your API configuration.',
        retryable: false
      };
    case 429:
      const retryAfter = error.response.headers['retry-after'];
      return {
        type: 'RATE_LIMIT',
        message: `Too many requests. Please wait ${retryAfter ? `${retryAfter} seconds` : 'a moment'} before trying again.`,
        retryable: true,
        retryAfter: retryAfter ? parseInt(retryAfter) * 1000 : 60000
      };
    case 400:
      return {
        type: 'BAD_REQUEST',
        message: 'Invalid request format. Using fallback advice.',
        retryable: false
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        type: 'SERVER_ERROR',
        message: 'AI service is temporarily unavailable. Using fallback advice.',
        retryable: true
      };
    default:
      return {
        type: 'UNKNOWN',
        message: `Unexpected error occurred (${status}). Using fallback advice.`,
        retryable: status >= 500
      };
  }
};

const makeOpenAIRequest = async (requestConfig, maxRetries = 3) => {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`OpenAI API attempt ${attempt}/${maxRetries}`);

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        requestConfig.data,
        {
          ...requestConfig.config,
          timeout: 30000 // 30 second timeout
        }
      );

      // Validate response structure
      if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        throw new Error('Invalid response structure from OpenAI API');
      }

      console.log('OpenAI API request successful');
      return response;

    } catch (error) {
      lastError = error;
      const errorInfo = classifyError(error);

      console.error(`OpenAI API attempt ${attempt} failed:`, {
        type: errorInfo.type,
        message: errorInfo.message,
        status: error.response?.status,
        retryable: errorInfo.retryable
      });

      // Don't retry if error is not retryable or if this was the last attempt
      if (!errorInfo.retryable || attempt === maxRetries) {
        throw { ...error, classified: errorInfo };
      }

      // Exponential backoff with jitter
      const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      const jitter = Math.random() * 1000;
      const delay = errorInfo.retryAfter || (baseDelay + jitter);

      console.log(`Retrying after ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
};

const getWeatherAdvice = async (weatherData, activePreferences = []) => {
  if (!weatherData) {
    const error = new Error("Weather data is required");
    error.classified = { type: 'VALIDATION', message: 'Weather data not available', retryable: false };
    throw error;
  }

  const formattedWeather = formatWeatherData(weatherData);

  try {
    // Validate API key existence
    if (!apiKeys.openaiApiKey || apiKeys.openaiApiKey === "your-openai-api-key-here") {
      const error = new Error("OpenAI API key not configured");
      error.classified = {
        type: 'CONFIG',
        message: 'AI service not configured. Using fallback advice.',
        retryable: false
      };
      throw error;
    }

    const { systemPrompt, userPrompt } = createStructuredPrompt(formattedWeather, activePreferences);

    const requestConfig = {
      data: {
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
      config: {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKeys.openaiApiKey}`
        }
      }
    };

    const response = await makeOpenAIRequest(requestConfig);
    const rawResponse = response.data.choices[0].message.content.trim();

    if (!rawResponse || rawResponse.length < 10) {
      throw new Error('Empty or insufficient response from OpenAI API');
    }

    const structuredAdvice = parseStructuredResponse(rawResponse);

    if (structuredAdvice && validateAdviceContent(structuredAdvice)) {
      console.log('Successfully generated structured advice from OpenAI');
      return structuredAdvice;
    } else {
      console.warn('OpenAI response parsing failed, using fallback advice');
      const fallbackAdvice = getFallbackAdvice(formattedWeather);
      // Mark as fallback for user notification
      fallbackAdvice._isFallback = true;
      return fallbackAdvice;
    }

  } catch (error) {
    const errorInfo = error.classified || classifyError(error);

    console.error("OpenAI API error:", {
      type: errorInfo.type,
      message: errorInfo.message,
      originalError: error.message
    });

    // Always return fallback advice with error info
    const fallbackAdvice = getFallbackAdvice(formattedWeather);
    fallbackAdvice._isFallback = true;
    fallbackAdvice._errorInfo = errorInfo;

    return fallbackAdvice;
  }
};

export default getWeatherAdvice;