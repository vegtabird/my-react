import React, { useEffect } from 'react';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';
function App() {
	const [num, updateNum] = useState(0);

	return (
		<div onClick={() => updateNum(num + 1)}>
			{num === 0 ? <Parent /> : 'noop'}
		</div>
	);
}

function Parent() {
	useEffect(() => {
		console.log('parent mount');
		return () => {
			console.log('parent unmount');
		};
	}, []);
	return <Child />;
}

function Child() {
	useEffect(() => {
		console.log('Child mount');
		return () => console.log('Child unmount');
	}, []);

	return 'i am child';
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
