import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { FiberNode } from './fiber';
import internals from 'shared/internals';
import {
	UpdateQueue,
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	processUpdate
} from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';

interface Hook {
	next: Hook | null;
	memorizedState: any;
	updateQueue: unknown;
}

const { currentDispatcher } = internals;

let workingInProgressHook: Hook | null = null;
let currentlyRenderingFiber: FiberNode | null = null;
let currentHook: Hook | null = null;

export const renderWithHooks = (fiber: FiberNode) => {
	//函数式组件时，jsx转换会将函数存在ReactElement的type上面
	/**
	 * function App(){return <div>11</div>}
	 * child = App()
	 */
	currentlyRenderingFiber = fiber;
	//重置memoizedState
	fiber.memoizedState = null;
	const current = fiber.alternate;
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
	return children;
};

function updateState<State>(): [State, Dispatch<State>] {
	const hook = updatedProgressHook();
	const queue = hook.updateQueue as UpdateQueue<State>;
	const pending = queue.shared.pending;
	if (pending !== null) {
		const { memoizzedState } = processUpdate(hook.memorizedState, pending);
		hook.memorizedState = memoizzedState;
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
	const update = createUpdate(action);
	enqueueUpdate(queue, update);
	scheduleUpdateOnFiber(fiber);
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
		updateQueue: null
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
const mountedDispatcher: Dispatcher = {
	useState: mountedState
};
const updatedDispatcher: Dispatcher = {
	useState: updateState
};
