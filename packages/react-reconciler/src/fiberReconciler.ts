import { Container } from './hostConfig';
import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode, FiberRootNode } from './fiber';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	UpdateQueue
} from './updateQueue';
import { HostRoot } from './workTag';
import { scheduleUpdateOnFiber } from './workLoop';

//创建fiber根容器 ReactDom.createRoot
export const createContainer = (container: Container) => {
	const hostRoot = new FiberNode(HostRoot, {}, null);
	const root = new FiberRootNode(container, hostRoot);
	hostRoot.updateQueue = createUpdateQueue();
	return root;
};

//更新节点 ReactDom.createRoot.render
export const updateContainer = (
	element: ReactElementType | null,
	root: FiberRootNode
) => {
	//创建更新Action
	const update = createUpdate<ReactElementType | null>(element);
	//插入更新
	enqueueUpdate(
		root.current.updateQueue as UpdateQueue<ReactElementType | null>,
		update
	);
	//执行更新
	scheduleUpdateOnFiber(root.current);
};
