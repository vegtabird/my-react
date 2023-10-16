export type WorkTag =
	| typeof FunctionComponet
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText;

//函数组件
export const FunctionComponet = 0;
//渲染的根组件
export const HostRoot = 3;
//普通的节点<div>
export const HostComponent = 5;
//<div>111</div> 中的111
export const HostText = 6;
