// no ./ required as its default referring to node_modules
require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");

//create new object
//process is a new global variable created
//const do not allow reassignment, Let allows
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

// share with other JavaScript files
module.exports = {
  ai,
  MODEL
};