import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { Props, ReactElementType } from 'shared/ReactTypes';
import {
	FiberNode,
	createFiberFromElement,
	createWorkInProgress
} from './fiber';
import { HostText } from './workTag';
import { ChildDeletion, Placement } from './fiberFlag';

/**
 *
 * @param shouldEffect 是否会有副作用 用于优化挂载时多个placement合并
 */
function ChildReconciler(shouldEffect: boolean) {
	function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
		if (!shouldEffect) {
			return;
		}
		const deletions = returnFiber.deletions;
		if (deletions === null) {
			returnFiber.deletions = [childToDelete];
			//更新tag
			returnFiber.tag |= ChildDeletion;
		} else {
			deletions.push(childToDelete);
		}
	}
	//根据reactElement创建对应的fiber
	function reconcilerSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild: ReactElementType
	) {
		const { type, key, $$typeof } = newChild;
		work: if (currentFiber !== null) {
			//update
			if (key === currentFiber.key) {
				if ($$typeof === REACT_ELEMENT_TYPE) {
					if (type === currentFiber.type) {
						//update
						const existing = useFiber(currentFiber, newChild.props);
						existing.return = returnFiber;
						return existing;
					}
					//删除元素
					deleteChild(returnFiber, currentFiber);
					break work;
				} else if (__DEV__) {
					console.warn('错误的reactElement', newChild);
					break work;
				}
			} else {
				//删除
				deleteChild(returnFiber, currentFiber);
			}
		}
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
		if (currentFiber !== null) {
			if (currentFiber.tag === HostText) {
				const existing = useFiber(currentFiber, { content });
				existing.return = returnFiber;
				return existing;
			}
			deleteChild(returnFiber, currentFiber);
		}
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
		//兜底
		if (currentFiber !== null) {
			deleteChild(returnFiber, currentFiber);
		}
		if (__DEV__) {
			console.warn('无效的child类型', newChild);
		}
		return null;
	};
}

function useFiber(fiber: FiberNode, pendingProps: Props) {
	const clone = createWorkInProgress(fiber, pendingProps);
	clone.index = 0;
	clone.sibling = null;
	return clone;
}

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);
