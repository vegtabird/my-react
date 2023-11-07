import { Props } from 'shared/ReactTypes';
import { DomeElement, updateDomPropsFromFiber } from './SyntheticEvent';

export type Container = Element;
export type Instance = Element;
export type TextInstance = Element;
// export const createInstance = (type: string, props: any): Instance => {
export const createInstance = (type: string, props: Props): Instance => {
	// TODO 处理props
	const element = document.createElement(type);
	updateDomPropsFromFiber(element as DomeElement, props);
	return element;
};
export const appendInitialChild = (
	parent: Instance | Container,
	child: Instance
) => {
	parent.appendChild(child);
};

export const createTextInstance = (content: string) => {
	return document.createTextNode(content);
};

export const commitTextUpdate = (text: TextInstance, content: string) => {
	text.textContent = content;
};

export function removeChild(
	child: Instance | TextInstance,
	container: Container
) {
	container.removeChild(child);
}

export function insertChildToContainer(
	child: Instance,
	container: Container,
	before: Instance
) {
	container.insertBefore(child, before);
}
export const scheduleMicroTask =
	typeof queueMicrotask === 'function'
		? queueMicrotask
		: typeof Promise === 'function'
		? (callback: (...args: any) => void) => Promise.resolve(null).then(callback)
		: setTimeout;
export const appendChildToContainer = appendInitialChild;
