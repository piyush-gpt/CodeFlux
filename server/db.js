// server/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected ✅');
      return;
    }

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB connected successfully ✅');
  } catch (err) {
    console.error('MongoDB connection error ❌', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
