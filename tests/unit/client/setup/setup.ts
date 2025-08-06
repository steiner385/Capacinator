import '@testing-library/jest-dom';

// Add TextEncoder/TextDecoder polyfills for Jest
import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, {
  TextEncoder,
  TextDecoder,
});