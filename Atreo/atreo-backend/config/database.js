const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      bufferCommands: false,
    });

    // Handle connection events
    mongoose.connection.on('error', () => {});
    mongoose.connection.on('disconnected', () => {});
    mongoose.connection.on('reconnected', () => {});
    
  } catch (error) {
    // Don't exit - let server start even if DB fails
  }
};

module.exports = connectDB;
