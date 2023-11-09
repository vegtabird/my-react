//ReactDom.createDom(root).render
import {
	updateContainer,
	createContainer
} from 'react-reconciler/src/fiberReconciler';
import { Container, Instance } from './hostConfig';
import { ReactElementType } from 'shared/ReactTypes';
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols';
import * as Scheduler from 'scheduler';
let idCounter = 0;

export function createRoot() {
	const container: Container = {
		rootID: idCounter++,
		children: []
	};
	//@ts-ignore
	const root = createContainer(container);
	function getChildren(parent: Instance | Container) {
		return parent ? parent.children : [];
	}
	function getChildrenAsJsx(root: Container) {
		const children = childToJsx(getChildren(root));
		if (Array.isArray(children)) {
			return {
				$$typeof: REACT_ELEMENT_TYPE,
				type: REACT_FRAGMENT_TYPE,
				key: null,
				ref: null,
				props: { children },
				__mark: 'my-react'
			};
		}
		return children;
	}
	function childToJsx(child: any) {
		if (typeof child === 'string' || typeof child === 'number') {
			return child;
		}
		//数组类型
		if (Array.isArray(child)) {
			if (child.length === 0) {
				return null;
			}
			if (child.length === 1) {
				return childToJsx(child[0]);
			}
			const children: any[] = child.map(childToJsx);
			if (
				children.every(
					(child) => typeof child === 'string' || typeof child === 'number'
				)
			) {
				return children.join('');
			}
			return children;
		}
		//instance类型
		if (Array.isArray(child.children)) {
			const instance: Instance = child;
			const children = childToJsx(instance.children);
			const props = instance.props;

			if (children !== null) {
				props.children = children;
			}

			return {
				$$typeof: REACT_ELEMENT_TYPE,
				type: instance.type,
				key: null,
				ref: null,
				props,
				__mark: 'my_react'
			};
		}
		return child.text;
	}
	return {
		_Scheduler: Scheduler,
		render(element: ReactElementType) {
			return updateContainer(element, root);
		},
		getChildren() {
			return getChildren(container);
		},
		getChildrenAsJSX() {
			return getChildrenAsJsx(container);
		}
	};
}
