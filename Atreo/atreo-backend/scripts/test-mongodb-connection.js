/**
 * Test MongoDB Connection
 * Diagnoses connection issues with Railway MongoDB
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...\n');
  console.log('Connection String:', process.env.MONGODB_URI?.replace(/:[^:@]+@/, ':****@') || 'NOT SET');
  console.log('');

  try {
    const startTime = Date.now();
    
    console.log('⏳ Attempting connection with extended timeouts...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 90000,
      connectTimeoutMS: 60000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
      heartbeatFrequencyMS: 10000,
      maxIdleTimeMS: 30000
    });

    const connectionTime = Date.now() - startTime;
    
    console.log(`✅ MongoDB Connected successfully!`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Connection time: ${connectionTime}ms`);
    console.log(`   Ready State: ${conn.connection.readyState} (1 = connected)`);
    
    // Test a simple query
    console.log('\n🧪 Testing database query...');
    const User = require('../models/User');
    const userCount = await User.countDocuments();
    console.log(`✅ Query successful! Found ${userCount} users in database.`);
    
    await mongoose.disconnect();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      codeName: error.codeName
    });
    
    if (error.message.includes('Server selection timed out')) {
      console.error('\n💡 Server selection timeout - Possible causes:');
      console.error('   1. Railway MongoDB service might be down or restarting');
      console.error('   2. Network connectivity issues');
      console.error('   3. Firewall blocking the connection');
      console.error('   4. Connection string might be incorrect');
      console.error('\n   Try:');
      console.error('   - Check Railway dashboard for service status');
      console.error('   - Verify connection string in .env file');
      console.error('   - Check network/firewall settings');
    } else if (error.message.includes('authentication failed')) {
      console.error('\n💡 Authentication failed - Check:');
      console.error('   1. Username and password in connection string');
      console.error('   2. Database user has proper permissions');
      console.error('   3. authSource parameter is correct');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Connection refused - Check:');
      console.error('   1. MongoDB service is running');
      console.error('   2. Port number is correct');
      console.error('   3. Host address is correct');
    }
    
    process.exit(1);
  }
}

testConnection();
