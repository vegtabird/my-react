import { scheduleMicroTask } from 'hostConfig';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue.ts';
import { beginWork } from './beginWork';
import {
	commitHookEffectListDestory,
	commitHookEffectListUnMount,
	commitHookEffectListUpdate,
	commitLayoutEffects,
	commitMutationEffect
} from './commitWork';
import { completeWork } from './completeWork';
import {
	FiberNode,
	FiberRootNode,
	PendingPassiveEffects,
	createWorkInProgress
} from './fiber';
import { MutationMask, NoFlags, PassiveMask } from './fiberFlag';
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority,
	unstable_cancelCallback,
	unstable_scheduleCallback,
	unstable_shouldYield
} from 'scheduler';
import {
	Lane,
	NoLane,
	SyncLane,
	getNextLane,
	lanesToSchedulerPriority,
	markRootFinished,
	markRootSuspended,
	mergeLanes
} from './fiberLanes';
import { HostRoot } from './workTag';
import { HookHasEffect, Passive } from './hooksEffectTags.js';
import { SuspenseException, getSuspenseThenable } from './thenable.js';
import { resetOnUnwind } from './fiberHooks.js';
import { throwException } from './fiberThrow.js';
import { unwindWork } from './fiberUnWind.js';

let workInProgress: FiberNode | null = null; //正在工作中的FiberNode;
let wipRootRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffects: boolean = false;
// 工作中的状态
const RootInProgress = 0;
//work 未完成
const RootInComplete = 1;
//已经完成
const RootCompleted = 2;
// 未完成状态，不用进入commit阶段
const RootDidNotComplete = 3;
let workInProgressRootExitStatus: number = RootInProgress;
const NotSuspended = 0;
const SuspendedOnData = 1;
type SuspendedReason = typeof NotSuspended | typeof SuspendedOnData;
let workingInProgressSuspendedReason: SuspendedReason = NotSuspended;
let workingInProgressThrowValue: any = null;
function prepareProgress(node: FiberRootNode, lane: Lane) {
	node.finishedLane = NoLane;
	node.finishedWork = null;
	workInProgress = createWorkInProgress(node.current, {});
	wipRootRenderLane = lane;
	workInProgressRootExitStatus = RootInProgress;
	workingInProgressSuspendedReason = NotSuspended;
	workingInProgressThrowValue = null;
}

function performComplete(fiber: FiberNode) {
	let node: FiberNode | null = fiber;
	do {
		//处理递归的归也就是开始向上反馈了
		completeWork(node);
		if (node.sibling) {
			//如果存在兄弟则继续遍历兄弟
			workInProgress = node.sibling;
			return;
		} else {
			//不存在兄弟,那么就向上处理父亲节点
			node = node.return;
			workInProgress = node;
		}
	} while (node !== null);
}

function performUnitWork(fiber: FiberNode) {
	//使用深度优先处理fiber
	const next = beginWork(fiber, wipRootRenderLane);
	fiber.memorizedProps = fiber.pendingProps;
	if (next !== null) {
		//存在子节点,继续遍历子节点 回到workLoop
		workInProgress = next;
	} else {
		//不存在子节点那么已经到最深处就开始处理
		performComplete(fiber);
	}
}

function workLoopSync() {
	while (workInProgress !== null) {
		performUnitWork(workInProgress);
	}
}
function workLoopConcurrent() {
	while (workInProgress !== null && !unstable_shouldYield()) {
		performUnitWork(workInProgress);
	}
}

