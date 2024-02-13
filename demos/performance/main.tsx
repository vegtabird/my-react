import React, { memo, useCallback } from 'react';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';
function App() {
	const [num, updateNum] = useState(100);
	const addFn = () => {
		console.log('add');
	};
	const addMemoFn = useCallback(() => {
		console.log('111');
	}, []);
	return (
		<div
			onClick={() => {
				updateNum((num) => num + 1);
			}}
		>
			{num}
			<Child num={0} test={'1111'} addFn={addFn} />
			<Child num={0} test={'1112'} addFn={addMemoFn} />
		</div>
	);
}
const Child = memo(function ({ num, test, addFn }) {
	console.log('render child', num, test);
	return <li>Child</li>;
});

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
