const mongoose = require('mongoose');

const candidateNoteSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    content: {
      type: String,
      required: [true, 'Note content is required'],
      maxlength: [2000, 'Note cannot exceed 2000 characters'],
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    // Note visibility
    isPrivate: {
      type: Boolean,
      default: false, // false = visible to team; true = only visible to author
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

candidateNoteSchema.index({ application: 1, createdAt: -1 });

const CandidateNote = mongoose.model('CandidateNote', candidateNoteSchema);

module.exports = CandidateNote;
