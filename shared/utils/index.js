"use strict";
/**
 * Shared Utilities
 *
 * This module provides utility functions shared between frontend and backend.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBooleanSafe = exports.validatePriority = exports.validateAllocationPercentage = exports.validateEmail = exports.validateStringLength = exports.validateRequired = exports.validateDateFormat = exports.validateIntInRange = exports.validateNumericRange = exports.parseFloatSafe = exports.parseIntSafe = void 0;
// Validation utilities
var validation_js_1 = require("./validation.js");
Object.defineProperty(exports, "parseIntSafe", { enumerable: true, get: function () { return validation_js_1.parseIntSafe; } });
Object.defineProperty(exports, "parseFloatSafe", { enumerable: true, get: function () { return validation_js_1.parseFloatSafe; } });
Object.defineProperty(exports, "validateNumericRange", { enumerable: true, get: function () { return validation_js_1.validateNumericRange; } });
Object.defineProperty(exports, "validateIntInRange", { enumerable: true, get: function () { return validation_js_1.validateIntInRange; } });
Object.defineProperty(exports, "validateDateFormat", { enumerable: true, get: function () { return validation_js_1.validateDateFormat; } });
Object.defineProperty(exports, "validateRequired", { enumerable: true, get: function () { return validation_js_1.validateRequired; } });
Object.defineProperty(exports, "validateStringLength", { enumerable: true, get: function () { return validation_js_1.validateStringLength; } });
Object.defineProperty(exports, "validateEmail", { enumerable: true, get: function () { return validation_js_1.validateEmail; } });
Object.defineProperty(exports, "validateAllocationPercentage", { enumerable: true, get: function () { return validation_js_1.validateAllocationPercentage; } });
Object.defineProperty(exports, "validatePriority", { enumerable: true, get: function () { return validation_js_1.validatePriority; } });
Object.defineProperty(exports, "toBooleanSafe", { enumerable: true, get: function () { return validation_js_1.toBooleanSafe; } });
