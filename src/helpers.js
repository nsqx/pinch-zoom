import { messages, _fatal, _error, _warn, _log } from './dx';


export function set_style(target, resets, name, value) {
  if (!Object.prototype.hasOwnProperty.call(resets, name)) {
    resets[name] = target.style[name];
    target.style[name] = value;
  }
}
export function reset_styles(target, resets) {
  for (let prop in resets)
    if (resets[prop] !== undefined) {
      target.style[prop] = resets[prop];
    } else {
      target.style[prop] = '';
    }
}

export function attach_listener(target, event, f, options = {}) {
  target.addEventListener(event, f, options);
  return function () {
    target.removeEventListener(event, f, options);
  };
}
export function detach_listener(detach) {
  try {
    detach();
  } catch (ex) {
    _fatal(messages['crit-detach-listener']);
    console.error(ex);
  }
}
export function detach_all_listeners(handles) {
  if (!Array.isArray(handles)) return;
  for (let detach of handles) {
    detach_listener(detach);
  }
  handles.length = 0;
}