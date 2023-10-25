import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { FiberNode } from './fiber';
import internals from 'shared/internals';
import {
	UpdateQueue,
	createUpdate,
	createUpdateQueue,
	enqueueUpdate
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
	} else {
		//mounted
		currentDispatcher.current = mountedDispatcher;
	}
	const Component = fiber.type;
	const props = fiber.pendingProps;
	const children = Component(props);
	currentlyRenderingFiber = null;
	return children;
};

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
