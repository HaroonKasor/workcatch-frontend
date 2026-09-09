import { defineConfig } from 'vitest/config'

// Two test runners live side by side and must not collide:
//   vitest     — pure logic in src/, runs in Node, milliseconds
//   playwright — real browser in tests/, needs a served build
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