function renderRoot(node: FiberRootNode, lane: Lane, shouldTimeSlice: boolean) {
	if (__DEV__) {
		console.log('开始render shouldTimeSlice', shouldTimeSlice, node);
	}
	if (wipRootRenderLane !== lane) {
		//一致时代表的是同一次的多次调度所以不需要重置
		prepareProgress(node, lane);
	}
	do {
		try {
			if (workingInProgressSuspendedReason !== NotSuspended && workInProgress) {
				const throwValue = workingInProgressThrowValue;
				workingInProgressSuspendedReason = NotSuspended;
				workingInProgressThrowValue = null;
				//unwind
				throwAndUnwindWorkLoop(node, workInProgress, throwValue, lane);
			}
			shouldTimeSlice ? workLoopConcurrent() : workLoopSync();
			break;
		} catch (e) {
			console.warn('workProgress报错', e);
			handleThrwoError(node, e);
		}
	} while (true);
	if (workInProgressRootExitStatus !== RootInProgress) {
		return workInProgressRootExitStatus;
	}
	if (shouldTimeSlice && workInProgress !== null) {
		return RootInComplete;
	}
	if (!shouldTimeSlice && workInProgress !== null && __DEV__) {
		console.warn('wordInprogress应该为空');
	}
	return RootCompleted;
}

function unwindUnitOfWork(unitOfWork: FiberNode) {
	let incompleteWork: FiberNode | null = unitOfWork;
	do {
		//判断当前节点是否为suspense
		const next = unwindWork(incompleteWork);
		if (next) {
			workInProgress = next;
			return;
		} else {
			//当前不是往父元素找
			const returnFiber = incompleteWork.return as FiberNode;
			if (returnFiber) {
				returnFiber.deletions = [];
			}
			incompleteWork = returnFiber;
		}
	} while (incompleteWork !== null);
	workInProgress = null;
	workInProgressRootExitStatus = RootDidNotComplete;
}

function throwAndUnwindWorkLoop(
	root: FiberRootNode,
	unitOfWork: FiberNode,
	throwValue: any,
	lane: Lane
) {
	//reset FC
	resetOnUnwind();
	//触发更新
	throwException(root, throwValue, lane);
	//unwind
	unwindUnitOfWork(unitOfWork);
}

function handleThrwoError(root: FiberRootNode, error: any) {
	if (error === SuspenseException) {
		error = getSuspenseThenable();
		workingInProgressSuspendedReason = SuspendedOnData;
	}
	workingInProgressThrowValue = error;
}

function performConcurrentWorkOnRoot(
	root: FiberRootNode,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	didTimeOut?: boolean
): any {
	console.log('concurrent');
	const callback = root.callbackNode;
	//执行effect回调，获取最高优先级的调度
	const didExecuteEffect = flushPassiveEffects(root.pendingPassiveEffects);
	if (didExecuteEffect && callback !== root.callbackNode) {
		return null;
	}
	const updateLane = getNextLane(root);
	const currentCallback = root.callbackNode;
	const existStatus = renderRoot(root, updateLane, true);
	switch (existStatus) {
		case RootInComplete:
			if (currentCallback !== root.callbackNode) {
				//被更高优先级打断
				return null;
			}
			return performConcurrentWorkOnRoot.bind(null, root);
		case RootCompleted:
			root.finishedWork = root.current.alternate;
			wipRootRenderLane = NoLane;
			root.finishedLane = updateLane;
			commitRoot(root);
			break;
		case RootDidNotComplete:
			wipRootRenderLane = NoLane;
			markRootSuspended(root, updateLane);
			ensureRootIsScheduled(root);
			break;
		default:
			if (__DEV__) {
				console.warn('不应该执行这里');
			}
	}
	return null;
}

function performSyncWorkOnRoot(node: FiberRootNode) {
	const nextLane = getNextLane(node);
	if (nextLane !== SyncLane) {
		ensureRootIsScheduled(node);
		return;
	}
	const existStatus = renderRoot(node, nextLane, false);
	switch (existStatus) {
		case RootCompleted:
			node.finishedWork = node.current.alternate;
			node.finishedLane = nextLane;
			wipRootRenderLane = NoLane;
			commitRoot(node);
			break;
		case RootDidNotComplete:
			wipRootRenderLane = NoLane;
			markRootSuspended(node, nextLane);
			ensureRootIsScheduled(node);
			break;
		default:
			if (__DEV__) {
				console.error('还未实现的同步更新结束状态');
			}
			break;
	}
}

