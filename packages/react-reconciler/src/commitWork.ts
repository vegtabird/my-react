import { FiberNode, FiberRootNode, PendingPassiveEffects } from './fiber';
import {
	ChildDeletion,
	FiberFlag,
	MutationMask,
	NoFlags,
	PassiveEffect,
	PassiveMask,
	Placement,
	Update,
	LayoutMask,
	Ref
} from './fiberFlag';
import {
	Container,
	Instance,
	appendChildToContainer,
	commitUpdate,
	insertChildToContainer,
	removeChild
} from 'hostConfig';
import { FunctionComponet, HostComponent, HostRoot, HostText } from './workTag';
import { Effect, FCUpdateQueue } from './fiberHooks';
import { HookHasEffect } from './hooksEffectTags';

let nextEffect: FiberNode | null = null;
const commitEffect = (
	phrase: 'mutation' | 'layout',
	mask: FiberFlag,
	callback: (fiber: FiberNode, root: FiberRootNode) => void
) => {
	return (finishedWork: FiberNode, root: FiberRootNode) => {
		nextEffect = finishedWork;
		while (nextEffect !== null) {
			const child: FiberNode | null = nextEffect.child;
			const hasEffect = (nextEffect.subTreeFlag & mask) !== NoFlags;
			if (hasEffect && child !== null) {
				//子节点有副作用操作，且存在子节点，那么继续遍历
				nextEffect = child;
			} else {
				//已经到最深处，或者子节点不需要操作，则操作本身
				up: while (nextEffect !== null) {
					//执行更新操作
					callback(nextEffect, root);
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
};
export const commitMutationEffect = commitEffect(
	'mutation',
	MutationMask | PassiveMask,
	commitMutaitionEffectOnFiber
);

function safeAttachRef(fiber: FiberNode) {
	const { ref } = fiber;
	if (ref !== null) {
		const instance = fiber.stateNode;
		if (typeof ref === 'function') {
			ref(instance);
		} else {
			ref.current = instance;
		}
	}
}

function safeDeAttachRef(fiber: FiberNode) {
	const ref = fiber.ref;
	if (ref !== null) {
		if (typeof ref === 'function') {
			ref(null);
		} else {
			ref.current = null;
		}
	}
}

function commitMutaitionEffectOnFiber(fiber: FiberNode, root: FiberRootNode) {
	const flag = fiber.flag;
	const tag = fiber.tag;
	//执行placeMent操作
	if ((flag & Placement) !== NoFlags) {
		commitPlaceMent(fiber);
		//去除placement标记
		fiber.flag &= ~Placement;
	}
	//执行update操作
	if ((flag & Update) !== NoFlags) {
		commitUpdate(fiber);
		fiber.flag &= ~Update;
	}
	//执行删除操作
	if ((flag & ChildDeletion) !== NoFlags) {
		const { deletions } = fiber;
		if (deletions !== null) {
			deletions.forEach((delFiber) => {
				commitDeletion(delFiber, root);
			});
		}
		fiber.flag &= ~ChildDeletion;
	}
	if ((flag & PassiveEffect) !== NoFlags) {
		//存在副作用，收集effect
		commitPassiveEffect(fiber, root, 'update');
		fiber.flag &= ~PassiveEffect;
	}
	if ((flag & Ref) !== NoFlags && tag === HostComponent) {
		safeDeAttachRef(fiber);
	}
}

export const commitLayoutEffects = commitEffect(
	'layout',
	LayoutMask,
	commitLayoutEffectOnFiber
);

function commitLayoutEffectOnFiber(fiber: FiberNode) {
	const { tag, flag } = fiber;
	if ((flag & Ref) !== NoFlags && tag === HostComponent) {
		safeAttachRef(fiber);
		fiber.flag &= ~Ref;
	}
}

function recordDeleteChild(
	childToDelete: FiberNode[],
	unMountFiber: FiberNode
) {
	//如果是fragment节点删除的话，会删除多个节点，并且这些节点一定是互相为兄弟节点
	const lastChild = childToDelete[childToDelete.length - 1];
	if (!lastChild) {
		childToDelete.push(unMountFiber);
	} else {
		let node = lastChild.sibling;
		while (node !== null) {
			if (unMountFiber === node) {
				childToDelete.push(unMountFiber);
			}
			node = node.sibling;
		}
	}
}

function commitDeletion(fiber: FiberNode, root: FiberRootNode) {
	const rootChildrenToDelte: FiberNode[] = [];
	commitNestedComponent(fiber, (delFiber) => {
		switch (delFiber.tag) {
			case HostComponent:
				//找到第一个需要删除节点，用于删除整个子树
				recordDeleteChild(rootChildrenToDelte, delFiber);
				//TODO 解除ref
				safeDeAttachRef(delFiber);
				break;
			case HostText:
				//找到第一个需要删除节点，用于删除整个子树
				recordDeleteChild(rootChildrenToDelte, delFiber);
				break;
			case FunctionComponet:
				//todo useEffect
				commitPassiveEffect(delFiber, root, 'unmount');
				break;
			default:
				if (__DEV__) {
					console.warn('delete undefined fiber', delFiber);
				}
		}
	});
	if (rootChildrenToDelte.length) {
		const hostParent = getHostFromFiber(fiber);
		if (hostParent !== null) {
			rootChildrenToDelte.forEach((node) =>
				removeChild((node as FiberNode).stateNode, hostParent)
			);
		}
	}
	fiber.return = null;
	fiber.sibling = null;
}

function commitNestedComponent(
	root: FiberNode,
	unCommitFn: (delFiber: FiberNode) => void
) {
	let node = root;
	while (true) {
		unCommitFn(node);
		if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}
		if (node === root) {
			return;
		}
		while (node.sibling === null) {
			if (node.return === null || node.return === root) {
				return;
			}
			node = node.return;
		}
		node.sibling.return = node.return;
		node = node.sibling;
	}
}

function commitPlaceMent(fiber: FiberNode) {
	if (__DEV__) {
		console.warn('placement start commit', fiber);
	}
	const hostParent = getHostFromFiber(fiber);
	const before = getHostSlibing(fiber);
	if (hostParent) {
		insertOrappendPlacementNodeIntoContainer(fiber, hostParent, before);
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

function getHostSlibing(fiber: FiberNode) {
	let node: FiberNode = fiber;
	findSlibing: while (true) {
		while (node.sibling === null) {
			const parent = node.return;
			if (
				parent === null ||
				parent.tag === HostComponent ||
				parent.tag === HostRoot
			) {
				return null;
			}
			node = parent;
		}
		node.sibling.return = node.return;
		node = node.sibling;
		while (node.tag !== HostText && node.tag !== HostComponent) {
			//先找到无副作用的node并插入
			if ((node.flag & Placement) !== NoFlags) {
				continue findSlibing;
			}
			if (node.child === null) {
				continue findSlibing;
			} else {
				node.child.return = node;
				node = node.child;
			}
		}
		if ((node.flag & Placement) === NoFlags) {
			return node.stateNode;
		}
	}
}

function insertOrappendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	parentContainer: Container,
	before?: Instance | null
) {
	//找到node节点
	const tag = finishedWork.tag;
	//找到需要插入的节点类型
	if (tag === HostComponent || tag === HostText) {
		if (before) {
			insertChildToContainer(finishedWork.stateNode, parentContainer, before);
		} else {
			appendChildToContainer(parentContainer, finishedWork.stateNode);
		}
		return;
	}
	const child = finishedWork.child;
	if (child !== null) {
		insertOrappendPlacementNodeIntoContainer(child, parentContainer);
		let sibling = child.sibling;
		while (sibling !== null) {
			insertOrappendPlacementNodeIntoContainer(sibling, parentContainer);
			sibling = sibling.sibling;
		}
	}
}
//收集effect
function commitPassiveEffect(
	fiber: FiberNode,
	root: FiberRootNode,
	type: keyof PendingPassiveEffects
) {
	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
	//当fiber不是函数组件，且update了一个无副作用的effect，则不收集
	if (
		fiber.tag !== FunctionComponet ||
		(type === 'update' && (fiber.flag & PassiveEffect) === NoFlags)
	) {
		return;
	}
	if (updateQueue !== null) {
		if (updateQueue.lastEffect === null && __DEV__) {
			console.warn('不存在有副作用时无lasteffect');
		} else {
			root.pendingPassiveEffects[type].push(updateQueue.lastEffect as Effect);
		}
	}
}

function commitHookEffectList(
	flag: FiberFlag,
	lastEffect: Effect,
	callback: (effect: Effect) => void
) {
	let effect = lastEffect.next as Effect;
	do {
		if ((effect.tag & flag) === flag) {
			callback(effect);
		}
		effect = effect.next as Effect;
	} while (effect !== lastEffect.next);
}
//unmount执行回调
export function commitHookEffectListUnMount(
	flag: FiberFlag,
	lastEffect: Effect
) {
	commitHookEffectList(flag, lastEffect, (effect: Effect) => {
		const destory = effect.destroy;
		if (typeof destory === 'function') {
			destory();
		}
		//unmount时 会删除整个子节点，所以要移除副作用免得重复调用 为啥不直接从effect链表中移除?
		effect.tag &= ~HookHasEffect;
	});
}
//destory执行回调
export function commitHookEffectListDestory(
	flag: FiberFlag,
	lastEffect: Effect
) {
	commitHookEffectList(flag, lastEffect, (effect: Effect) => {
		const destory = effect.destroy;
		if (typeof destory === 'function') {
			destory();
		}
	});
}

//update执行回调
export function commitHookEffectListUpdate(
	flag: FiberFlag,
	lastEffect: Effect
) {
	commitHookEffectList(flag, lastEffect, (effect: Effect) => {
		const create = effect.create;
		if (typeof create === 'function') {
			effect.destroy = create();
		}
	});
}
