import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';
import { Lane, NoLane, isSubSet, mergeLanes } from './fiberLanes';
import { FiberNode } from './fiber';

export interface Update<State> {
	action: Action<State>;
	next: Update<any> | null;
	lane: Lane;
	hasEagerState: boolean;
	eagerState: State | null;
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
	dispatch: Dispatch<State> | null;
}

export const createUpdate = <State>(
	action: Action<State>,
	lane: Lane,
	hasEagerState = false,
	eagerState = null
) => {
	return {
		action,
		next: null,
		lane: lane,
		hasEagerState,
		eagerState
	} as Update<State>;
};

export const createUpdateQueue = <State>() => {
	return {
		shared: {
			pending: null
		},
		dispatch: null
	} as UpdateQueue<State>;
};

export const enqueueUpdate = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>,
	fiber: FiberNode,
	lane: Lane
) => {
	const pending = updateQueue.shared.pending;
	if (pending === null) {
		update.next = update;
	} else {
		update.next = pending.next;
		pending.next = update;
	}
	updateQueue.shared.pending = update;
	fiber.lanes = mergeLanes(fiber.lanes, lane);
	const alternate = fiber.alternate;
	if (alternate !== null) {
		alternate.lanes = mergeLanes(alternate.lanes, lane);
	}
};

export function basicUpdateState<State>(action: Action<State>, state: State) {
	if (action instanceof Function) {
		return action(state);
	} else {
		return action;
	}
}

export const processUpdate = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLance: Lane,
	onSkipUpdate?: <State>(update: Update<State>) => void
): {
	memoizzedState: State;
	baseState: State;
	baseQueue: Update<State> | null;
} => {
	const result: ReturnType<typeof processUpdate<State>> = {
		memoizzedState: baseState,
		baseState,
		baseQueue: null
	};
	if (pendingUpdate !== null) {
		const firstUpdate = pendingUpdate.next;
		let update = pendingUpdate.next as Update<State>;
		let newBaseState = baseState;
		let newState = baseState;
		let firstBaseQueue: Update<State> | null = null;
		let lastBaseQueue: Update<State> | null = null;
		do {
			const lane = update.lane;
			if (isSubSet(renderLance, lane)) {
				if (lastBaseQueue !== null) {
					const clone = createUpdate(update.action, NoLane);
					lastBaseQueue!.next = clone;
					lastBaseQueue = clone;
				}
				//update 优先级正常不跳过
				const action = update.action;
				if (update.hasEagerState) {
					newState = update.eagerState as State;
				} else {
					newState = basicUpdateState(action, baseState);
				}
			} else {
				const clone = createUpdate(update.action, update.lane);
				onSkipUpdate?.(clone);
				//update 优先级不够，需要跳过
				if (firstBaseQueue === null) {
					//第一个跳过的update
					firstBaseQueue = clone;
					lastBaseQueue = clone;
					newBaseState = newState;
				} else {
					lastBaseQueue!.next = clone;
					lastBaseQueue = clone;
				}
			}
			update = update.next as Update<State>;
		} while (update !== firstUpdate && update !== null);
		if (lastBaseQueue === null) {
			//没有跳过的updat
			newBaseState = newState;
		} else {
			lastBaseQueue!.next = firstBaseQueue;
		}
		result.baseQueue = lastBaseQueue;
		result.baseState = newBaseState;
		result.memoizzedState = newState;
	}
	return result;
};
