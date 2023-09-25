import { defineConfig } from "vite";

export default defineConfig({
    plugins: [],
    build: {
        sourcemap: true,
        outDir: "./dist",
        emptyOutDir: false,
        lib: {
            name: "use-typed-reducer",
            entry: "./src/index.ts",
            fileName: "index",
            formats: ["cjs", "es", "umd"],
        },
        rollupOptions: {
            treeshake: true,
            external: ["react"],
        },
    },
});
