import { popProvider } from '../fiberContext';
import { FiberNode } from './fiber';
import { DidCapture, NoFlags, ShouldCapture } from './fiberFlag';
import { popSuspenseHandler } from './suspenseContext';
import { ContextProvider, SuspenseComponent } from './workTag';

export function unwindWork(wip: FiberNode) {
	const flags = wip.flag;
	switch (wip.tag) {
		case SuspenseComponent:
			popSuspenseHandler();
			if (
				(flags & ShouldCapture) !== NoFlags &&
				(flags & DidCapture) === NoFlags
			) {
				wip.flag = (flags & ~ShouldCapture) | DidCapture;
				return wip;
			}
			return null;

		case ContextProvider:
			const context = wip.type._context;
			popProvider(context);
			return null;
		default:
			return null;
	}
}
