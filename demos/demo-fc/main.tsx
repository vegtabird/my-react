import React, { useEffect } from 'react';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';
function App() {
	const [num, updateNum] = useState(100);
	useEffect(()=>{
		console.log('effect')
	},[])

	return (
		<div>111</div>
		// <ul onClick={() => updateNum(50)}>
		// 	{new Array(num).fill(0).map((_, i) => {
		// 		return <Child key={i}>{i}</Child>;
		// 	})}
		// </ul>
	);
}
// function Child({ children }) {
// 	const now = performance.now();
// 	while (performance.now() - now < 4) {
// 		console.log(performance.now() - now)
// 	}
// 	return <li>{children}</li>;
// }

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
