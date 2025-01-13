const fs = require("fs");
const typescript = require("@rollup/plugin-typescript");

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

export default {
    input: "src/index.ts",
    plugins: [typescript({ outputToFilesystem: true })],
    external: ["react", "use-sync-external-store"],
    output: [
        {
            file: pkg.module,
            format: "es",
            exports: "named",
            sourcemap: true
        },
        {
            file: pkg.main,
            format: "cjs",
            plugins: [],
            exports: "named",
            sourcemap: true
        }
    ]
};
