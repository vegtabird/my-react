import { Container } from 'hostConfig';
import { Props } from 'shared/ReactTypes';

export const elementPropsKey = '__props';
const validEventTypeList = ['click'];
type EventCallback = (e: Event) => void;
interface Paths {
	bubble: EventCallback[];
	capture: EventCallback[];
}
interface SyntheticEvent extends Event {
	__stopPropagation: boolean;
}
export interface DomeElement extends HTMLElement {
	[elementPropsKey]: Props;
}

export function updateDomPropsFromFiber(node: DomeElement, props: Props) {
	node[elementPropsKey] = props;
}

export function initEvent(container: Container, eventType: string) {
	if (!validEventTypeList.includes(eventType)) {
		console.warn('未支持的事件');
	}
	container.addEventListener(eventType, (event) => {
		dispatchEvent(container, eventType, event);
	});
}

function getEventName(type: string): string[] | undefined {
	return {
		click: ['onClickCapture', 'onClick']
	}[type];
}

function collectEventPath(
	target: DomeElement,
	container: Container,
	eventType: string
): Paths {
	const paths: Paths = {
		bubble: [],
		capture: []
	};
	while (target && target !== container) {
		const elementProps = target[elementPropsKey];
		if (elementProps) {
			const eventList = getEventName(eventType);
			eventList?.forEach((type, i) => {
				const eventCallback = elementProps[type];
				if (eventCallback) {
					if (i === 0) {
						paths.capture.unshift(eventCallback);
					} else {
						paths.bubble.push(eventCallback);
					}
				}
			});
		}
		target = target.parentNode as DomeElement;
	}
	return paths;
}

function createSyntheticEvent(e: Event): SyntheticEvent {
	const syntheticEvent = e as SyntheticEvent;
	const originStopPropagation = e.stopPropagation;
	syntheticEvent.__stopPropagation = false;
	syntheticEvent.stopPropagation = () => {
		syntheticEvent.__stopPropagation = true;
		if (originStopPropagation) {
			originStopPropagation();
		}
	};
	return syntheticEvent;
}

function triggleEvent(callbackList: EventCallback[], se: SyntheticEvent) {
	for (let i = 0; i < callbackList.length; ++i) {
		const callback = callbackList[i];
		callback.call(null, se);
		if (se.__stopPropagation) {
			return;
		}
	}
}

function dispatchEvent(container: Container, eventType: string, event: Event) {
	const targetElement = event.target;
	if (!targetElement) {
		console.warn('当前元素无target');
		return;
	}
	//收集target->container上元素的事件回调
	const { bubble, capture } = collectEventPath(
		targetElement as DomeElement,
		container,
		eventType
	);
	//创建合成事件
	const syntheticEvent = createSyntheticEvent(event);
	triggleEvent(capture, syntheticEvent);
	if (!syntheticEvent.__stopPropagation) {
		triggleEvent(bubble, syntheticEvent);
	}
}
