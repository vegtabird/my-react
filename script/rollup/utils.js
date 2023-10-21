import ts from 'rollup-plugin-typescript2';
import cs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import fs from 'fs';
import path from 'path';

const pkgPath = path.resolve(__dirname, '../../packages');
const distPath = path.resolve(__dirname, '../../dist/node_modules');
export function getBasePlugin({
	typeScriptOption = {},
	alias = {
		__DEV__: true
	}
} = {}) {
	return [replace(alias), cs(), ts(typeScriptOption)];
}

export function getPackageJson(pkgName) {
	const packageJsonPath = `${getPackagePath(pkgName)}/package.json`;
	const jsonStr = fs.readFileSync(packageJsonPath, { encoding: 'utf-8' });
	return JSON.parse(jsonStr);
}

export function getPackagePath(pkgName, isDist = false) {
	if (isDist) {
		return `${distPath}/${pkgName}`;
	}
	return `${pkgPath}/${pkgName}`;
}
