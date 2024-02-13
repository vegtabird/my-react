import { FiberNode } from 'react-reconciler/src/fiber';
import { REACT_MEMO_TYPE } from 'shared/ReactSymbols';
import { Props } from 'shared/ReactTypes';

export function memo(
	type: FiberNode['type'],
	compareFn?: (oldProps: Props, newProps: Props) => boolean
) {
	const fiberType = {
		$$typeof: REACT_MEMO_TYPE,
		type,
		compare: compareFn === undefined ? null : compareFn
	};
	// memo fiber.type.type
	return fiberType;
}
