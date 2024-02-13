import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { FiberNode } from './fiber';
import internals from 'shared/internals';
import {
	Update,
	UpdateQueue,
	basicUpdateState,
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	processUpdate
} from './updateQueue';
import { Action, ReactContext, Thenable, Usable } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import {
	Lane,
	NoLane,
	NoLanes,
	mergeLanes,
	removeLanes,
	requestUpdateLane
} from './fiberLanes';
import { FiberFlag, PassiveEffect } from './fiberFlag';
import { HookHasEffect, Passive } from './hooksEffectTags';
import { REACT_CONTEXT_TYPE } from 'shared/ReactSymbols';
import { trackUsedThenable } from './thenable';
import { markDidRecieveUpdate } from './beginWork';

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
	deps: HookDeps;
	next: Effect | null;
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
	lastEffect: Effect | null;
	lastRenderState: State | null;
}

type EffectCallback = () => void;
type HookDeps = any[] | null;

const { currentDispatcher, ReactCurrentBatchConfig } = internals;

let workingInProgressHook: Hook | null = null;
let currentlyRenderingFiber: FiberNode | null = null;
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;
export const renderWithHooks = (
	fiber: FiberNode,
	Component: FiberNode['type'],
	lane: Lane
) => {
	//函数式组件时，jsx转换会将函数存在ReactElement的type上面'
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
	const queue = hook.updateQueue as FCUpdateQueue<State>;
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
		const prevState = hook.memorizedState;
		const {
			memoizzedState,
			baseQueue: newBaseQueue,
			baseState: newBaseState
		} = processUpdate(baseState, baseQueue, renderLane, (update) => {
			const lane = update.lane;
			const fiber = currentlyRenderingFiber as FiberNode;
			fiber.lanes = mergeLanes(fiber.lanes, lane);
		});
		if (!Object.is(prevState, memoizzedState)) {
			//前后状态更新了标记需要更新不能优化
			markDidRecieveUpdate();
		}
		hook.memorizedState = memoizzedState;
		hook.baseState = newBaseState;
		hook.baseQueue = newBaseQueue;
		queue.lastRenderState = memoizzedState;
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
	const queue = createFCUpdateQueue<State>();
	hook.updateQueue = queue;
	hook.baseState = memoizedState;
	//@ts-ignore
	const disPatch = dispatchState.bind(null, currentlyRenderingFiber, queue);
	queue.dispatch = disPatch;
	queue.lastRenderState = memoizedState;
	return [memoizedState, disPatch];
}

function dispatchState<State>(
	fiber: FiberNode,
	queue: FCUpdateQueue<State>,
	action: Action<State>
) {
	const lane = requestUpdateLane();
	const update = createUpdate(action, lane);
	const current = fiber.alternate;
	if (
		fiber.lanes === NoLanes &&
		(current === null || current.lanes === NoLanes)
	) {
		const currentState = queue.lastRenderState;
		const eagerState = basicUpdateState<State>(action, currentState as State);
		update.hasEagerState = true;
		update.eagerState = eagerState;
		if (Object.is(eagerState, currentState)) {
			enqueueUpdate(queue, update, fiber, NoLane);
			console.warn('命中eagerstate');
			return;
		}
	}

	enqueueUpdate(queue, update, fiber, lane);

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
function areHookInputsEqual(nextDeps: HookDeps, prevDeps: HookDeps) {
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
	deps: HookDeps
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
	updateQueue.lastRenderState = null;
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

function mountedRef<T>(instance: T): {
	current: T;
} {
	const hook = mountedProgressHook();
	const ref = {
		current: instance
	};
	hook.memorizedState = ref;
	return hook.memorizedState;
}

function updateRef<T>(): {
	current: T;
} {
	const hook = updatedProgressHook();
	return hook.memorizedState;
}

function readContext<T>(context: ReactContext<T>): T {
	if (!currentlyRenderingFiber) {
		throw new Error('只能在函数组件中调用useContext');
	}
	const value = context._currentValue;
	return value;
}

function use<T>(useContext: Usable<T>) {
	if (useContext !== null && typeof useContext === 'object') {
		if (typeof (useContext as Thenable<T>).then === 'function') {
			//thenable
			const thenable = useContext as Thenable<T>;
			return trackUsedThenable(thenable);
		} else if (
			(useContext as ReactContext<T>).$$typeof === REACT_CONTEXT_TYPE
		) {
			return readContext(useContext as ReactContext<T>);
		}
	}
}

export function resetOnUnwind() {
	workingInProgressHook = null;
	currentlyRenderingFiber = null;
	currentHook = null;
}

export function bailoutHook(wip: FiberNode, renderLane: Lane) {
	//restore hook
	const current = wip.alternate;
	if (current) {
		wip.updateQueue = current.updateQueue;
		current.lanes = removeLanes(current.lanes, renderLane);
	}
	//移除副作用
	wip.flag &= ~PassiveEffect;
}

function mountCallback<T>(callback: T, deps: HookDeps | undefined) {
	const hook = mountedProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	hook.memorizedState = [callback, nextDeps];
	return callback;
}

function updateCallback<T>(callback: T, deps: HookDeps | undefined) {
	const hook = updatedProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	const prevState = hook.memorizedState;

	if (nextDeps !== null) {
		const prevDeps = prevState[1];
		if (areHookInputsEqual(nextDeps, prevDeps)) {
			return prevState[0];
		}
	}
	hook.memorizedState = [callback, nextDeps];
	return callback;
}

function mountMemo<T>(nextCreate: () => T, deps: HookDeps | undefined) {
	const hook = mountedProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	const nextValue = nextCreate();
	hook.memorizedState = [nextValue, nextDeps];
	return nextValue;
}

function updateMemo<T>(nextCreate: () => T, deps: HookDeps | undefined) {
	const hook = updatedProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	const prevState = hook.memorizedState;

	if (nextDeps !== null) {
		const prevDeps = prevState[1];
		if (areHookInputsEqual(nextDeps, prevDeps)) {
			return prevState[0];
		}
	}
	const nextValue = nextCreate();
	hook.memorizedState = [nextValue, nextDeps];
	return nextValue;
}

const mountedDispatcher: Dispatcher = {
	useState: mountedState,
	useEffect: mountedEffect,
	useTransition: mountedTransition,
	useRef: mountedRef,
	useContext: readContext,
	use: use,
	useMemo: mountMemo,
	useCallback: mountCallback
};
const updatedDispatcher: Dispatcher = {
	useState: updateState,
	useEffect: updatedEffect,
	useTransition: updateTransition,
	useRef: updateRef,
	useContext: readContext,
	use: use,
	useMemo: updateMemo,
	useCallback: updateCallback
};
