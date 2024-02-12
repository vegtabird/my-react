export type WorkTag =
	| typeof FunctionComponet
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText
	| typeof Fragment
	| typeof ContextProvider
	| typeof SuspenseComponent
	| typeof OffscreenComponent;

//函数组件
export const FunctionComponet = 0;
//渲染的根组件
export const HostRoot = 3;
//普通的Dom节点<div>
export const HostComponent = 5;
//<div>111</div> 中的111
export const HostText = 6;

export const Fragment = 7;

export const ContextProvider = 8;

export const SuspenseComponent = 13;
export const OffscreenComponent = 14;
