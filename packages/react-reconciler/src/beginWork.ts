import { ReactElementType } from 'shared/ReactTypes';
import {
	FiberNode,
	OffscreenChildrenProps,
	createFiberFromFragment,
	createFiberFromOffscreen,
	createWorkInProgress
} from './fiber';
import { UpdateQueue, processUpdate } from './updateQueue';
import {
	FunctionComponet,
	HostComponent,
	HostRoot,
	HostText,
	Fragment,
	ContextProvider,
	SuspenseComponent,
	OffscreenComponent
} from './workTag';
import {
	cloneChildFibers,
	mountChildFibers,
	reconcileChildFibers
} from './childFiber';
import { bailoutHook, renderWithHooks } from './fiberHooks';
import { Lane, Lanes, NoLane, isIncludeLanes } from './fiberLanes';
import {
	ChildDeletion,
	DidCapture,
	NoFlags,
	Placement,
	Ref
} from './fiberFlag';
import { pushProvider } from '../fiberContext';
import { pushSuspenseHandler } from './suspenseContext';

let didRecieveUpdate = false;
export function markDidRecieveUpdate() {
	didRecieveUpdate = true;
}

function checkScheduleStateOrContet(current: FiberNode, lane: Lanes) {
	const lanes = current.lanes;
	if (isIncludeLanes(lanes, lane)) {
		return true;
	}
	return false;
}

function bailouOnAlreadyFinishedWork(wip: FiberNode, renderLane: Lane) {
	if (!isIncludeLanes(wip.childLanes, renderLane)) {
		if (__DEV__) {
			console.log('优化整颗子树');
			//返回null时render loop 就不会继续向下遍历
			return null;
		}
	}
	if (__DEV__) {
		console.warn('bailout一个fiber', wip);
	}
	cloneChildFibers(wip);
	return wip.child;
}

export const beginWork = (fiber: FiberNode, lane: Lane) => {
	didRecieveUpdate = false;
	//判断props,state,type,context是否发生变化
	const current = fiber.alternate;
	if (current !== null) {
		//props & type;
		const oldProps = current.memorizedProps;
		const newProps = fiber.pendingProps;
		if (oldProps !== newProps || fiber.type !== current.type) {
			didRecieveUpdate = true;
		} else {
			//是否存在update更新
			const hasStateOrContext = checkScheduleStateOrContet(current, lane);
			if (!hasStateOrContext) {
				didRecieveUpdate = false;
				switch (fiber.tag) {
					case ContextProvider:
						const newValue = fiber.memorizedProps.value;
						const context = fiber.type._context;
						pushProvider(context, newValue);
						break;
				}
				return bailouOnAlreadyFinishedWork(fiber, lane);
			}
		}
	}
	//消费lane
	fiber.lanes = NoLane;
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
		case SuspenseComponent:
			return updateSuspenseComponent(fiber);
		case OffscreenComponent:
			return updateOffscreenComponent(fiber);
		default:
			if (__DEV__) {
				console.warn('没有实现的tag', fiber.tag);
			}
			break;
	}
	return null;
};

function updateSuspenseComponent(fiber: FiberNode) {
	const nextProps = fiber.pendingProps;
	const nextPrimaryChildren = nextProps.children;
	const nextFallbackChildren = nextProps.fallback;
	let showFallback = false;
	const isSuspended = (fiber.flag & DidCapture) !== NoFlags;
	if (isSuspended) {
		showFallback = true;
		fiber.flag &= ~DidCapture;
	}
	pushSuspenseHandler(fiber);
	if (fiber.alternate) {
		//update
		if (showFallback) {
			//挂起
			return updateSuspenseFallbackChildren(
				fiber,
				nextPrimaryChildren,
				nextFallbackChildren
			);
		} else {
			//正常
			return updateSuspensePrimaryChildren(fiber, nextPrimaryChildren);
		}
	} else {
		//mounted
		if (showFallback) {
			//挂起
			return mountSuspenseFallbackChildren(
				fiber,
				nextPrimaryChildren,
				nextFallbackChildren
			);
		} else {
			//正常
			return mountSuspensePrimaryChildren(fiber, nextPrimaryChildren);
		}
	}
}
function updateSuspensePrimaryChildren(
	workInProgress: FiberNode,
	primaryChildren: any
) {
	const current = workInProgress.alternate as FiberNode;
	const currentPrimaryChildFragment = current.child as FiberNode;
	const currentFallbackChildFragment: FiberNode | null =
		currentPrimaryChildFragment.sibling;

	const primaryChildProps: OffscreenChildrenProps = {
		mode: 'visible',
		children: primaryChildren
	};

	const primaryChildFragment = createWorkInProgress(
		currentPrimaryChildFragment,
		primaryChildProps
	);
	primaryChildFragment.return = workInProgress;
	primaryChildFragment.sibling = null;
	workInProgress.child = primaryChildFragment;

	if (currentFallbackChildFragment !== null) {
		const deletions = workInProgress.deletions;
		if (deletions === null) {
			workInProgress.deletions = [currentFallbackChildFragment];
			workInProgress.flag |= ChildDeletion;
		} else {
			deletions.push(currentFallbackChildFragment);
		}
	}

	return primaryChildFragment;
}

