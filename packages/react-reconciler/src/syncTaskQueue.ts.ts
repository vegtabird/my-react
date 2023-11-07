let scheduleCallbacks: ((...args: any) => void)[] | null = null;
let isFlushingSyncQueue: boolean = false;
function scheduleSyncCallback(callback: (...args: any) => void) {
	if (scheduleCallbacks === null) {
		scheduleCallbacks = [callback];
	} else {
		scheduleCallbacks.push(callback);
	}
}
function flushSyncCallbacks() {
	if (!isFlushingSyncQueue && scheduleCallbacks) {
		isFlushingSyncQueue = true;
		try {
			scheduleCallbacks.forEach((callback) => {
				console.log('tast run');
				callback();
			});
		} catch (e) {
			console.error('flushSyncCallbacks报错', e);
		} finally {
			isFlushingSyncQueue = false;
			scheduleCallbacks = null;
		}
	}
}
export { scheduleSyncCallback, flushSyncCallbacks };
