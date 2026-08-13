const fs = require('fs');
const path = require('path');
const logger = require('../../config/logger');

/**
 * Country plugin registry.
 * Auto-discovers and loads all country plugins from subdirectories.
 *
 * Each subdirectory (e.g., IN/, US/) is expected to export a class
 * that extends BaseCountryPlugin via its index.js file.
 *
 * Adding a new country = adding a new folder. Nothing else to change.
 */

/** @type {Map<string, import('./base.plugin')>} */
const registry = new Map();
let loaded = false;

/**
 * Load all country plugins from the countries directory.
 * Scans for subdirectories and requires their index.js.
 */
function loadPlugins() {
  if (loaded) return;

  const countriesDir = __dirname;
  const entries = fs.readdirSync(countriesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pluginPath = path.join(countriesDir, entry.name, 'index.js');

    if (!fs.existsSync(pluginPath)) {
      logger.warn(`Country directory "${entry.name}" has no index.js — skipped`);
      continue;
    }

    try {
      const PluginClass = require(pluginPath);
      const plugin = new PluginClass();

      // Validate the plugin implements the required interface
      if (!plugin.code || !plugin.name || !plugin.currency) {
        logger.warn(
          `Country plugin "${entry.name}" is missing required properties (code, name, currency) — skipped`
        );
        continue;
      }

      registry.set(plugin.code.toUpperCase(), plugin);
      logger.info(`Country plugin loaded: ${plugin.code} (${plugin.name})`);
    } catch (error) {
      logger.error(`Failed to load country plugin "${entry.name}"`, {
        error: error.message,
      });
    }
  }

  loaded = true;
  logger.info(`Country plugin registry: ${registry.size} plugins loaded`);
}

/**
 * Get a country plugin by ISO code.
 * @param {string} countryCode - ISO 3166-1 alpha-2 code (e.g., 'IN', 'US')
 * @returns {import('./base.plugin')}
 * @throws {Error} If plugin not found
 */
function getCountryPlugin(countryCode) {
  loadPlugins(); // Ensure plugins are loaded (idempotent)

  const code = countryCode.toUpperCase();
  const plugin = registry.get(code);

  if (!plugin) {
    const ApiError = require('../../utils/ApiError');
    const available = [...registry.keys()].join(', ');
    throw ApiError.badRequest(
      `Country "${code}" is not supported. Available: ${available || 'none'}`
    );
  }

  return plugin;
}

/**
 * Get all loaded country plugins.
 * @returns {Array<{ code: string, name: string, currency: string }>}
 */
function getAllCountryPlugins() {
  loadPlugins();
  return [...registry.values()].map((p) => ({
    code: p.code,
    name: p.name,
    currency: p.currency,
    locale: p.locale,
    paymentProvider: p.getPaymentProvider(),
  }));
}

/**
 * Check if a country is supported.
 * @param {string} countryCode
 * @returns {boolean}
 */
function isCountrySupported(countryCode) {
  loadPlugins();
  return registry.has(countryCode.toUpperCase());
}

module.exports = {
  getCountryPlugin,
  getAllCountryPlugins,
  isCountrySupported,
  loadPlugins,
};
