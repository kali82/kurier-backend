const mongoose = require('mongoose');

const refreshTokenSchema = mongoose.Schema(
  {
    userId: { type: String, required: true },
    refreshToken: { type: String, required: true },
  },
  { collection: 'refreshTokens' }
);

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
