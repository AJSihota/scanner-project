const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  googleId: String,
  facebookId: String,
  email: String,
  // include any other fields you want here
});

module.exports = mongoose.model('User', UserSchema);
