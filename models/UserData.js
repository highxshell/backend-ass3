const mongoose = require("mongoose");

const userDataSchema = new mongoose.Schema({
  username: { type: String, required: true },
  accessHistory: [{ type: Date, default: Date.now }],
});

const UserData = mongoose.model("UserData", userDataSchema);

module.exports = UserData;
