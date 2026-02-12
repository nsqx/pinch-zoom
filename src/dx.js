export const messages = {
  'ssr': 'All functions must be called from the client side.',
  'warn-mode': 'Use of the non-standard \'zoom\' mode is discouraged. Please use \'transform\' instead to increase performance and avoid layout shifting.',
  'min-max': 'The minimum scale value may not exceed the maximum scale value.',
  'min-NaN': 'The minimum scale value must be a number.',
  'min<': 'The minimum scale value may not be less than 0.001.',
  'min>': 'The minimum scale value may not be greater than 1.',
  'max-NaN': 'The maximum scale value must be a number.',
  'max<': 'The maximum scale value may not be less than 1.',
  'max>': 'The maximum scale value may not be greater than 2500.',
  'speed-NaN': 'The speed multiplier must be a number.',
  'speed<': 'The speed multiplier may not be less than 0.1.',
  'speed>': 'The speed multiplier may not be greater than 10.',
  'warn-high-zoom': 'High zoom levels may impact performance.',
  'crit-detach-listener': 'Something went wrong (detach_listener)...\n\nPlease submit an issue at https://github.com/nsqx/pinch-zoom and include relevant details.',
  'parent-element': 'Target element must have a parent container.',
  'target-element': 'Target must be an element.',
  'onZoom-type': 'onZoom must be a function.',
  'onPan-type': 'onPan must be a function.'
}


export function _fatal(msg) {
  console.error('%c@nsqx/pinch-zoom:%c ' + msg, 'padding:1px 4px;border-width:2px;border-color:#fa4549;border-style:solid;border-radius:4px;', '');
}
export function _error(msg) {
  console.error('%c@nsqx/pinch-zoom:%c ' + msg, '', '');
}
export function _warn(msg) {
  console.warn('%c@nsqx/pinch-zoom:%c ' + msg, '', '');
}
export function _log(msg) {
  console.log('%c@nsqx/pinch-zoom:%c ' + msg, 'color:#218bff', '');
}
export function _debug(msg) {
  console.debug('%c@nsqx/pinch-zoom:%c ' + msg, 'color:#218bff', '');
}