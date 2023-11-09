import reactDomConfig from './react-dom.config';
import reactConfig from './react.config';
import reactNoopRender  from './react-noop-render';
export default () => {
	return [...reactConfig, ...reactDomConfig, ...reactNoopRender];
};
