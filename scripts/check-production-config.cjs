const path = require('node:path');
const { assertProductionConfig } = require('../config/account.cjs');

// Match Expo's production dotenv selection before validating; do not print values.
process.env.NODE_ENV = 'production';
require('@expo/env').load(path.resolve(__dirname, '..'), { silent: true });
try {
  assertProductionConfig();
  console.log('Public account configuration is present and structurally valid. Live service verification is still required.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
