import {
	REACT_ELEMENT_TYPE,
	REACT_FRAGMENT_TYPE,
	REACT_SUSPENSE_TYPE
} from 'shared/ReactSymbols';
import { Type, Key, Props, Ref, ReactElementType } from 'shared/ReactTypes';

//React element constructor function to create element
const ReactElement = function (
	type: Type,
	key: Key,
	ref: Ref | null,
	props: Props
): ReactElementType {
	const element: ReactElementType = {
		$$typeof: REACT_ELEMENT_TYPE,
		type,
		key,
		ref,
		props: props,
		__mark: 'myReact'
	};
	return element;
};

const jsx = (type: Type, config: any, ...children: any[]) => {
	let key: Key = null;
	let ref: Ref | null = null;
	const props: Props = {};
	for (const prop in config) {
		const value = config[prop];
		if (prop === 'key') {
			if (value !== undefined) {
				key = '' + value;
			}
			continue;
		}
		if (prop === 'ref') {
			if (value !== undefined) {
				ref = value;
			}
			continue;
		}
		if ({}.hasOwnProperty.call(config, prop)) {
			props[prop] = value;
		}
	}
	const childrenLength = children.length;
	if (childrenLength) {
		props.children = childrenLength === 1 ? children[0] : children;
	}
	return ReactElement(type, key, ref, props);
};

export const jsxDEV = (type: Type, config: any) => {
	let key: Key = null;
	let ref: Ref | null = null;
	const props: Props = {};
	for (const prop in config) {
		const value = config[prop];
		if (prop === 'key') {
			if (value !== undefined) {
				key = '' + value;
			}
			continue;
		}
		if (prop === 'ref') {
			if (value !== undefined) {
				ref = value;
			}
			continue;
		}
		if ({}.hasOwnProperty.call(config, prop)) {
			props[prop] = value;
		}
	}
	return ReactElement(type, key, ref, props);
};
export const Fragment = REACT_FRAGMENT_TYPE;
export const Suspense = REACT_SUSPENSE_TYPE;
export const isValidElementFn = (Object: any) => {
	return (
		typeof Object === 'object' &&
		Object !== null &&
		Object.$$typeof === REACT_ELEMENT_TYPE
	);
};
export { jsx };
