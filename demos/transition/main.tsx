import ReactDOM from 'react-dom';

import { useState, useTransition, useRef, useEffect } from 'react';
import TabButton from './TabButton';
import AboutTab from './AboutTab';
import PostsTab from './PostTab';
import ContactTab from './Contact';
import './style.css';

function App() {
	const [isPending, startTransition] = useTransition();
	const [tab, setTab] = useState('about');
	const divRef = useRef(null);
	const testRef = useRef(null)
	console.log('hello', isPending);
	function selectTab(nextTab) {
		console.log('change ref', testRef.current)
		startTransition(() => {
			setTab(nextTab);
		});
	}
	console.log('render ref', testRef.current);
	useEffect(() => {
		console.log('effect ref', divRef.current);
	}, []);

	return (
		<>
			<TabButton isActive={tab === 'about'} onClick={() => selectTab('about')}>
				首页
			</TabButton>
			<TabButton isActive={tab === 'posts'} onClick={() => selectTab('posts')}>
				博客 (render慢)
			</TabButton>
			<TabButton
				isActive={tab === 'contact'}
				onClick={() => selectTab('contact')}
			>
				联系我
			</TabButton>
			<hr />
			{tab === 'about' && <div ref={testRef}>222</div>}
			{tab === 'posts' && <PostsTab />}
			{tab === 'contact' && <ContactTab />}
			<div ref={divRef}>111111</div>
		</>
	);
}

const root = ReactDOM.createRoot(document.querySelector('#root'));

root.render(<App />);
