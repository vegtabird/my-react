import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';
import { Lane } from './fiberLanes';

export interface Update<State> {
	action: Action<State>;
	next: Update<any> | null;
	lane: Lane;
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
	dispatch: Dispatch<State> | null;
}

export const createUpdate = <State>(action: Action<State>, lane: Lane) => {
	return {
		action,
		next: null,
		lane: lane
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
	update: Update<State>
) => {
	const pending = updateQueue.shared.pending;
	if (pending === null) {
		update.next = update;
	} else {
		update.next = pending.next;
		pending.next = update;
	}
	updateQueue.shared.pending = update;
};

export const processUpdate = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLance: Lane
): { memoizzedState: State } => {
	const result: ReturnType<typeof processUpdate<State>> = {
		memoizzedState: baseState
	};
	if (pendingUpdate !== null) {
		const firstUpdate = pendingUpdate.next;
		let update = pendingUpdate.next as Update<State>;
		do {
			const lane = update.lane;
			if (renderLance === lane) {
				const action = update.action;
				if (action instanceof Function) {
					baseState = action(baseState);
				} else {
					baseState = action;
				}
			} else {
				if (__DEV__) {
					console.error('不应该进入updateLane !== renderLane逻辑');
				}
			}
			update = update.next as Update<State>;
		} while (update !== firstUpdate && update !== null);
	}
	result.memoizzedState = baseState;
	return result;
};
