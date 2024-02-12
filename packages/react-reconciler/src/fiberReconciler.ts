import { Container } from 'hostConfig';
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
import { requestUpdateLane } from './fiberLanes';
import {
	unstable_ImmediatePriority,
	unstable_runWithPriority
} from 'scheduler';

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
	//设置同步优先级，挂载时同步更新
	unstable_runWithPriority(unstable_ImmediatePriority, () => {
		//创建更新Action
		const lane = requestUpdateLane();
		const update = createUpdate<ReactElementType | null>(element, lane);
		//插入更新
		enqueueUpdate(
			root.current.updateQueue as UpdateQueue<ReactElementType | null>,
			update,
			root.current,
			lane
		);
		//执行更新
		scheduleUpdateOnFiber(root.current, lane);
	});
	return element;
};
