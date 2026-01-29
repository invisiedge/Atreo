/**
 * MongoDB Connection Test Script
 * Run this to diagnose MongoDB connection issues
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  console.log('🔍 Testing MongoDB Connection...\n');
  
  // Check if MONGODB_URI is set
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in .env file');
    process.exit(1);
  }
  
  console.log('✅ MONGODB_URI is set');
  const uri = process.env.MONGODB_URI;
  
  // Extract connection details (without password)
  const uriMatch = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)/);
  if (uriMatch) {
    const [, username, , host, database] = uriMatch;
    console.log(`   Username: ${username}`);
    console.log(`   Host: ${host}`);
    console.log(`   Database: ${database}`);
  }
  
  console.log('\n🔄 Attempting to connect...\n');
  
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Port: ${conn.connection.port}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Ready State: ${conn.connection.readyState} (1 = connected)`);
    
    // Test a simple query
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`\n📊 Found ${collections.length} collections in database`);
    
    await mongoose.disconnect();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Connection Failed!\n');
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.error('\n💡 Possible Solutions:');
      console.error('   1. Check MongoDB Atlas Network Access:');
      console.error('      - Go to MongoDB Atlas → Network Access');
      console.error('      - Add your IP address: 157.50.124.225');
      console.error('      - Or add 0.0.0.0/0 for testing (not recommended for production)');
      console.error('   2. Check if you\'re behind a firewall/VPN');
      console.error('   3. Verify your internet connection');
    } else if (error.message.includes('authentication failed')) {
      console.error('\n💡 Authentication Failed:');
      console.error('   1. Check username and password in connection string');
      console.error('   2. Verify database user has proper permissions');
      console.error('   3. Check if user exists in MongoDB Atlas');
    } else if (error.message.includes('timeout')) {
      console.error('\n💡 Connection Timeout:');
      console.error('   1. Check network connectivity');
      console.error('   2. Check firewall settings');
      console.error('   3. MongoDB Atlas might be blocking your IP');
    }
    
    process.exit(1);
  }
}

testConnection();
