import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber';
import { HostRoot } from './workTag';

let workInProgress: FiberNode | null = null; //正在工作中的FiberNode;

function prepareProgress(node: FiberRootNode) {
	workInProgress = createWorkInProgress(node.current, {});
}

function performComplete(fiber: FiberNode) {
	let node: FiberNode | null = fiber;
	do {
		//处理递归的归也就是开始向上反馈了
		completeWork(node);
		if (node.sibling) {
			//如果存在兄弟则继续遍历兄弟
			workInProgress = node.sibling;
			return;
		} else {
			//不存在兄弟,那么就向上处理父亲节点
			node = node.return;
			workInProgress = node;
		}
	} while (node !== null);
}

function performUnitWork(fiber: FiberNode) {
	//使用深度优先处理fiber
	const next = beginWork(fiber);
	fiber.memorizedProps = fiber.pendingProps;
	if (next !== null) {
		//存在子节点,继续遍历子节点 回到workLoop
		workInProgress = next;
	} else {
		//不存在子节点那么已经到最深处就开始处理
		performComplete(fiber);
	}
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitWork(workInProgress);
	}
}

function renderRoot(node: FiberRootNode) {
	//准备阶段
	prepareProgress(node);
	do {
		try {
			workLoop();
		} catch (e) {
			console.warn('workProgress报错', e);
			workInProgress = null;
		}
	} while (true);
	node.finishedWork = node.current.alternate;
}

//从当前fiber节点找到根容器
function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = node.return;
	while (parent) {
		node = parent;
		parent = node.return;
	}
	if (node.type === HostRoot) {
		return node.stateNode;
	}
	return null;
}

//开始更新
export function scheduleUpdateOnFiber(node: FiberNode) {
	//找寻根容器
	const rootContainer = markUpdateFromFiberToRoot(node);
	renderRoot(rootContainer);
}