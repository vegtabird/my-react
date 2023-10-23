//ReactDom.createDom(root).render
import {
	updateContainer,
	createContainer
} from 'react-reconciler/src/fiberReconciler';
import { Container } from 'hostConfig';
import { ReactElementType } from 'shared/ReactTypes';

export function createDom(container: Container) {
	const root = createContainer(container);
	return {
		render(element: ReactElementType) {
			updateContainer(element, root);
		}
	};
}
