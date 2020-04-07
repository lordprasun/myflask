const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const tokenSchema = new Schema({

    user_id: { type: Number },
    token: { type: String },
    refresh_token: { type: String },
    last_login: { type: Date },
    last_logout: { type: Date }
})
// Export the model
const tokens = mongoose.model('tokens', tokenSchema);
module.exports = tokens