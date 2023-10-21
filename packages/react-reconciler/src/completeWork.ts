import { __DEV__ } from '.';
import { FiberNode } from './fiber';
import { NoFlags } from './fiberFlag';
import {
	appendInitialChild,
	createInstance,
	createTextInstance
} from './hostConfig';
import { HostComponent, HostRoot, HostText } from './workTag';

export const completeWork = (fiber: FiberNode) => {
	const current = fiber.alternate;
	const newProps = fiber.pendingProps;
	switch (fiber.tag) {
		case HostComponent:
			if (current !== null && fiber.stateNode) {
				//存在current以及stateNode代表不是首次mout所以要执行upgate
			} else {
				const instance = createInstance(fiber.type, newProps);
				appendAllChildren(instance, fiber);
				fiber.stateNode = instance;
			}
			bubleProerties(fiber);
			return;
		case HostRoot:
			return;
		case HostText:
			if (current !== null && fiber.stateNode) {
				//存在current以及stateNode代表不是首次mout所以要执行upgate
			} else {
				const instance = createTextInstance(fiber.type, newProps);
				fiber.stateNode = instance;
			}
			return;
		default:
			if (__DEV__) {
				console.warn('不合法的tag', fiber.tag);
			}
	}
};

//将所有子元素的dom插入到父节点
function appendAllChildren(parent: FiberNode, wip: FiberNode) {
	let node = wip.child;
	while (node !== null) {
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInitialChild(parent, node?.stateNode);
		} else if (node.child !== null) {
			//非dom节点并且有child则继续遍历chid
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === wip) {
			return;
		}
		//如果没有兄弟节点了 则向上遍历
		while (node.sibling === null) {
			if (node.return === null || node.return === wip) {
				return;
			}
			node = node?.return;
		}
		node.sibling.return = node.return;
		node = node.sibling;
	}
}

function bubleProerties(wip: FiberNode) {
	let node = wip.child;
	let subTreeFlag = NoFlags;
	//仅需遍历兄弟节点，应为子节点已经在subTreeFlag中了
	while (node !== null) {
		subTreeFlag |= node.flag;
		subTreeFlag |= node.subTreeFlag;
		node.return = wip;
		node = node.sibling;
	}
	wip.subTreeFlag |= subTreeFlag;
}