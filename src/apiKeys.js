const apiKeys = {
  key: "a764b636a020bd9e52e94b1d51cedec8",
  base: "https://api.openweathermap.org/data/2.5/",
  openaiApiKey: process.env.REACT_APP_OPENAI_API_KEY,
};

// Add validation
if (!apiKeys.openaiApiKey || apiKeys.openaiApiKey === "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") {
  console.warn("OpenAI API key not configured properly");
}

export default apiKeys;