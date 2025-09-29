const apiKeys = {
  key: "a764b636a020bd9e52e94b1d51cedec8",
  base: "https://api.openweathermap.org/data/2.5/",
  openaiApiKey: process.env.REACT_APP_OPENAI_API_KEY,
};

// Add validation
if (!apiKeys.openaiApiKey || apiKeys.openaiApiKey === "your-openai-api-key-here") {
  console.warn("OpenAI API key not configured properly");
}

export default apiKeys;