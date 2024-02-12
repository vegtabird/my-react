const IS_SUPPORT_SYMBOL = typeof Symbol === 'function' && !!Symbol.for;

//react type 使用symbol为了确保唯一性
export const REACT_ELEMENT_TYPE = IS_SUPPORT_SYMBOL
	? Symbol.for('react.element')
	: 0xeac7;

export const REACT_FRAGMENT_TYPE = IS_SUPPORT_SYMBOL
	? Symbol.for('react.fragment')
	: 0xeacb;

export const REACT_CONTEXT_TYPE = IS_SUPPORT_SYMBOL
	? Symbol.for('react.context')
	: 0xeacc;

export const REACT_PROVIDER_TYPE = IS_SUPPORT_SYMBOL
	? Symbol.for('react.provider')
	: 0xeac2;

export const REACT_SUSPENSE_TYPE = IS_SUPPORT_SYMBOL
	? Symbol.for('react.suspense')
	: 0xead1;
