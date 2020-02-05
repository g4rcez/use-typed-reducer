import resolve from "@rollup/plugin-node-resolve";
import url from "@rollup/plugin-url";
import commonjs from "rollup-plugin-commonjs";
import external from "rollup-plugin-peer-deps-external";
import strip from "@rollup/plugin-strip";
import typescript from "rollup-plugin-typescript2";
import visualizer from "rollup-plugin-visualizer";
import pkg from "./package.json";

export default {
	input: "src/index.ts",
	cache: true,
	output: [
		{
			file: pkg.main,
			format: "cjs",
			exports: "named",
			sourcemap: false
		},
		{
			file: pkg.module,
			format: "es",
			exports: "named",
			sourcemap: false
		},
		{
			file: pkg.module,
			format: "esm",
			exports: "named",
			sourcemap: false
		}
	],
	external: ["react"],
	plugins: [
		strip(),
		external(),
		url(),
		visualizer(),
		commonjs({ sourceMap: false, ignoreGlobal: false }),
		typescript({ rollupCommonJSResolveHack: true, clean: true }),
		resolve({ dedupe: true, browser: true, preferBuiltins: false })
	]
};
