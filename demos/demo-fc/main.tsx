import React from 'react';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';
const App = () => {
	const [num, setNum] = useState(300);
	const arr =
		num % 2 === 0
			? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
			: [
					<li key="3">3</li>,
					<li key="2">2</li>,
					<li key="1">1</li>,
					<li key="4">4</li>
			  ];

	return (
		<div
			onClick={() => {
				setNum(num + 1);
			}}
		>
			{arr}
		</div>
	);
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
