import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
    plugins: [dts({ outDir: "./dist", tsconfigPath: "./tsconfig.json" })],
    build: {
        sourcemap: true,
        outDir: "./dist",
        emptyOutDir: false,
        lib: {
            name: "use-typed-reducer",
            entry: "./src/index.ts",
            fileName: "index",
            formats: ["cjs", "es", "umd"]
        },
        rollupOptions: {
            treeshake: true,
            external: ["react"]
        }
    }
});
