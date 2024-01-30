import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { FiberNode } from './fiber';
import internals from 'shared/internals';
import {
	Update,
	UpdateQueue,
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	processUpdate
} from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { Lane, NoLane, requestUpdateLane } from './fiberLanes';
import { FiberFlag, PassiveEffect } from './fiberFlag';
import { HookHasEffect, Passive } from './hooksEffectTags';

interface Hook {
	next: Hook | null;
	memorizedState: any;
	updateQueue: unknown;
	baseQueue: Update<any> | null;
	baseState: any;
}

export interface Effect {
	tag: FiberFlag;
	create: EffectCallback | void;
	destroy: EffectCallback | void;
	deps: EffectDeps;
	next: Effect | null;
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
	lastEffect: Effect | null;
}

type EffectCallback = () => void;
type EffectDeps = any[] | null;

const { currentDispatcher, ReactCurrentBatchConfig } = internals;

let workingInProgressHook: Hook | null = null;
let currentlyRenderingFiber: FiberNode | null = null;
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;
export const renderWithHooks = (fiber: FiberNode, lane: Lane) => {
	//函数式组件时，jsx转换会将函数存在ReactElement的type上面
	/**
	 * function App(){return <div>11</div>}
	 * child = App()
	 */
	currentlyRenderingFiber = fiber;
	//重置memoizedState
	fiber.memoizedState = null;
	fiber.updateQueue = null;
	const current = fiber.alternate;
	renderLane = lane;
	if (current !== null) {
		//update
		currentDispatcher.current = updatedDispatcher;
	} else {
		//mounted
		currentDispatcher.current = mountedDispatcher;
	}
	const Component = fiber.type;
	const props = fiber.pendingProps;
	const children = Component(props);
	currentlyRenderingFiber = null;
	currentHook = null;
	workingInProgressHook = null;
	renderLane = NoLane;
	return children;
};

function updateState<State>(): [State, Dispatch<State>] {
	const hook = updatedProgressHook();
	const queue = hook.updateQueue as UpdateQueue<State>;
	const pending = queue.shared.pending;
	let baseQueue = currentHook!.baseQueue;
	const baseState = hook.baseState;
	//存在上一次的跳过合并pending
	if (pending !== null) {
		if (baseQueue) {
			const firstBase = baseQueue.next;
			const firstPending = pending.next;
			baseQueue.next = firstPending;
			pending.next = firstBase;
		}
		baseQueue = pending;
		currentHook!.baseQueue = pending;
		queue.shared.pending = null;
	}
	if (baseQueue !== null) {
		const {
			memoizzedState,
			baseQueue: newBaseQueue,
			baseState: newBaseState
		} = processUpdate(baseState, baseQueue, renderLane);
		hook.memorizedState = memoizzedState;
		hook.baseState = newBaseState;
		hook.baseQueue = newBaseQueue;
	}
	return [hook.memorizedState, queue.dispatch as Dispatch<State>];
}

function mountedState<State>(
	initState: (() => State) | State
): [State, Dispatch<State>] {
	const hook = mountedProgressHook();
	let memoizedState;
	if (initState instanceof Function) {
		memoizedState = initState();
	} else {
		memoizedState = initState;
	}
	hook.memorizedState = memoizedState;
	const queue = createUpdateQueue<State>();
	hook.updateQueue = queue;
	hook.baseState = memoizedState;
	//@ts-ignore
	const disPatch = dispatchState.bind(null, currentlyRenderingFiber, queue);
	queue.dispatch = disPatch;
	return [memoizedState, disPatch];
}

function dispatchState<State>(
	fiber: FiberNode,
	queue: UpdateQueue<State>,
	action: Action<State>
) {
	const lane = requestUpdateLane();
	const update = createUpdate(action, lane);
	enqueueUpdate(queue, update);
	scheduleUpdateOnFiber(fiber, lane);
}

function updatedProgressHook(): Hook {
	let nextHook: Hook | null = null;
	if (currentHook === null) {
		//第一个Hooks
		const current = currentlyRenderingFiber?.alternate;
		if (current !== null) {
			nextHook = current?.memoizedState;
		} else {
			nextHook = null;
		}
	} else {
		nextHook = currentHook.next;
	}
	if (nextHook === null) {
		throw new Error(
			`组件${currentlyRenderingFiber?.type}本次执行时的Hook比上次执行时多`
		);
	}
	currentHook = nextHook;
	const newHook: Hook = {
		memorizedState: currentHook?.memorizedState,
		updateQueue: currentHook?.updateQueue,
		baseQueue: currentHook?.baseQueue,
		baseState: currentHook?.baseState,
		next: null
	};
	if (workingInProgressHook === null) {
		// mount时 第一个hook
		if (currentlyRenderingFiber === null) {
			throw new Error('请在函数组件内调用hook');
		} else {
			workingInProgressHook = newHook;
			currentlyRenderingFiber.memoizedState = workingInProgressHook;
		}
	} else {
		// mount时 后续的hook
		workingInProgressHook.next = newHook;
		workingInProgressHook = newHook;
	}
	return workingInProgressHook;
}

