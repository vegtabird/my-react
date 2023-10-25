import { getPackagePath, getBasePlugin, getPackageJson } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import aliasPlugin from '@rollup/plugin-alias';
const { name, module, peerDependencies } = getPackageJson('react-dom');
//react源码路径
const pkgPath = getPackagePath(name);
const distPath = getPackagePath(name, true);
export default [
	{
		input: `${pkgPath}/${module}`,
		output: [
			{
				file: `${distPath}/index.js`,
				name: 'ReactDom',
				format: 'umd'
			},
			{
				file: `${distPath}/client.js`,
				name: 'client',
				format: 'umd'
			}
		],
		plugins: [
			...getBasePlugin(),
			aliasPlugin({
				entries: {
					hostConfig: `${pkgPath}/src/hostConfig`
				}
			}),
			generatePackageJson({
				inputFolder: pkgPath,
				outputFolder: distPath,
				baseContents: ({ name, version, description }) => {
					return {
						name,
						version,
						peerDependencies: {
							react: version
						},
						description,
						main: 'index.js'
					};
				}
			})
		],
		external: [...Object.keys(peerDependencies)]
	},
	// react-test-utils
	{
		input: `${pkgPath}/test-utils.ts`,
		output: [
			{
				file: `${distPath}/test-utils.js`,
				name: 'testUtils',
				format: 'umd'
			}
		],
		external: ['react-dom', 'react'],
		plugins: getBasePlugin()
	}
];
