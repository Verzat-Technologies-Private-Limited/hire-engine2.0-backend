const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./index');
const logger = require('./logger');

/**
 * Configure Passport.js OAuth strategies.
 * Strategies find-or-create users on OAuth callback.
 * Actual user upsert logic lives in the auth service.
 */

// ── Google OAuth 2.0 ──────────────────────────────
if (config.google.clientId && config.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        scope: ['profile', 'email'],
      },
      (accessToken, refreshToken, profile, done) => {
        // Pass the profile to the route handler via done()
        // Actual DB logic is in auth.service.js
        const userData = {
          authProvider: 'google',
          authProviderId: profile.id,
          email: profile.emails?.[0]?.value || '',
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          avatar: profile.photos?.[0]?.value || '',
        };
        return done(null, userData);
      }
    )
  );
  logger.info('Passport: Google OAuth strategy registered');
} else {
  logger.warn('Passport: Google OAuth credentials not configured — strategy skipped');
}

// Passport serialize/deserialize — we use JWTs, so these are minimal stubs
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
