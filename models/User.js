const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date },
  isAdmin: { type: Boolean, default: false },
});

// userSchema.pre("save", async function (next) {
//   const user = this;
//   if (!user.isModified("password")) return next();
//   const hash = bcrypt.hash(user.password, 10);
//   user.password = hash;
//   next();
// });

const User = mongoose.model("User", userSchema);

module.exports = User;
