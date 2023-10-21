import { Action } from 'shared/ReactTypes';

export interface Update<State> {
	action: Action<State>;
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
}

export const createUpdate = <State>(action: Action<State>) => {
	return {
		action
	} as Update<State>;
};

export const createUpdateQueue = <State>() => {
	return {
		shared: {
			pending: null
		}
	} as UpdateQueue<State>;
};

export const enqueueUpdate = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) => {
	updateQueue.shared.pending = update;
};

export const processUpdate = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null
): { memoizzedState: State } => {
	const result: ReturnType<typeof processUpdate<State>> = {
		memoizzedState: baseState
	};
	if (pendingUpdate) {
		const action = pendingUpdate.action;
		if (action instanceof Function) {
			result.memoizzedState = action(baseState);
		} else {
			result.memoizzedState = action;
		}
	}
	return result;
};
