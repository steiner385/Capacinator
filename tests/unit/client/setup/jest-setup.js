// Add TextEncoder/TextDecoder polyfills for Jest environment
global.TextEncoder = global.TextEncoder || require('util').TextEncoder;
global.TextDecoder = global.TextDecoder || require('util').TextDecoder;

// Mock fetch if needed
global.fetch = global.fetch || (() => Promise.resolve({ 
  json: () => Promise.resolve({}) 
}));

// Mock ResizeObserver
global.ResizeObserver = global.ResizeObserver || class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = global.IntersectionObserver || class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};