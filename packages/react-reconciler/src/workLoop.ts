import { scheduleMicroTask } from 'hostConfig';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue.ts';
import { beginWork } from './beginWork';
import {
	commitHookEffectListDestory,
	commitHookEffectListUnMount,
	commitHookEffectListUpdate,
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
	unstable_NormalPriority as NormalPriority
} from 'scheduler';
import {
	Lane,
	NoLane,
	SyncLane,
	getHighestPriorityLane,
	markRootFinished,
	mergeLanes
} from './fiberLanes';
import { HostRoot } from './workTag';
import { HookHasEffect, Passive } from './hooksEffectTags.js';

let workInProgress: FiberNode | null = null; //正在工作中的FiberNode;
let wipRootRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffects: boolean = false;
function prepareProgress(node: FiberRootNode, lane: Lane) {
	workInProgress = createWorkInProgress(node.current, {});
	wipRootRenderLane = lane;
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

function workLoop() {
	while (workInProgress !== null) {
		performUnitWork(workInProgress);
	}
}

function performSyncWorkOnRoot(node: FiberRootNode, lane: Lane) {
	const nextLane = getHighestPriorityLane(node.pendingLanes);
	if (nextLane !== SyncLane) {
		ensureRootIsScheduled(node);
		return;
	}
	//准备阶段
	prepareProgress(node, lane);
	do {
		try {
			workLoop();
		} catch (e) {
			console.warn('workProgress报错', e);
			workInProgress = null;
		}
	} while (workInProgress !== null);
	node.finishedWork = node.current.alternate;
	wipRootRenderLane = NoLane;
	commitRoot(node, lane);
}

function flushPassiveEffects(effects: PendingPassiveEffects) {
	//执行unmount的effect
	effects.unmount.forEach((effect) => {
		//执行unmount
		commitHookEffectListUnMount(Passive, effect);
	});
	effects.unmount = [];
	effects.update.forEach((effect) => {
		//执行上一次的destory
		commitHookEffectListDestory(Passive | HookHasEffect, effect);
	});
	effects.update.forEach((effect) => {
		//执行新的effect
		commitHookEffectListUpdate(Passive | HookHasEffect, effect);
	});
	effects.update = [];
	flushSyncCallbacks();
}

function commitRoot(root: FiberRootNode, lane: Lane) {
	const finishedWork = root.finishedWork;
	if (finishedWork === null) {
		return;
	}

	if (__DEV__) {
		console.warn('commit开始', finishedWork);
	}
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
	} else {
		root.current = finishedWork;
	}
	rootDoesHasPassiveEffects = false;
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

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHighestPriorityLane(root.pendingLanes);
	if (updateLane === NoLane) {
		return;
	}
	if (updateLane === SyncLane) {
		// 同步优先级 用微任务调度
		if (__DEV__) {
			console.log('在微任务中调度，优先级：', updateLane);
		}
		// [performSyncWorkOnRoot, performSyncWorkOnRoot, performSyncWorkOnRoot]
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
		scheduleMicroTask(flushSyncCallbacks);
	}
}

//开始更新
export function scheduleUpdateOnFiber(node: FiberNode, lane: Lane) {
	//找寻根容器
	const rootContainer = markUpdateFromFiberToRoot(node);
	markRootUpdated(rootContainer, lane);
	ensureRootIsScheduled(rootContainer);
}
