import React from 'react';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';
const App = () => {
	const [num, setNum] = useState(300);
	return <div>{num}</div>;
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
