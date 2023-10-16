const IS_SUPPORT_SYMBOL = typeof Symbol === 'function' && !!Symbol.for;

//react type 使用symbol为了确保唯一性
export const REACT_ELEMENT_TYPE = IS_SUPPORT_SYMBOL
	? Symbol.for('react.element')
	: 0xeac7;
