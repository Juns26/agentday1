const { ai, MODEL } = require("./gemini");

// 1. Import the tools
const { getCurrentWeather, getLocation } = require("./tools");

async function main() {
  // 2. Get the location and weather
  const location = await getLocation();
  const weather = await getCurrentWeather();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Give me a list of activity ideas based on my current location and weather. 
        Location: ${location}, Weather: ${JSON.stringify(weather)}`,
  });

  console.log(response.text);
}

main();