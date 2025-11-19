/**
 * Recovery Key Manager
 * 
 * Handles emergency account recovery when users are locked out.
 * Generates time-limited, single-use recovery keys.
 */

const crypto = require('crypto');
const { Logger } = require('./logger');

const logger = new Logger('RecoveryManager', { debug: process.env.DEBUG === 'true' });

class RecoveryManager {
  constructor() {
    this.recoveryKey = null;
    this.expiresAt = null;
    this.used = false;
  }

  isRecoveryModeEnabled() {
    return process.env.RECOVERY_MODE === 'true';
  }

  generateKey() {
    if (!this.isRecoveryModeEnabled()) {
      return null;
    }

    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.recoveryKey = `RK-${randomPart}`;
    this.expiresAt = Date.now() + (15 * 60 * 1000);
    this.used = false;

    this.displayKey();
    return this.recoveryKey;
  }

  displayKey() {
    const expiresIn = Math.floor((this.expiresAt - Date.now()) / 1000 / 60);
    
    logger.info('');
    logger.warn('╔════════════════════════════════════════╗');
    logger.warn('║   RECOVERY MODE ACTIVE                 ║');
    logger.warn('║                                        ║');
    logger.warn(`║   Recovery Key: ${this.recoveryKey.padEnd(20)}║`);
    logger.warn(`║   Expires: ${expiresIn} minutes${' '.repeat(21 - expiresIn.toString().length)}║`);
    logger.warn('║                                        ║');
    logger.warn('║   Login with any username and this     ║');
    logger.warn('║   key as password to reset access      ║');
    logger.warn('╚════════════════════════════════════════╝');
    logger.info('');
  }

  validateKey(inputKey) {
    if (!this.recoveryKey || this.used) {
      return false;
    }

    if (Date.now() > this.expiresAt) {
      logger.warn('Recovery key has expired');
      this.invalidate();
      return false;
    }

    if (inputKey === this.recoveryKey) {
      return true;
    }

    return false;
  }

  invalidate() {
    if (this.recoveryKey) {
      logger.info('Recovery key has been invalidated');
      this.recoveryKey = null;
      this.expiresAt = null;
      this.used = true;
    }
  }

  markAsUsed() {
    this.used = true;
    logger.info('Recovery key has been used successfully');
  }
}

module.exports = new RecoveryManager();
