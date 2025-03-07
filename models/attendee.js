const mongoose = require('mongoose');

const AttendeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobile: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  posterUrl: {
    type: String,
    required: true
  },
  uniqueId: {
    type: String,
    required: true,
    unique: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendee',
    default: null
  },
  referralCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Attendee', AttendeeSchema);