import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols';
import { Props, ReactElementType } from 'shared/ReactTypes';
import {
	FiberNode,
	createFiberFromElement,
	createFiberFromFragment,
	createWorkInProgress
} from './fiber';
import { Fragment, HostText } from './workTag';
import { ChildDeletion, Placement } from './fiberFlag';
type ExistingChildren = Map<number | string, FiberNode>;
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
			returnFiber.flag |= ChildDeletion;
		} else {
			deletions.push(childToDelete);
		}
	}
	function deleteRemainingChild(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null
	) {
		if (!shouldEffect) {
			return;
		}
		let childToDelete = currentFiber;
		while (childToDelete !== null) {
			deleteChild(returnFiber, childToDelete);
			childToDelete = childToDelete.sibling;
		}
	}
	//根据reactElement创建对应的fiber
	function reconcilerSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild: ReactElementType
	) {
		const { type, key, $$typeof } = newChild;
		while (currentFiber !== null) {
			//update
			if (key === currentFiber.key) {
				if ($$typeof === REACT_ELEMENT_TYPE) {
					let props = newChild.props;
					if (type === currentFiber.type) {
						if (type === REACT_FRAGMENT_TYPE) {
							props = newChild.props.children;
						}
						//update
						const existing = useFiber(currentFiber, props);
						existing.return = returnFiber;
						//可以复用当前节点，删除兄弟节点
						deleteRemainingChild(returnFiber, currentFiber.sibling);
						return existing;
					}
					//删除元素
					deleteRemainingChild(returnFiber, currentFiber);
					break;
				} else if (__DEV__) {
					console.warn('错误的reactElement', newChild);
					break;
				}
			} else {
				//删除
				deleteChild(returnFiber, currentFiber);
				currentFiber = currentFiber.sibling;
			}
		}
		let childFiber: FiberNode;
		if (type === REACT_FRAGMENT_TYPE) {
			childFiber = createFiberFromFragment(newChild.props.children, key);
		} else {
			childFiber = createFiberFromElement(newChild);
		}
		childFiber.return = returnFiber;
		return childFiber;
	}
	//根据文本创建对应的fiber
	function reconcilerSingleText(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: string | number
	) {
		while (currentFiber !== null) {
			if (currentFiber.tag === HostText) {
				const existing = useFiber(currentFiber, { content });
				existing.return = returnFiber;
				deleteRemainingChild(returnFiber, currentFiber.sibling);
				return existing;
			}
			deleteChild(returnFiber, currentFiber);
			currentFiber = currentFiber.sibling;
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
	function updateFiberFromMap(
		returnFiber: FiberNode,
		existingChildren: ExistingChildren,
		index: number,
		child: any
	): FiberNode | null {
		const key = child.key !== null ? child.key : index;
		const before = existingChildren.get(key);
		//HostText是否可以复用
		if (typeof child === 'string' || typeof child === 'number') {
			if (before) {
				if (before.tag === HostText) {
					existingChildren.delete(key);
					return useFiber(before, { content: child + '' });
				}
			}
			return new FiberNode(HostText, { content: child + '' }, null);
		}
		//HostComponent
		if (typeof child === 'object' && child !== null) {
			// if (before) {
			// 	if (before.type === child.type) {
			// 		existingChildren.delete(key);
			// 		return useFiber(before, child.props);
			// 	}
			// }
			// return createFiberFromElement(child);
			switch (child.$$typeof) {
				case REACT_ELEMENT_TYPE:
					if (child.type === REACT_FRAGMENT_TYPE) {
						return updateFragment(
							returnFiber,
							before,
							child,
							key,
							existingChildren
						);
					}
					if (before) {
						if (before.type === child.type) {
							existingChildren.delete(key);
							return useFiber(before, child.props);
						}
					}
					return createFiberFromElement(child);
			}

			// TODO 数组类型
			if (Array.isArray(child)) {
				return updateFragment(
					returnFiber,
					before,
					child,
					key,
					existingChildren
				);
			}
		}
		return null;
	}
	function reconcileChildrenArray(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild: any[]
	) {
		//保存current->map
		const existingChildren: ExistingChildren = new Map();
		while (currentFiber !== null) {
			const keyToUse =
				currentFiber.key !== null ? currentFiber.key : currentFiber.index;
			existingChildren.set(keyToUse, currentFiber);
			currentFiber = currentFiber.sibling;
		}
		// 最后一个可复用fiber在current中的index
		let lastPlacedIndex: number = 0;
		// 创建的最后一个fiber
		let lastNewFiber: FiberNode | null = null;
		// 创建的第一个fiber
		let firstNewFiber: FiberNode | null = null;
		//遍历child 是否可复用
		for (let i = 0; i < newChild.length; ++i) {
			const after = newChild[i];
			const newFiber = updateFiberFromMap(
				returnFiber,
				existingChildren,
				i,
				after
			);
			if (newFiber === null) {
				continue;
			}
			newFiber.return = returnFiber;
			newFiber.index = i;
			//标记插入or移动
			if (lastNewFiber === null) {
				firstNewFiber = newFiber;
				lastNewFiber = newFiber;
			} else {
				lastNewFiber.sibling = newFiber;
				lastNewFiber = lastNewFiber.sibling;
			}

			if (!shouldEffect) {
				continue;
			}
			const current = newFiber.alternate;
			if (current) {
				const oldIndex = current.index;
				if (oldIndex < lastPlacedIndex) {
					//移动 新child顺序已经是在最右了，所以当在老的index小于lastPlacedIndex代表在老的位置中，在左侧，新的在右侧所以要移动到右侧
					newFiber.flag |= Placement;
					continue;
				} else {
					lastPlacedIndex = oldIndex;
				}
			} else {
				//mount
				newFiber.flag |= Placement;
			}
		}

		//删除剩余
		existingChildren.forEach((fiber) => deleteChild(returnFiber, fiber));
		return firstNewFiber;
	}
	return function recondilerChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: any
	) {
		//当前节点为一个fragment且没有key
		const unKeyFrgament =
			typeof newChild === 'object' &&
			newChild !== null &&
			newChild.type == REACT_FRAGMENT_TYPE &&
			newChild.key === null;
		if (unKeyFrgament) {
			newChild = newChild?.props.children;
		}
		//当前child有效，创建对应的Fiber
		if (typeof newChild === 'object' && newChild !== null) {
			if (Array.isArray(newChild)) {
				return reconcileChildrenArray(returnFiber, currentFiber, newChild);
			}
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
			deleteRemainingChild(returnFiber, currentFiber);
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

function updateFragment(
	returnFiber: FiberNode,
	before: FiberNode | undefined,
	element: any[],
	keyToUse: string,
	existingChildren: ExistingChildren
) {
	let fiber;
	if (!before || before.tag !== Fragment) {
		fiber = createFiberFromFragment(element, keyToUse);
	} else {
		fiber = useFiber(before, element);
		existingChildren.delete(keyToUse);
	}
	fiber.return = returnFiber;
	return fiber;
}

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);
