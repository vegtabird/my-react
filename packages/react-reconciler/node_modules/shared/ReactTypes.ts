export type Type = any;
export type Key = any;
export type Ref = any;
export type Props = any;
export interface ReactElementType {
	$$typeof: symbol | number;
	type: Type;
	key: Key;
	ref: Ref;
	props: Props;
	//自定义的类型用于区分原生react
	__mark: string;
}

export type Action<State> = State | ((preState: State) => State);
