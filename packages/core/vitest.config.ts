import { defineConfig } from 'vitest/config';

// Several tests check published odds by drawing thousands of times. They are bound by
// the processor, not by waiting, and a build machine is slower than a desk. The default
// limit of five seconds would fail them there for no reason.
export default defineConfig({
  test: { testTimeout: 60_000 },
});
