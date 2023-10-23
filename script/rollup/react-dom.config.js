import { getPackagePath, getBasePlugin, getPackageJson } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import aliasPlugin from '@rollup/plugin-alias';
const { name, module } = getPackageJson('react-dom');
//react源码路径
const pkgPath = getPackagePath(name);
const distPath = getPackagePath(name, true);
export default [
	{
		input: `${pkgPath}/${module}`,
		output: [
			{
				file: `${distPath}/index.js`,
				name: 'index.js',
				format: 'umd'
			},
			{
				file: `${distPath}/client.js`,
				name: 'client.js',
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
		]
	}
];