function mountedProgressHook(): Hook {
	const hook: Hook = {
		next: null,
		memorizedState: null,
		updateQueue: null,
		baseQueue: null,
		baseState: null
	};
	if (workingInProgressHook === null) {
		//第一个hook
		if (currentlyRenderingFiber === null) {
			throw new Error('hook only be called in component funciont');
		} else {
			workingInProgressHook = hook;
			currentlyRenderingFiber.memoizedState = hook;
		}
	} else {
		workingInProgressHook.next = hook;
		workingInProgressHook = hook;
	}
	return hook;
}
function areHookInputsEqual(nextDeps: EffectDeps, prevDeps: EffectDeps) {
	if (prevDeps === null || nextDeps === null) {
		return false;
	}
	for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
		if (Object.is(prevDeps[i], nextDeps[i])) {
			continue;
		}
		return false;
	}
	return true;
}
function updatedEffect(create: () => void | void, deps: any[] | void) {
	const hook = updatedProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	if (currentHook !== null) {
		const prevEffect = currentHook.memorizedState as Effect;
		const destory = prevEffect.destroy;
		if (nextDeps !== null) {
			const prevDeps = prevEffect.deps;
			if (areHookInputsEqual(nextDeps, prevDeps)) {
				//依赖没有变，重置即可，flag为无副作用
				hook.memorizedState = pushEffect(Passive, create, destory, nextDeps);
				return;
			}
		}
		//存在副作用
		(currentlyRenderingFiber as FiberNode).flag |= PassiveEffect;
		hook.memorizedState = pushEffect(
			Passive | HookHasEffect,
			create,
			destory,
			nextDeps
		);
	}
}
function pushEffect(
	hookFlags: FiberFlag,
	create: EffectCallback | void,
	destroy: EffectCallback | void,
	deps: EffectDeps
): Effect {
	const effect: Effect = {
		tag: hookFlags,
		create,
		destroy,
		deps,
		next: null
	};
	const fiber = currentlyRenderingFiber as FiberNode;
	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
	if (updateQueue === null) {
		const updateQueue = createFCUpdateQueue();
		fiber.updateQueue = updateQueue;
		effect.next = effect;
		updateQueue.lastEffect = effect;
	} else {
		// 插入effect
		const lastEffect = updateQueue.lastEffect;
		if (lastEffect === null) {
			effect.next = effect;
			updateQueue.lastEffect = effect;
		} else {
			const firstEffect = lastEffect.next;
			lastEffect.next = effect;
			effect.next = firstEffect;
			updateQueue.lastEffect = effect;
		}
	}
	return effect;
}

function createFCUpdateQueue<State>() {
	const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>;
	updateQueue.lastEffect = null;
	return updateQueue;
}
function mountedEffect(create: () => void | void, deps: any[] | void) {
	const hook = mountedProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	(currentlyRenderingFiber as FiberNode).flag |= PassiveEffect;
	hook.memorizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		undefined,
		nextDeps
	);
}

function startTransition(
	setIsPending: (pending: boolean) => void,
	callback: () => void
) {
	setIsPending(true);
	const preTransition = ReactCurrentBatchConfig.transition;
	ReactCurrentBatchConfig.transition = 1;
	callback();
	setIsPending(false);
	ReactCurrentBatchConfig.transition = preTransition;
}

function mountedTransition(): [boolean, (callback: () => void) => void] {
	const [isPending, setIsPending] = mountedState(false);
	const hook = mountedProgressHook();
	const startFn = startTransition.bind(null, setIsPending);
	hook.memorizedState = startFn;
	return [isPending, startFn];
}

function updateTransition(): [boolean, (callback: () => void) => void] {
	const [isPending] = updateState<boolean>();
	const hook = updatedProgressHook();
	const start = hook.memorizedState;
	return [isPending, start];
}

const mountedDispatcher: Dispatcher = {
	useState: mountedState,
	useEffect: mountedEffect,
	useTransition: mountedTransition
};
const updatedDispatcher: Dispatcher = {
	useState: updateState,
	useEffect: updatedEffect,
	useTransition: updateTransition
};
