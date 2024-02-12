import ReactCurrentBatchConfig from './src/currentBatchConfig';
import currentDispatcher, {
	Dispatcher,
	resolveDispatcher
} from './src/currentDispatcher';
import { jsx, isValidElementFn } from './src/jsx';

export { createContext } from './src/context';
export {
	REACT_FRAGMENT_TYPE as Fragment,
	REACT_SUSPENSE_TYPE as Suspense
} from 'shared/ReactSymbols';

export const useState: Dispatcher['useState'] = (initState) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useState(initState);
};

export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useEffect(create, deps);
};

export const useContext: Dispatcher['useContext'] = (context) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useContext(context);
};

export const useTransition: Dispatcher['useTransition'] = () => {
	const dispatch = resolveDispatcher();
	return dispatch.useTransition();
};

export const useRef: Dispatcher['useRef'] = (instance) => {
	const dispatch = resolveDispatcher();
	return dispatch.useRef(instance);
};

export const use: Dispatcher['use'] = (useable) => {
	const dispatch = resolveDispatcher();
	return dispatch.use(useable);
};

export const __SECRET_DATA_DO_NOT_CHANGE__ = {
	currentDispatcher,
	ReactCurrentBatchConfig
};

export const version = '0.0.0';

// TODO 根据环境区分使用jsx/jsxDEV
export const createElement = jsx;
export const isValidElement = isValidElementFn;