function mountSuspenseFallbackChildren(
	fiber: FiberNode,
	primaryChildren: any,
	fallbackChildren: any
) {
	const primaryChildrenFragmentRrops: OffscreenChildrenProps = {
		mode: 'hidden',
		children: primaryChildren
	};
	const primaryChildFragment = createFiberFromOffscreen(
		primaryChildrenFragmentRrops
	);
	const primaryFallbackFragment = createFiberFromFragment(
		fallbackChildren,
		null
	);

	primaryFallbackFragment.flag |= Placement;

	primaryChildFragment.return = fiber;
	fiber.child = primaryChildFragment;
	primaryChildFragment.sibling = primaryFallbackFragment;
	primaryChildFragment.return = fiber;
	return primaryFallbackFragment;
}

function mountSuspensePrimaryChildren(fiber: FiberNode, primaryChildren: any) {
	const primaryChildrenFragmentRrops: OffscreenChildrenProps = {
		mode: 'visible',
		children: primaryChildren
	};
	const primaryChildFragment = createFiberFromOffscreen(
		primaryChildrenFragmentRrops
	);
	fiber.child = primaryChildFragment;
	primaryChildFragment.return = fiber;
	return primaryChildFragment;
}

function updateSuspenseFallbackChildren(
	fiber: FiberNode,
	primaryChildren: any,
	fallbackChildren: any
) {
	const current = fiber.alternate;
	const currentPrimaryChildren = current!.child as FiberNode;
	const currentPrimaryFallback = currentPrimaryChildren.sibling;
	const primaryChildrenFragmentRrops: OffscreenChildrenProps = {
		mode: 'hidden',
		children: primaryChildren
	};
	const primaryChildrenFragment = createWorkInProgress(
		currentPrimaryChildren,
		primaryChildrenFragmentRrops
	);
	let primaryFallbackFragment;
	if (currentPrimaryFallback === null) {
		primaryFallbackFragment = createFiberFromFragment(fallbackChildren, null);
		primaryFallbackFragment.flag |= Placement;
	} else {
		primaryFallbackFragment = createWorkInProgress(
			currentPrimaryFallback,
			fallbackChildren
		);
	}
	primaryChildrenFragment.return = fiber;
	primaryFallbackFragment.return = fiber;
	primaryChildrenFragment.sibling = primaryFallbackFragment;
	fiber.child = primaryChildrenFragment;
	return primaryFallbackFragment;
}

function updateOffscreenComponent(fiber: FiberNode) {
	const nextProps = fiber.pendingProps;
	const nextChildren = nextProps.children;
	reconcileChildren(fiber, nextChildren);
	return fiber.child;
}

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
	const prevChildren = fiber.memoizedState;
	//执行更新后updateQueue重置
	updateQueue.shared.pending = null;
	const { memoizzedState } = processUpdate(baseState, pending, lane);
	fiber.memoizedState = memoizzedState;
	const current = fiber.alternate;
	if (current) {
		if (!current.memoizedState) {
			current.memoizedState = memoizzedState;
		}
	}
	if (prevChildren === fiber.memoizedState) {
		return bailouOnAlreadyFinishedWork(fiber, lane);
	}
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
	const current = fiber.alternate;
	if (current !== null && !didRecieveUpdate) {
		bailoutHook(fiber, lane);
		return bailouOnAlreadyFinishedWork(fiber, lane);
	}
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
