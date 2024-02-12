export type Type = any;
export type Key = any;
export type Ref = { current: any } | ((instance: any) => void);
export type Props = any;
export interface ReactElementType {
	$$typeof: symbol | number;
	type: Type;
	key: Key;
	ref: Ref | null;
	props: Props;
	//自定义的类型用于区分原生react
	__mark: string;
}

export type Action<State> = State | ((preState: State) => State);

export type ReactContext<T> = {
	$$typeof: symbol | number;
	Provider: ReactProvider<T> | null;
	_currentValue: T;
};

export type ReactProvider<T> = {
	$$typeof: symbol | number;
	_context: ReactContext<T>;
};

export type Usable<T> = Thenable<T> | ReactContext<T>;

export interface Wakeable<Result = any> {
	then(
		onFulfill: () => Result,
		onReject: () => Result
	): void | Wakeable<Result>;
}

interface ThenableImpl<T, Result, Err> {
	then(
		onFullilled: (value: T) => Result,
		onRejected: (err: Err) => Result
	): void | Wakeable<Result>;
}

export interface UntrackedThenable<T, Result, Err>
	extends ThenableImpl<T, Result, Err> {
	status?: void;
}

export interface PendingThenable<T, Result, Err>
	extends ThenableImpl<T, Result, Err> {
	status: 'pending';
}

export interface FulfilledThenable<T, Result, Err>
	extends ThenableImpl<T, Result, Err> {
	status: 'fulfilled';
	value: T;
}

export interface RejectedThenable<T, Result, Err>
	extends ThenableImpl<T, Result, Err> {
	status: 'rejected';
	reason: Err;
}

export type Thenable<T, Result = void, Err = any> =
	| UntrackedThenable<T, Result, Err>
	| PendingThenable<T, Result, Err>
	| FulfilledThenable<T, Result, Err>
	| RejectedThenable<T, Result, Err>;
