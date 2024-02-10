import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import { UpdateQueue, processUpdate } from './updateQueue';
import {
	FunctionComponet,
	HostComponent,
	HostRoot,
	HostText,
	Fragment,
	ContextProvider
} from './workTag';
import { mountChildFibers, reconcileChildFibers } from './childFiber';
import { renderWithHooks } from './fiberHooks';
import { Lane } from './fiberLanes';
import { Ref } from './fiberFlag';
import { pushProvider } from '../fiberContext';

export const beginWork = (fiber: FiberNode, lane: Lane) => {
	//根据tag来判断进行什么操作,并且返回子Fiber
	switch (fiber.tag) {
		case HostRoot:
			return updateHostRoot(fiber, lane);
		case HostComponent:
			return updateHostComponent(fiber);
		case HostText:
			return null;
		case FunctionComponet:
			return updateFunctionComponent(fiber, lane);
		case Fragment:
			return updateFragment(fiber);
		case ContextProvider:
			return updateProvider(fiber);
		default:
			if (__DEV__) {
				console.warn('没有实现的tag', fiber.tag);
			}
			break;
	}
	return null;
};

function updateProvider(fiber: FiberNode) {
	const provider = fiber.type;
	const context = provider._context;
	const pendingProps = fiber.pendingProps;
	const nextChildren = pendingProps.children;
	pushProvider(context, pendingProps.value);
	//比较current中的fiber和新的children，生成新的子fiberNode
	reconcileChildren(fiber, nextChildren);
	return fiber.child;
}

/**
 *
 * @param fiber
 * 更新HostRoot:
 * 1.获取最新的state
 * 2.返回子fiberNode
 */
function updateHostRoot(fiber: FiberNode, lane: Lane) {
	const baseState = fiber.memoizedState;
	const updateQueue = fiber.updateQueue as UpdateQueue<ReactElementType>;
	const pending = updateQueue.shared.pending;
	//执行更新后updateQueue重置
	updateQueue.shared.pending = null;
	const { memoizzedState } = processUpdate(baseState, pending, lane);
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
	markRef(fiber.alternate, fiber);
	reconcileChildren(fiber, nextChildren);
	return fiber.child;
}
/**
 *
 * @param fiber
 * 更新FunctionComponent:
 * 1.返回子fiberNode
 */
function updateFunctionComponent(fiber: FiberNode, lane: Lane) {
	const child = renderWithHooks(fiber, lane);
	//比较current中的fiber和新的children，生成新的子fiberNode
	reconcileChildren(fiber, child);
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
		//update 更新阶段， currentNode的层级要和children一起，因为比较的children的
		wip.child = reconcileChildFibers(wip, current?.child, nextChildren);
	}
}

function updateFragment(fiber: FiberNode) {
	const nextChildren = fiber.pendingProps;
	//比较current中的fiber和新的children，生成新的子fiberNode
	reconcileChildren(fiber, nextChildren);
	return fiber.child;
}

function markRef(current: FiberNode | null, workInProgress: FiberNode) {
	const ref = workInProgress.ref;
	if (
		(current === null && ref !== null) ||
		(current !== null && current.ref !== workInProgress.ref)
	) {
		workInProgress.flag |= Ref;
	}
}
