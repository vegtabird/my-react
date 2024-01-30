import { Action } from 'shared/ReactTypes';

export type Dispatch<State> = (action: Action<State>) => void;

export interface Dispatcher {
	useState: <T>(initState: (() => T) | T) => [T, Dispatch<T>];
	useEffect: (callback: () => void | void, deps: any[] | void) => void;
	useTransition: () => [boolean, (callback: () => void) => void];
}

const currentDispatcher: { current: Dispatcher | null } = {
	current: null
};

export function resolveDispatcher() {
	const dispatch = currentDispatcher.current;
	if (dispatch === null) {
		throw new Error('hoos only call in function');
	}
	return dispatch;
}

export default currentDispatcher;
