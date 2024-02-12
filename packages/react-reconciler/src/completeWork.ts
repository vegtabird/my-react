import { FiberNode } from './fiber';
import { NoFlags, Ref, Update, Visibility } from './fiberFlag';
import {
	Container,
	Instance,
	appendInitialChild,
	createInstance,
	createTextInstance
} from 'hostConfig';
import {
	ContextProvider,
	Fragment,
	FunctionComponet,
	HostComponent,
	HostRoot,
	HostText,
	OffscreenComponent,
	SuspenseComponent
} from './workTag';
import { popProvider } from '../fiberContext';
import { popSuspenseHandler } from './suspenseContext';
import { NoLane, mergeLanes } from './fiberLanes';

function updateMark(fiber: FiberNode) {
	fiber.flag |= Update;
}

function markRef(fiber: FiberNode) {
	fiber.flag |= Ref;
}

export const completeWork = (fiber: FiberNode) => {
	const current = fiber.alternate;
	const newProps = fiber.pendingProps;
	switch (fiber.tag) {
		case HostComponent:
			if (current !== null && fiber.stateNode) {
				//存在current以及stateNode代表不是首次mout所以要执行upgate
				//todo 对比props是否发生变化再更新
				updateMark(fiber);
				if (current.ref !== fiber.ref) {
					markRef(fiber);
				}
			} else {
				//需要更新props到dom节点上
				const instance = createInstance(fiber.type, newProps);
				appendAllChildren(instance, fiber);
				fiber.stateNode = instance;
				if (fiber.ref !== null) {
					markRef(fiber);
				}
			}
			bubleProerties(fiber);
			return;
		case HostRoot:
		case Fragment:
		case FunctionComponet:
		case OffscreenComponent:
			bubleProerties(fiber);
			return;
		case ContextProvider:
			const context = fiber.type._context;
			popProvider(context);
			bubleProerties(fiber);
			return;
		case HostText:
			if (current !== null && fiber.stateNode) {
				//存在current以及stateNode代表不是首次mout所以要执行upgate
				const oldText = current.memorizedProps.content;
				const newText = newProps.content;
				if (oldText !== newText) {
					updateMark(fiber);
				}
			} else {
				const instance = createTextInstance(newProps.content);
				fiber.stateNode = instance;
			}
			return;
		case SuspenseComponent:
			popSuspenseHandler();
			const offscreen = fiber.child as FiberNode;
			const isHidden = offscreen.pendingProps.mode === 'hidden';
			const currentOffscreen = offscreen?.alternate;
			if (currentOffscreen !== null) {
				const wasHidden = currentOffscreen?.pendingProps.mode === 'hidden';
				if (wasHidden !== isHidden) {
					offscreen.flag |= Visibility;
					bubleProerties(offscreen);
				}
			} else if (isHidden) {
				offscreen.flag |= Visibility;
				bubleProerties(offscreen);
			}
			bubleProerties(fiber);
			return;
		default:
			if (__DEV__) {
				console.warn('不合法的tag', fiber.tag);
			}
	}
};

//将所有子元素插入到父元素，如果子元素不是DOM节点类型也就是HostComponent和HostText 则继续向下找，找到后再找兄弟节点
function appendAllChildren(parent: Container | Instance, wip: FiberNode) {
	let node = wip.child;
	//仅添加了第一层的child
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
	let newChilLanes = NoLane;
	//仅需遍历兄弟节点，应为子节点已经在subTreeFlag中了
	while (node !== null) {
		subTreeFlag |= node.flag;
		subTreeFlag |= node.subTreeFlag;
		newChilLanes = mergeLanes(
			newChilLanes,
			mergeLanes(node.lanes, node.childLanes)
		);
		node.return = wip;
		node = node.sibling;
	}
	wip.subTreeFlag |= subTreeFlag;
	wip.childLanes = newChilLanes;
}
