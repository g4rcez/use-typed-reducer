import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        dir: "./tests",
        environment: "jsdom",
        globals: true,
        root: "./tests",
        include: ["./**/*.test.ts", "./*.test.ts"]
    }
});
