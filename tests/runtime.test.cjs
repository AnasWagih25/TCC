const { test } = require('node:test');
const { execFileSync } = require('node:child_process');

test('production Firebase and mail imports work when the host disables CommonJS loading of ES modules', () => {
  execFileSync(process.execPath, ['--no-experimental-require-module', '-e', 'require("firebase-admin/auth"); require("firebase-admin/firestore"); require("nodemailer");'], { cwd: process.cwd(), stdio: 'pipe' });
});
