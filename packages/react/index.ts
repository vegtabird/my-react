import currentDispatcher, {
	Dispatcher,
	resolveDispatcher
} from './src/currentDispatcher';
import { jsx, isValidElementFn } from './src/jsx';

export const useState: Dispatcher['useState'] = (initState) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useState(initState);
};

export const __SECRET_DATA_DO_NOT_CHANGE__ = {
	currentDispatcher
};

export const version = '0.0.0';

// TODO 根据环境区分使用jsx/jsxDEV
export const createElement = jsx;
export const isValidElement = isValidElementFn;