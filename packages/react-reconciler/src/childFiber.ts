import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode, createFiberFromElement } from './fiber';
import { HostText } from './workTag';
import { Placement } from './fiberFlag';

/**
 *
 * @param shouldEffect 是否会有副作用 用于优化挂载时多个placement合并
 */
function ChildReconciler(shouldEffect: boolean) {
	//根据reactElement创建对应的fiber
	function reconcilerSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild: ReactElementType
	) {
		const childFiber = createFiberFromElement(newChild);
		childFiber.return = returnFiber;
		return childFiber;
	}
	//根据文本创建对应的fiber
	function reconcilerSingleText(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: string | number
	) {
		const childFiber = new FiberNode(HostText, { content }, null);
		childFiber.return = returnFiber;
		return childFiber;
	}
	function placeSingleFiber(fiber: FiberNode) {
		//当前fiber无alternate代表是挂载
		if (shouldEffect && fiber.alternate === null) {
			fiber.flag |= Placement;
		}
		return fiber;
	}
	return function recondilerChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: ReactElementType | null
	) {
		//当前child有效，创建对应的Fiber
		if (typeof newChild === 'object' && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleFiber(
						reconcilerSingleElement(returnFiber, currentFiber, newChild)
					);
				default:
					if (__DEV__) {
						console.warn('没有实现的child type', newChild.$$typeof);
					}
			}
		}
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleFiber(
				reconcilerSingleText(returnFiber, currentFiber, newChild)
			);
		}
		if (__DEV__) {
			console.warn('无效的child类型', newChild);
		}
		return null;
	};
}

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);
