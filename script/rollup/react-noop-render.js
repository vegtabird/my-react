import { getPackagePath, getBasePlugin, getPackageJson } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import aliasPlugin from '@rollup/plugin-alias';
const { name, module, peerDependencies } = getPackageJson(
	'react-noop-renderer'
);
//react源码路径
const pkgPath = getPackagePath(name);
const distPath = getPackagePath(name, true);
export default [
	{
		input: `${pkgPath}/${module}`,
		output: [
			{
				file: `${distPath}/index.js`,
				name: 'ReactNoopRender',
				format: 'umd'
			}
		],
		plugins: [
			...getBasePlugin({
				typeScriptOption:{
					exclude: ['./packages/react-dom/**/*'],
					tsconfigOverride: {
						compilerOptions: {
							paths: {
								hostConfig: [`./${name}/src/hostConfig.ts`]
							}
						}
					}
				}
			}),
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
		external: [...Object.keys(peerDependencies), 'scheduler']
	}
];