function flushPassiveEffects(effects: PendingPassiveEffects) {
	console.log('execute effects');
	let didExecuteEffect = false;
	//执行unmount的effect
	effects.unmount.forEach((effect) => {
		//执行unmount
		didExecuteEffect = true;
		commitHookEffectListUnMount(Passive, effect);
	});
	effects.unmount = [];
	effects.update.forEach((effect) => {
		didExecuteEffect = true;
		//执行上一次的destory
		commitHookEffectListDestory(Passive | HookHasEffect, effect);
	});
	effects.update.forEach((effect) => {
		didExecuteEffect = true;
		//执行新的effect
		commitHookEffectListUpdate(Passive | HookHasEffect, effect);
	});
	effects.update = [];
	flushSyncCallbacks();
	return didExecuteEffect;
}

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;
	if (finishedWork === null) {
		return;
	}

	if (__DEV__) {
		console.warn('commit开始', finishedWork);
	}
	const lane = root.finishedLane;
	if (lane === NoLane && __DEV__) {
		console.error('commit阶段finishedLane不应该是NoLane');
	}
	//重置
	root.finishedWork = null;
	root.finishedLane = NoLane;
	markRootFinished(root, lane);
	//调度副作用
	if (
		(finishedWork.flag & PassiveMask) !== NoFlags ||
		(finishedWork.subTreeFlag & PassiveMask) !== NoFlags
	) {
		//调度
		if (!rootDoesHasPassiveEffects) {
			rootDoesHasPassiveEffects = true;
			scheduleCallback(NormalPriority, () => {
				//执行回调
				flushPassiveEffects(root.pendingPassiveEffects);
			});
		}
	}
	//判断是否需要有flag操作
	const subTreeHasEffect =
		(MutationMask & finishedWork.subTreeFlag) !== NoFlags;
	const rootHasEffect = (MutationMask & finishedWork.flag) !== NoFlags;

	if (subTreeHasEffect || rootHasEffect) {
		//beforeMutation
		//Mutation
		commitMutationEffect(finishedWork, root);
		//切换fiber树到current上
		root.current = finishedWork;

		///layourt
		commitLayoutEffects(finishedWork, root);
	} else {
		root.current = finishedWork;
	}
	rootDoesHasPassiveEffects = false;
	console.log('end of commit');
	ensureRootIsScheduled(root);
}

//从当前fiber节点找到根容器
function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = node.return;
	while (parent) {
		node = parent;
		parent = node.return;
	}
	if (node.tag === HostRoot) {
		return node.stateNode;
	}
	return null;
}

export function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

export function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getNextLane(root);
	const existingCallback = root.callbackNode;
	console.log('start secdule', updateLane, NoLane);
	if (updateLane === NoLane) {
		existingCallback && unstable_cancelCallback(existingCallback);
		root.callbackNode = null;
		root.callbackPriority = NoLane;
		return;
	}
	const curPriority = updateLane;
	const prevPriority = root.callbackPriority;
	if (curPriority === prevPriority) {
		//优先级一样，不重制调度
		return;
	}
	//优先级不一样，清除上一次调度
	existingCallback && unstable_cancelCallback(existingCallback);
	let newCallback = null;
	if (updateLane === SyncLane) {
		// 同步优先级 用微任务调度
		if (__DEV__) {
			console.log('在微任务中调度，优先级：', updateLane);
		}
		// [performSyncWorkOnRoot, performSyncWorkOnRoot, performSyncWorkOnRoot]
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
		scheduleMicroTask(flushSyncCallbacks);
	} else {
		const priority = lanesToSchedulerPriority(updateLane);
		newCallback = unstable_scheduleCallback(
			priority,
			performConcurrentWorkOnRoot.bind(null, root)
		);
	}
	root.callbackNode = newCallback;
	root.callbackPriority = curPriority;
}

//开始更新
export function scheduleUpdateOnFiber(node: FiberNode, lane: Lane) {
	//找寻根容器
	const rootContainer = markUpdateFromFiberToRoot(node);
	markRootUpdated(rootContainer, lane);
	ensureRootIsScheduled(rootContainer);
}
