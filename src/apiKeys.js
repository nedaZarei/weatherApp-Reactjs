// Visit https://api.openweathermap.org & then signup to get our API keys for free
// Visit https://platform.openai.com & then signup to get OpenAI API key for free
const apiKeys = {
  key: "a764b636a020bd9e52e94b1d51cedec8",
  base: "https://api.openweathermap.org/data/2.5/",
  openaiApiKey: process.env.REACT_APP_OPENAI_API_KEY || "your-openai-api-key-here",
};

export default apiKeys;