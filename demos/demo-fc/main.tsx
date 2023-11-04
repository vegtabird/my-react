import React from 'react';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';
const App = () => {
	const [num, setNum] = useState(300);
	window.setNum = setNum;
	return (
		<div
			onClick={() => {
				setNum(num + 1);
			}}
		>
			{num}
		</div>
	);
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
