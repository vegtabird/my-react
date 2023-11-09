import { FiberNode } from 'react-reconciler/src/fiber';
import { HostText } from 'react-reconciler/src/workTag';
import { Props } from 'shared/ReactTypes';
export interface Container {
	rootID: number;
	children: (Instance | TextInstance)[];
}

export interface Instance {
	id: number;
	type: string;
	children: (Instance | TextInstance)[];
	parent: number;
	props: Props;
}
export interface TextInstance {
	text: string;
	id: number;
	parent: number;
}
let instanceCounter = 0;
// export const createInstance = (type: string, props: any): Instance => {
export const createInstance = (type: string, props: Props): Instance => {
	const instance: Instance = {
		id: instanceCounter++,
		type,
		parent: -1,
		props,
		children: []
	};
	return instance;
};
export const appendInitialChild = (
	parent: Instance | Container,
	child: Instance
) => {
	const preParentId = child.parent;
	const parentId = 'rootID' in parent ? parent.rootID : parent.id;
	if (preParentId !== -1 && preParentId !== parentId) {
		throw new Error('不能重复挂载child');
	}
	child.parent = parentId;
	parent.children.push(child);
};

export const createTextInstance = (content: string) => {
	const textInstance: TextInstance = {
		text: content,
		id: instanceCounter++,
		parent: -1
	};
	return textInstance;
};

export const commitTextUpdate = (text: TextInstance, content: string) => {
	text.text = content;
};

export function commitUpdate(fiber: FiberNode) {
	switch (fiber.tag) {
		case HostText:
			const text = fiber.memorizedProps?.content;
			return commitTextUpdate(fiber.stateNode, text);
		default:
			if (__DEV__) {
				console.warn('未实现的Update类型', fiber);
			}
			break;
	}
}
export const appendChildToContainer = (parent: Container, child: Instance) => {
	// id
	const prevParentID = child.parent;

	if (prevParentID !== -1 && prevParentID !== parent.rootID) {
		throw new Error('不能重复挂载child');
	}
	child.parent = parent.rootID;
	parent.children.push(child);
};

export function removeChild(
	child: Instance | TextInstance,
	container: Container
) {
	const index = container.children.indexOf(child);
	if (index === -1) {
		throw new Error('child不存在');
	}
	container.children.splice(index, 1);
}

export function insertChildToContainer(
	child: Instance,
	container: Container,
	before: Instance
) {
	const beforeIndex = container.children.indexOf(before);
	if (beforeIndex === -1) {
		throw new Error('before 不存在');
	}
	const childIndex = container.children.indexOf(child);
	if (childIndex !== -1) {
		container.children.splice(childIndex, 1);
	}
	child.parent = before.parent;
	container.children.splice(beforeIndex, 0, child);
}
export const scheduleMicroTask =
	typeof queueMicrotask === 'function'
		? queueMicrotask
		: typeof Promise === 'function'
		? (callback: (...args: any) => void) => Promise.resolve(null).then(callback)
		: setTimeout;
