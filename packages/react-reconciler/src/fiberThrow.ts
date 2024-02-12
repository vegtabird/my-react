/* eslint-disable no-inner-declarations */
import { Wakeable } from 'shared/ReactTypes';
import { FiberRootNode } from './fiber';
import { Lane, markRootPinged } from './fiberLanes';
import { ensureRootIsScheduled, markRootUpdated } from './workLoop';
import { getSuspenseHandler } from './suspenseContext';
import { ShouldCapture } from './fiberFlag';

function attachPing(root: FiberRootNode, wakeable: Wakeable<any>, lane: Lane) {
	//处理缓存
	let pingCache = root.pingCache;
	let threadIds;
	if (pingCache === null) {
		threadIds = new Set<Lane>();
		pingCache = root.pingCache = new WeakMap<Wakeable<any>, Set<Lane>>();
		pingCache.set(wakeable, threadIds);
	} else {
		threadIds = pingCache.get(wakeable);
		if (!threadIds) {
			threadIds = new Set<Lane>();
			pingCache.set(wakeable, threadIds);
		}
	}
	if (!threadIds.has(lane)) {
		//首次进入
		threadIds.add(lane);
		function ping() {
			if (pingCache !== null) {
				pingCache.delete(wakeable);
			}
			markRootPinged(root, lane);
			markRootUpdated(root, lane);
			ensureRootIsScheduled(root);
		}
		wakeable.then(ping, ping);
	}
}

export function throwException(root: FiberRootNode, value: any, lane: Lane) {
	//thenable
	if (
		value !== null &&
		typeof value === 'object' &&
		typeof value.then === 'function'
	) {
		const wakeable: Wakeable = value;
		const suspenseBoundary = getSuspenseHandler();
		if (suspenseBoundary) {
			suspenseBoundary.flag |= ShouldCapture;
		}
		attachPing(root, wakeable, lane);
	}
}
