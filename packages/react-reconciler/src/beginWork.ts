import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import { UpdateQueue, processUpdate } from './updateQueue';
import { HostComponent, HostRoot, HostText } from './workTag';
import { __DEV__ } from '.';
import { mountChildFibers, reconcileChildFibers } from './childFiber';

export const beginWork = (fiber: FiberNode) => {
	//根据tag来判断进行什么操作,并且返回子Fiber
	switch (fiber.tag) {
		case HostRoot:
			return updateHostRoot(fiber);
		case HostComponent:
			return updateHostComponent(fiber);
		case HostText:
			return null;
		default:
			if (__DEV__) {
				console.warn('没有实现的tag', fiber.tag);
			}
			break;
	}
	return null;
};
/**
 *
 * @param fiber
 * 更新HostRoot:
 * 1.获取最新的state
 * 2.返回子fiberNode
 */
function updateHostRoot(fiber: FiberNode) {
	const baseState = fiber.memoizedState;
	const updateQueue = fiber.updateQueue as UpdateQueue<ReactElementType>;
	const pending = updateQueue.shared.pending;
	//执行更新后updateQueue重置
	updateQueue.shared.pending = null;
	const { memoizzedState } = processUpdate(baseState, pending);
	fiber.memoizedState = memoizzedState;
	//比较current中的fiber和新的children，生成新的子fiberNode
	reconcileChildren(fiber, memoizzedState);
	return fiber.child;
}
/**
 *
 * @param fiber
 * 更新HostRoot:
 * 1.返回子fiberNode
 */
function updateHostComponent(fiber: FiberNode) {
	const nextChildren = fiber.pendingProps.children;
	//比较current中的fiber和新的children，生成新的子fiberNode
	reconcileChildren(fiber, nextChildren);
	return fiber.child;
}
/**
 *
 * @param wip 正在更新的fiberTree
 * @param nextChildren wip的子节点的新的reactElement
 */
function reconcileChildren(
	wip: FiberNode,
	nextChildren?: ReactElementType | null
) {
	//获取目前已经渲染的fiber
	const current = wip.alternate;
	if (current === null) {
		//mound 挂载阶段
		wip.child = mountChildFibers(wip, null, nextChildren);
	} else {
		//update 更新阶段
		wip.child = reconcileChildFibers(wip, current?.child, nextChildren);
	}
}