import { FiberNode } from './fiber';
import { MutationMask, NoFlags, Placement } from './fiberFlag';
import { Container, appendChildToContainer } from 'hostConfig';
import { HostComponent, HostRoot, HostText } from './workTag';

let nextEffect: FiberNode | null = null;
export const commitMutationEffect = (finishedWork: FiberNode) => {
	nextEffect = finishedWork;
	while (nextEffect !== null) {
		const child: FiberNode | null = nextEffect.child;
		const hasEffect = (nextEffect.subTreeFlag & MutationMask) !== NoFlags;
		if (hasEffect && child !== null) {
			//子节点有副作用操作，且存在子节点，那么继续遍历
			nextEffect = child;
		} else {
			//已经到最深处，或者子节点不需要操作，则操作本身
			up: while (nextEffect !== null) {
				//执行更新操作
				commitMutaitionEffectOnFiber(nextEffect);
				const sibling: FiberNode | null = nextEffect.sibling;
				if (sibling !== null) {
					//存在兄弟节点继续操作兄弟节点
					nextEffect = sibling;
					break up;
				}
				//返回上级操作父元素
				nextEffect = nextEffect.return;
			}
		}
	}
};

function commitMutaitionEffectOnFiber(fiber: FiberNode) {
	const flag = fiber.flag;
	//执行placeMent操作
	if ((flag & Placement) !== NoFlags) {
		commitPlaceMent(fiber);
		//去除placement标记
		fiber.flag &= ~Placement;
	}
}

function commitPlaceMent(fiber: FiberNode) {
	if (__DEV__) {
		console.warn('placement start commit', fiber);
	}
	const hostParent = getHostFromFiber(fiber);
	if (hostParent) {
		appendPlacementNodeIntoContainer(fiber, hostParent);
	}
}

function getHostFromFiber(fiber: FiberNode): Container | null {
	let parent = fiber.return;
	//找到父亲的容器
	while (parent) {
		const tag = parent.tag;
		if (tag === HostComponent) {
			return parent.stateNode as Container;
		}
		if (tag === HostRoot) {
			return parent.stateNode.container as Container;
		}
		parent = parent.return;
	}
	if (__DEV__) {
		console.warn('not find parent container', fiber);
	}
	return null;
}

function appendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	parentContainer: Container
) {
	//找到node节点
	const tag = finishedWork.tag;
	//找到需要插入的节点类型
	if (tag === HostComponent || tag === HostText) {
		appendChildToContainer(parentContainer, finishedWork.stateNode);
		return;
	}
	const child = finishedWork.child;
	if (child !== null) {
		appendPlacementNodeIntoContainer(child, parentContainer);
		let sibling = child.sibling;
		while (sibling !== null) {
			appendPlacementNodeIntoContainer(sibling, parentContainer);
			sibling = sibling.sibling;
		}
	}
}
