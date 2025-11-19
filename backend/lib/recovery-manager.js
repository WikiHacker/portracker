/**
 * Recovery Key Manager
 *
 * Handles emergency account recovery when users are locked out.
 * Generates time-limited, single-use recovery keys.
 */

const crypto = require('crypto');
const { Logger } = require('./logger');

const logger = new Logger('RecoveryManager', { debug: process.env.DEBUG === 'true' });

const ADJECTIVES = [
  'hungry',
  'stellar',
  'brisk',
  'caffeinated',
  'curious',
  'wired',
  'silent',
  'vigilant',
  'midnight',
  'luminous',
  'restless',
  'velvet',
  'electric',
  'braided',
  'sly'
];

const NOUNS = [
  'otter',
  'ferret',
  'jaguar',
  'lemur',
  'heron',
  'badger',
  'chisel',
  'daemon',
  'antenna',
  'pluto',
  'vortex',
  'relay',
  'sparrow',
  'circuit',
  'capsule'
];

function capitalizeWord(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function buildFriendlyKey() {
  const adjective = capitalizeWord(ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]);
  const noun = capitalizeWord(NOUNS[Math.floor(Math.random() * NOUNS.length)]);
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${adjective}${noun}${suffix}`;
}

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

    this.recoveryKey = buildFriendlyKey();
    this.expiresAt = Date.now() + (15 * 60 * 1000);
    this.used = false;

    this.displayKey();
    return this.recoveryKey;
  }

  displayKey() {
    const expiresIn = Math.max(1, Math.floor((this.expiresAt - Date.now()) / 60000));

    logger.info('');
    logger.warn('Recovery mode active - use any username with this code as the password:');
    logger.warn(`  ${this.recoveryKey}`);
    logger.warn(`  Expires in ${expiresIn} minute${expiresIn === 1 ? '' : 's'} - single use. Treat it like root.`);
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

    return inputKey === this.recoveryKey;
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


