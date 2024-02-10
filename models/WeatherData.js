const mongoose = require("mongoose");

const weatherDataSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  city: { type: String, required: true },
  temperature: { type: Number, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, required: true },
});

const WeatherData = mongoose.model("WeatherData", weatherDataSchema);

module.exports = WeatherData;
