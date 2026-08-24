async function getCurrentWeather() {
  // TODO: Implement weather fetching logic
  return {
    temperature: 25,
    unit: "C",
    condition: "Rainy",
  };
}

async function getLocation() {
  // TODO: Implement location fetching logic
  return "Singapore, Yishun";
}

module.exports = {
  getCurrentWeather,
  getLocation,
};