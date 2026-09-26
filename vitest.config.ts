import { defineConfig } from "vitest/config";
import os from "os";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    // Never let a test touch the real ./data directory
    env: { DATA_DIR: path.join(os.tmpdir(), "hiveos-vitest-no-data") },
  },
});
