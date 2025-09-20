// ======================================================
// File: config-loader.js
// Purpose: Load configuration from config.json file
// ======================================================

const fs = require('fs');
const path = require('path');

class ConfigLoader {
  constructor() {
    this.config = null;
    this.configPath = path.join(__dirname, 'config.json');
  }

  loadConfig() {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.createDefaultConfig();
      }
      
      const configData = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      
      return this.config;
    } catch (error) {
      return this.getDefaultConfig();
    }
  }

  createDefaultConfig() {
    const defaultConfig = this.getDefaultConfig();
    
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
    } catch (error) {
      // Silently fail
    }
  }

  getDefaultConfig() {
    return {
      server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || '0.0.0.0',
        description: 'API Server Configuration'
      },
      database: {
        host: process.env.DB_HOST || '202.28.34.203',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'mb68_65011212115',
        password: process.env.DB_PASS || 'g0bPZ$Cib3i9',
        database: process.env.DB_NAME || 'mb68_65011212115'
      },
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        description: 'CORS configuration'
      },
      security: {
        jwt_secret: process.env.JWT_SECRET || 'default_secret_change_in_production',
        bcrypt_rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
      }
    };
  }

  printConfig() {
    // Silent - no logging
  }

  // Getters for easy access
  get serverPort() {
    return this.config?.server?.port || 3000;
  }

  get serverHost() {
    return this.config?.server?.host || '0.0.0.0';
  }

  get databaseConfig() {
    return this.config?.database || this.getDefaultConfig().database;
  }

  get corsOrigin() {
    return this.config?.cors?.origin || '*';
  }
}

module.exports = new ConfigLoader();