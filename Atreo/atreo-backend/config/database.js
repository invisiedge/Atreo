const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.log('⚠️  No MONGODB_URI found - database connection skipped');
      return;
    }

    // Clean, modern Mongoose connection with increased timeouts for Railway
    // Railway MongoDB can be slow, so we use longer timeouts
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 60000, // 60 seconds for server selection (Railway can be slow)
      socketTimeoutMS: 90000, // 90 seconds for socket operations
      connectTimeoutMS: 60000, // 60 seconds for initial connection
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
      heartbeatFrequencyMS: 10000, // Check connection health every 10 seconds
      maxIdleTimeMS: 30000 // Close connections after 30 seconds of inactivity
      // Note: bufferMaxEntries and bufferCommands are handled by Mongoose internally
      // serverSelectionRetryDelayMS is not a valid option in modern MongoDB driver
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
      console.error('Error details:', {
        name: err.name,
        code: err.code,
        codeName: err.codeName
      });
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    mongoose.connection.on('connecting', () => {
      console.log('🔄 Connecting to MongoDB...');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      codeName: error.codeName,
      message: error.message
    });
    
    // Provide helpful error messages
    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 Connection refused - Check:');
      console.error('   1. MongoDB service is running');
      console.error('   2. Network connectivity');
      console.error('   3. MongoDB Atlas IP whitelist includes your IP');
      console.error('   4. Connection string is correct');
    } else if (error.message.includes('authentication failed')) {
      console.error('💡 Authentication failed - Check:');
      console.error('   1. MongoDB username and password are correct');
      console.error('   2. Database user has proper permissions');
    } else if (error.message.includes('querySrv')) {
      console.error('💡 DNS/Connection string issue - Check:');
      console.error('   1. MongoDB Atlas connection string format');
      console.error('   2. Network DNS resolution');
      console.error('   3. Firewall/proxy settings');
    }
    
    // Don't exit - let server start even if DB fails
    // But set a flag so routes can check connection status
    mongoose.connection.readyState = 0; // disconnected
  }
};

// Helper function to check if database is connected
const isConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

module.exports = connectDB;
module.exports.isConnected = isConnected;