import '@testing-library/jest-dom'

// Recharts uses ResizeObserver which jsdom doesn't support
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
