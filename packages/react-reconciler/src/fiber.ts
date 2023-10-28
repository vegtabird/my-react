import { Props, Key, Ref, ReactElementType } from 'shared/ReactTypes';
import { FunctionComponet, HostComponent, WorkTag } from './workTag';
import { FiberFlag, NoFlags } from './fiberFlag';
import { Container } from 'hostConfig';
//FiberNode用来表示节点的状态，以及兄弟父亲关系
export class FiberNode {
	//相当于是哪个类型
	tag: WorkTag;
	key: Key;
	renderProps: Props;
	stateNode: any;
	type: any; //代表tag对应的数据类型 比如tag是FunctionComponet 那么type = ()=>{}
	ref: Ref;
	//表示节点关系的属性
	return: FiberNode | null; //父亲节点
	sibling: FiberNode | null; //右边兄弟节点
	child: FiberNode | null; //子节点
	index: number; //同级所处的位置
	//表示工作状态
	pendingProps: Props; //刚开始工作的props
	memorizedProps: Props | null; //确定后更新的props
	memoizedState: any; //更新后的state
	alternate: FiberNode | null; //指向对应的另一颗树中的FiberNode 由于工作中存在两颗FiberNode树,current->表示当前dom, working->表示目前正在work更新的
	flag: FiberFlag; //表示要进行什么操作
	subTreeFlag: FiberFlag; //子树中是否有workFlag
	updateQueue: unknown; //更新队列
	deletions: FiberNode[] | null; //要删除的子元素
	/**
	 *
	 * @param tag 表示该节点是什么类型的节点
	 * @param renderProps 需要改变的新props
	 * @param key element 的key
	 */
	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		//实例属性
		this.tag = tag;
		this.key = key;
		this.stateNode = null;
		this.type = null;
		this.ref = null;
		//表示节点关系的属性 构成树状图
		this.return = null;
		this.sibling = null;
		this.child = null;
		this.index = 0;

		//表示工作单元
		this.pendingProps = pendingProps;
		this.memorizedProps = null;
		this.memoizedState = null;
		this.updateQueue = null;
		this.alternate = null;
		this.flag = NoFlags;
		this.subTreeFlag = NoFlags;
		this.deletions = null;
	}
}

//Fiber的根容器，用来遍历更新的入口
export class FiberRootNode {
	container: Container;
	current: FiberNode; //当前页面的fiber树
	finishedWork: FiberNode | null; //完成更新后的fiber树
	constructor(container: Container, hostFiberNode: FiberNode) {
		this.container = container;
		this.current = hostFiberNode;
		hostFiberNode.stateNode = this;
		this.finishedWork = null;
	}
}

export const createWorkInProgress = (
	current: FiberNode,
	pendingProps: Props
) => {
	/**
	 * 由于同时存在两棵FiberNode，current代表的是目前需要更新的，其alernate代表的是当前展现的树
	 */
	let wip = current.alternate;
	//当前无展示，代表挂载阶段
	if (wip === null) {
		//挂载
		wip = new FiberNode(current.tag, pendingProps, current.key);
		wip.stateNode = current.stateNode;
		wip.alternate = current;
		current.alternate = wip;
	} else {
		//更新props
		wip.pendingProps = pendingProps;
		wip.flag = NoFlags;
		wip.subTreeFlag = NoFlags;
		wip.deletions = null;
	}

	//why这样赋值
	wip.type = current.type;
	wip.updateQueue = current.updateQueue;
	wip.child = current.child;
	wip.memorizedProps = current.memorizedProps;
	wip.memoizedState = current.memoizedState;
	return wip;
};

export function createFiberFromElement(element: ReactElementType) {
	const { props, key, type } = element;
	let fiberTag: WorkTag = FunctionComponet;
	//div span p为hostComponet
	if (typeof type === 'string') {
		fiberTag = HostComponent;
	} else if (typeof type !== 'function' && __DEV__) {
		console.log('没有实现的reactType', type);
	}
	const fiber = new FiberNode(fiberTag, props, key);
	fiber.type = type;
	return fiber;
}
