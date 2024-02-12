import {
	FulfilledThenable,
	PendingThenable,
	RejectedThenable,
	Thenable
} from 'shared/ReactTypes';

export const SuspenseException = new Error(
	'这不是个真实的错误，而是Suspense工作的一部分。如果你捕获到这个错误，请将它继续抛出去'
);

let suspendedThenable: Thenable<any> | null = null;

export function getSuspenseThenable(): Thenable<any> {
	if (suspendedThenable === null) {
		throw new Error('应该存在suspendedThenable，这是个bug');
	}
	const thenable = suspendedThenable;
	suspendedThenable = null;
	return thenable;
}

function noLoop() {}

export function trackUsedThenable<T>(thenable: Thenable<T>) {
	const status = thenable.status;
	switch (status) {
		case 'fulfilled':
			return thenable.value;
		case 'rejected':
			throw thenable.reason;
		default:
			if (typeof status === 'string') {
				thenable.then(noLoop, noLoop);
			} else {
				const pending = thenable as unknown as PendingThenable<T, void, any>;
				pending.status = 'pending';
				pending.then(
					(val) => {
						if (pending.status === 'pending') {
							//@ts-ignore
							const Fulfilled: FulfilledThenable<T, void, any> = pending;
							Fulfilled.status = 'fulfilled';
							Fulfilled.value = val;
						}
					},
					(err) => {
						if (pending.status === 'pending') {
							//@ts-ignore
							const Fulfilled: RejectedThenable<T, void, any> = pending;
							Fulfilled.status = 'rejected';
							Fulfilled.reason = err;
						}
					}
				);
			}
	}
	suspendedThenable = thenable;
	throw SuspenseException;
}
