import React from 'react';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';
function App() {
	const [num, updateNum] = useState(100);

	return (
		<div
			onClick={() => {
				updateNum(1);
			}}
		>
			{num}
			<Child />
		</div>
	);
}
function Child() {
	console.log('render child');
	return <li>Child</li>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
