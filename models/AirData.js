const mongoose = require("mongoose");

const airDataSchema = new mongoose.Schema({
  username: { type: String, required: true },
  city: { type: String, required: true },
  aiq: { type: Number, required: true },
  createdAt: { type: Date, required: true },
});

const AirData = mongoose.model("AirData", airDataSchema);

module.exports = AirData;
