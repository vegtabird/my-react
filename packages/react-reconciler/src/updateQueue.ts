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

export const createUpdateQueue = <Action>() => {
	return {
		shared: {
			pending: null
		}
	} as UpdateQueue<Action>;
};

export const enqueueUpdate = <Action>(
	updateQueue: UpdateQueue<Action>,
	update: Update<Action>
) => {
	updateQueue.shared.pending = update;
};

export const processUpdate = <State>(
	baseState: State,
	pendingUpdate: Update<State>
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
