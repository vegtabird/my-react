import { FiberNode } from './fiber';

export const renderWithHooks = (fiber: FiberNode) => {
	//函数式组件时，jsx转换会将函数存在ReactElement的type上面
	/**
	 * function App(){return <div>11</div>}
	 * child = App()
	 */
	const Component = fiber.type;
	const props = fiber.pendingProps;
	const children = Component(props);
	return children;
};
