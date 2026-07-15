const mongoose = require("mongoose");
const { toJSON, paginate, softDelete } = require('./plugins');

const festivalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },

    image: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048
    },

    content: {
      type: String,
      required: true
    },

    startTime: {
      type: Date,
      required: true
    },

    endTime: {
      type: Date,
      required: true
    },

    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
);

festivalSchema.plugin(toJSON);
festivalSchema.plugin(paginate);
festivalSchema.plugin(softDelete);

const dropLegacyTitleIndex = async () => {
  if (!mongoose.connection.db) return;

  try {
    const indexes = await mongoose.connection.db.collection('festivals').indexes();
    const hasLegacyTitleIndex = indexes.some((index) => index.name === 'title_1');

    if (hasLegacyTitleIndex) {
      await mongoose.connection.db.collection('festivals').dropIndex('title_1');
    }
  } catch (error) {
    if (error?.code !== 26) {
      console.warn('Unable to drop legacy festivals title index:', error.message);
    }
  }
};

if (mongoose.connection.readyState === 1) {
  dropLegacyTitleIndex();
} else {
  mongoose.connection.once('open', () => {
    dropLegacyTitleIndex();
  });
}

module.exports = mongoose.model("Festival", festivalSchema);
