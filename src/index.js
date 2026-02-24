import { messages, _fatal, _error, _warn, _debug } from './dx';
import { set_style, reset_styles, attach_listener, detach_all_listeners } from './helpers';
import { empty_controller, normalize_options, option_defaults, set_normalize } from './options';

// ---

/** @typedef {import('../index').PinchZoomOptions} PinchZoomOptions */
/** @typedef {import('../index').PinchZoomController} PinchZoomController */

/**
 * Attach pinch-zoom functionality to an element
 * @param {HTMLElement} element --- The target element to attach zoom functionality
 * @param {PinchZoomOptions} [options] --- Configuration options
 * @returns {PinchZoomController}
 */
export function attachPinchZoom(element, options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    _fatal(messages['ssr']);
    return empty_controller();
  }

  if (!(element && element instanceof Element)) {
    _fatal(messages['target-element']);
    return empty_controller();
  }

  const rAF = (function () {
    if (typeof requestAnimationFrame === 'function') {
      return requestAnimationFrame.bind(window);
    }
    return f => setTimeout(() => f(Date.now()), 16);
  })();

  // --- normalize options

  const opts = normalize_options({
    ...option_defaults,
    ...options,
  });
  const container = element.parentElement;
  if (!container) {
    _fatal(messages['parent-element']);
    return empty_controller();
  }

  let pan_mode = opts.panMode;

  // container.classList.add('pinch-zoom-container'); // (unused; selector)
  let resets_container = {};
  set_style(container, resets_container, 'overflow', 'auto');
  set_style(container, resets_container, 'touchAction', 'pan-x pan-y');
  set_style(container, resets_container, 'position', 'relative');

  let is_rtl = window.getComputedStyle(container).direction === 'rtl';

  let resets_element = {};
  // element.classList.add('pinch-zoom-content'); // (unused; selector)
  set_style(element, resets_element, 'backfaceVisibility', 'hidden'); // perf
  set_style(element, resets_element, 'contain', 'layout paint'); // perf
  set_style(element, resets_element, 'position', 'absolute');
  if (opts.hinted)
    if (opts.mode === 'zoom') {
      set_style(element, resets_element, 'willChange', 'zoom');
    } else {
      set_style(element, resets_element, 'willChange', 'transform');
    }

  // --- setup

  let scale = 1;
  let target_scale = 1;
  let m_x = 0;
  let m_y = 0;
  let translate_x = 0;
  let translate_y = 0;
  let target_x = 0;
  let target_y = 0;

  let use_zoom = true;
  let is_wheel_event = false;
  let wheel_debounce_timout, scroll_debounce_timout;
  let _paint_queue = false;

  let cached_metrics = {};

  function update_cached_metrics() {
    cached_metrics.rect = container.getBoundingClientRect();
    cached_metrics.element_ow = element.offsetWidth;
    cached_metrics.element_oh = element.offsetHeight;
    cached_metrics.element_ol = element.offsetLeft;
    cached_metrics.element_ot = element.offsetTop;
    cached_metrics.container_ct = container.clientTop;
    cached_metrics.container_cl = container.clientLeft;
    cached_metrics.container_cw = container.clientWidth;
    cached_metrics.container_ch = container.clientHeight;
    cached_metrics.scroll_left = is_rtl ? -container.scrollLeft : container.scrollLeft;
    cached_metrics.scroll_top = container.scrollTop;
    if (cached_metrics.element_ow * scale < cached_metrics.container_cw) {
      translate_x = is_rtl
        ? -(cached_metrics.container_cw - cached_metrics.element_ow * scale) / 2
        : (cached_metrics.container_cw - cached_metrics.element_ow * scale) / 2;
    } else {
      translate_x = 0;
    }
    if (cached_metrics.element_oh * scale < cached_metrics.container_ch) {
      translate_y = (cached_metrics.container_ch - cached_metrics.element_oh * scale) / 2;
    } else {
      translate_y = 0;
    }
  }

  function _paint() {
    if (opts.mode === 'zoom') {
      element.style.zoom = scale;
    } else {
      element.style.transformOrigin = `${is_rtl ? '100%' : '0'} 0`;
      element.style.transform = `translate(${translate_x}px, ${translate_y}px) scale(${scale})`;
    }

    // rtl logic tested on latest firefox, chrome, and edge versions only
    container.scrollLeft = is_rtl ? -cached_metrics.scroll_left : cached_metrics.scroll_left;
    container.scrollTop = cached_metrics.scroll_top;
    if (typeof opts.onZoom === 'function') {
      opts.onZoom({ scale: scale, x: cached_metrics.scroll_left, y: cached_metrics.scroll_top });
    }
    _paint_queue = false;
  }

  function update_and_paint() {
    update_cached_metrics();
    _paint();
  }
  update_and_paint();

  // --- main

  function apply_zoom(f_opts) {
    target_x = f_opts.x;
    target_y = f_opts.y;

    target_scale = Math.min(
      Math.max(opts.min, target_scale - target_scale * (f_opts.delta * opts.speed)),
      opts.max
    );

    if (!_paint_queue) {
      _paint_queue = true;
      rAF(smooth_update);
    }
  }
  function smooth_update() {
    const diff = target_scale - scale;

    if (Math.abs(diff) > 0.001 && opts.smooth && opts.mode !== 'zoom') {
      perform_transform(0.15, diff);
      rAF(smooth_update);
    } else {
      perform_transform(1, diff);
      _paint_queue = false;
    }
  }
  function perform_transform(lerp, diff) {
    // mouse pos, relative to element visual state
    m_x =
      target_x -
      cached_metrics.rect.left -
      cached_metrics.element_ol -
      cached_metrics.container_cl -
      translate_x;
    m_y =
      target_y -
      cached_metrics.rect.top -
      cached_metrics.element_ot -
      cached_metrics.container_ct -
      translate_y;
    let content_x = (m_x + cached_metrics.scroll_left) / scale;
    let content_y = (m_y + cached_metrics.scroll_top) / scale;

    scale += diff * lerp;

    if (cached_metrics.element_ow * scale < cached_metrics.container_cw) {
      // width of content is less than viewport
      translate_x = is_rtl
        ? -(cached_metrics.container_cw - cached_metrics.element_ow * scale) / 2
        : (cached_metrics.container_cw - cached_metrics.element_ow * scale) / 2;
      cached_metrics.scroll_left = 0;
    } else {
      translate_x = 0;
      cached_metrics.scroll_left = content_x * scale - m_x - translate_x;
    }

    if (cached_metrics.element_oh * scale < cached_metrics.container_ch) {
      // height of content is less than viewport
      translate_y = (cached_metrics.container_ch - cached_metrics.element_oh * scale) / 2;
      cached_metrics.scroll_top = 0;
    } else {
      translate_y = 0;
      cached_metrics.scroll_top = content_y * scale - m_y - translate_y;
    }

    _paint();
  }

  function wheel_listener(e) {
    if (!is_wheel_event) {
      is_wheel_event = true;
      update_cached_metrics();
    }
    clearTimeout(wheel_debounce_timout);
    if (e.ctrlKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    if (e.ctrlKey && use_zoom) {
      let norm_delta;
      if ('deltaX' in e) {
        // if (Math.abs(e.deltaY) < 24 && e.deltaY % 1 !== 0) {
        // trackpad pinching
        // } else
        if (Math.abs(e.deltaY) < 90 && e.deltaY % 1 !== 0) {
          // ctrl + trackpad // & trackpad pinching
          norm_delta = e.deltaY * [1, 28, 500][e.deltaMode || 0];
        } else {
          // ctrl + wheel
          norm_delta = e.deltaY * [1, 28, 500][e.deltaMode || 0] * 0.25;
        }
      } else if ('wheelDeltaX' in e)
        norm_delta = (e.wheelDeltaY * 0.25) / -3; // legacy
      else norm_delta = (e.wheelDelta * 0.25) / -3;
      apply_zoom({
        delta: norm_delta,
        x: is_rtl ? window.innerWidth - e.clientX : e.clientX,
        y: e.clientY,
        rect: cached_metrics.rect,
        scroll_left: cached_metrics.scroll_left,
        scroll_top: cached_metrics.scroll_top,
      });
    } else {
      use_zoom = false;
    }

    wheel_debounce_timout = setTimeout(function () {
      update_cached_metrics();
      use_zoom = true;
      is_wheel_event = false;
    }, 80);
  }

  let general_listeners = [];
  general_listeners.push(attach_listener(container, 'wheel', wheel_listener, { passive: false }));

  function scroll_listener() {
    scroll_debounce_timout && clearTimeout(scroll_debounce_timout);
    scroll_debounce_timout = setTimeout(update_cached_metrics, 80);
  }
  general_listeners.push(attach_listener(container, 'scroll', scroll_listener, { passive: true }));

  // --- kbd shortcuts

  let kbd_listeners = [];

  function kbd_listener(e) {
    // reset zoom
    if (e.ctrlKey || e.metaKey)
      if (e.key === '0' || e.code === 'Digit0' || e.keyCode === 48) {
        apply_zoom({
          delta: (scale - 1) / scale / opts.speed,
          x: m_x,
          y: m_y,
          rect: container.getBoundingClientRect(),
          scroll_left: container.scrollLeft,
          scroll_top: container.scrollTop,
        });
      } else if (e.key === '=' || e.code === 'Equal') {
        e.preventDefault();
        apply_zoom({
          delta: -50 / scale,
          x: container.clientWidth / 2,
          y: container.clientHeight / 2,
          rect: container.getBoundingClientRect(),
          scroll_left: container.scrollLeft,
          scroll_top: container.scrollTop,
        });
      } else if (e.key === '-' || e.code === 'Minus') {
        e.preventDefault();
        apply_zoom({
          delta: 50 / scale,
          x: container.clientWidth / 2,
          y: container.clientHeight / 2,
          rect: container.getBoundingClientRect(),
          scroll_left: container.scrollLeft,
          scroll_top: container.scrollTop,
        });
      }
  }

  if (opts.kbdEvents)
    kbd_listeners.push(attach_listener(document, 'keydown', kbd_listener, { passive: false }));

  // --- mouse pan

  let is_kbd_pannable = false,
    is_mmouse_down = false,
    is_lmouse_down = false,
    is_rmouse_down = false;
  let use_middle = pan_mode.indexOf('middle') !== -1;
  let use_right = pan_mode.indexOf('right') !== -1;
  let pan_origin = { x: 0, y: 0 };

  let pan_kbd_end_listeners = [];
  let pan_mouse_listeners = [];
  let pan_start_listeners = [];

  function update_pan_cursor_state() {
    if (
      (is_mmouse_down && use_middle) ||
      (is_rmouse_down && use_right) ||
      (is_kbd_pannable && is_lmouse_down)
    ) {
      container.style.cursor = 'grabbing';
    } else if (is_kbd_pannable) {
      container.style.cursor = 'grab';
    } else {
      container.style.cursor = '';
    }
  }

  function pan_kbd_drag__keyup(e) {
    let condition =
      (pan_mode.indexOf('ctrl') !== -1 && e.ctrlKey) ||
      (pan_mode.indexOf('shift') !== -1 && e.shiftKey) ||
      (pan_mode.indexOf('alt') !== -1 && e.altKey) ||
      (pan_mode.indexOf('meta') !== -1 && e.metaKey);
    if (!condition && is_kbd_pannable) {
      is_kbd_pannable = false;
      update_pan_cursor_state();
      detach_all_listeners(pan_kbd_end_listeners);
    }
  }
  function pan_kbd_drag__lost_focus(e) {
    is_kbd_pannable = false;
    is_mmouse_down = false;
    update_pan_cursor_state();
    detach_all_listeners(pan_kbd_end_listeners);
  }
  function pan_kbd_drag__keydown(e) {
    let condition =
      (pan_mode.indexOf('ctrl') !== -1 && e.ctrlKey) ||
      (pan_mode.indexOf('shift') !== -1 && e.shiftKey) ||
      (pan_mode.indexOf('alt') !== -1 && e.altKey) ||
      (pan_mode.indexOf('meta') !== -1 && e.metaKey);
    if (condition && !is_kbd_pannable) {
      is_kbd_pannable = true;
      update_pan_cursor_state();
      pan_kbd_end_listeners.push(attach_listener(document, 'keyup', pan_kbd_drag__keyup));
      pan_kbd_end_listeners.push(attach_listener(window, 'blur', pan_kbd_drag__lost_focus));
    }
  }

  function pan_drag__mouse_down(e) {
    if (
      (is_kbd_pannable && e.button === 0) ||
      (use_middle && e.button === 1) ||
      (use_right && e.button === 2)
    ) {
      e.preventDefault();
      if (e.button === 1) {
        is_mmouse_down = true;
      } else if (e.button === 2) {
        is_rmouse_down = true;
      } else if (e.button === 0) {
        is_lmouse_down = true;
      }
      update_pan_cursor_state();
      update_cached_metrics();
      pan_origin.x = cached_metrics.scroll_left + e.clientX;
      pan_origin.y = cached_metrics.scroll_top + e.clientY;
      pan_mouse_listeners.push(attach_listener(document, 'mousemove', pan_drag__mouse_move));
      pan_mouse_listeners.push(attach_listener(document, 'mouseup', pan_drag__mouse_up));
    }
  }
  function pan_drag__mouse_move(e) {
    if (
      (is_kbd_pannable && is_lmouse_down) ||
      (is_mmouse_down && pan_mode.indexOf('middle') !== -1) ||
      (is_rmouse_down && pan_mode.indexOf('right') !== -1)
    ) {
      container.scrollLeft = pan_origin.x - e.clientX;
      container.scrollTop = pan_origin.y - e.clientY;
      update_cached_metrics();
      if (typeof opts.onPan === 'function') {
        opts.onPan({ scale: scale, x: cached_metrics.scroll_left, y: cached_metrics.scroll_top });
      }
    }
  }
  function pan_drag__mouse_up(e) {
    if (e.button === 1) {
      is_mmouse_down = false;
    } else if (e.button === 2) {
      is_rmouse_down = false;
    } else if (e.button === 0) {
      is_lmouse_down = false;
    }
    update_pan_cursor_state();
    detach_all_listeners(pan_mouse_listeners);
  }
  function pan_drag__ctx_cancel(e) {
    if (pan_mode.indexOf('right') !== -1) e.preventDefault();
  }

  if (
    pan_mode.indexOf('ctrl') !== -1 ||
    pan_mode.indexOf('shift') !== -1 ||
    pan_mode.indexOf('meta') !== -1 ||
    pan_mode.indexOf('alt') !== -1 ||
    use_middle ||
    use_right
  ) {
    pan_start_listeners.push(attach_listener(container, 'mousedown', pan_drag__mouse_down));
    pan_start_listeners.push(
      attach_listener(document, 'keydown', pan_kbd_drag__keydown, { passive: true })
    );
    pan_start_listeners.push(attach_listener(container, 'contextmenu', pan_drag__ctx_cancel));
  }

  // --- touchscreen support

  let touch_span = 0;
  let touch_is_multi = false;
  let touch_x, touch_y;

  function touch_start_listener(e) {
    if (e.touches && e.touches.length >= 2) {
      touch_is_multi = true;
      update_cached_metrics();
      touch_span = Math.sqrt(
        Math.pow(e.touches[0].pageX - e.touches[1].pageX, 2) +
          Math.pow(e.touches[0].pageY - e.touches[1].pageY, 2)
      );
      // touch_theta = Math.atan2(e.touches[1].pageY - e.touches[0].pageY, e.touches[1].pageX - e.touches[0].pageX);
      touch_x = (e.touches[0].pageX + e.touches[1].pageX) / 2;
      touch_y = (e.touches[0].pageY + e.touches[1].pageY) / 2;
    }
  }
  function touch_move_listener(e) {
    e.preventDefault();
    if (e.touches && e.touches.length >= 2) {
      let dist = Math.sqrt(
        Math.pow(e.touches[0].pageX - e.touches[1].pageX, 2) +
          Math.pow(e.touches[0].pageY - e.touches[1].pageY, 2)
      );
      // theta = Math.atan2(e.touches[1].pageY - e.touches[0].pageY, e.touches[1].pageX - e.touches[0].pageX) - touch_theta /* + angle */;
      // if (theta > Math.PI) theta -= 2 * Math.PI;
      // if (theta < -Math.PI) theta += 2 * Math.PI;
      // if (Math.abs(theta) < (Math.PI / 12)) theta = 0; // snap logic
      touch_x = (e.touches[0].pageX + e.touches[1].pageX) / 2;
      touch_y = (e.touches[0].pageY + e.touches[1].pageY) / 2;
      apply_zoom({
        delta: (touch_span - dist) / 2,
        x: touch_x,
        y: touch_y,
        rect: cached_metrics.rect,
        scroll_left: cached_metrics.scroll_left,
        scroll_top: cached_metrics.scroll_top,
      });
      touch_span = dist;
    }
  }
  function touch_end_listener(e) {
    if (touch_is_multi) {
      touch_is_multi = false;
      apply_zoom({
        delta: 0,
        x: touch_x,
        y: touch_y,
        rect: cached_metrics.rect,
        scroll_left: cached_metrics.scroll_left,
        scroll_top: cached_metrics.scroll_top,
      });
    }
  }

  let touch_listeners = [];
  if ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) {
    touch_listeners.push(
      attach_listener(container, 'touchstart', touch_start_listener, { passive: false })
    );
    touch_listeners.push(
      attach_listener(container, 'touchmove', touch_move_listener, { passive: false })
    );
    touch_listeners.push(
      attach_listener(container, 'touchend', touch_end_listener, { passive: false })
    );
  }

  // --- attach

  general_listeners.push(attach_listener(window, 'resize', update_and_paint));
  document.readyState !== 'complete' &&
    general_listeners.push(attach_listener(window, 'load', update_and_paint));

  let observer_debounce_timout, observer;
  if (window.ResizeObserver) {
    observer = new ResizeObserver(function (entries) {
      if (!entries.length) return;
      clearTimeout(observer_debounce_timout);
      observer_debounce_timout = setTimeout(update_and_paint, 16);
    });
    observer.observe(element);
  } else {
    observer = new MutationObserver(function () {
      clearTimeout(observer_debounce_timout);
      observer_debounce_timout = setTimeout(update_and_paint, 100);
    });
    observer.observe(element, { childList: true, subtree: true, characterData: true });
  }

  _debug('Attached successfully.');
  _debug(`Options:

mode\t\t${opts.mode}
min\t\t\t${opts.min}
max\t\t\t${opts.max}
speed\t\t${opts.speed * 100}
smooth\t\t${opts.smooth}
kbdEvents\t${opts.kbdEvents}
hinted\t\t${opts.hinted}
panMode\t\t${Array.isArray(opts.panMode) ? opts.panMode.join(' ') : opts.panMode}
rtl\t\t\t${is_rtl}`);

  // ---

  return {
    get success() {
      // readonly
      return true;
    },
    get scale() {
      return scale;
    },
    set scale(use_scale) {
      apply_zoom({
        delta: (scale - use_scale) / scale / opts.speed,
        x: m_x,
        y: m_y,
        rect: container.getBoundingClientRect(),
        scroll_left: container.scrollLeft,
        scroll_top: container.scrollTop,
      });
    },
    get onZoom() {
      return opts.onZoom;
    },
    set onZoom(use_onZoom) {
      if (typeof use_onZoom === 'function') opts.onZoom = use_onZoom;
      else _error(messages['onZoom-type']);
    },
    get viewportX() {
      // readonly
      return m_x;
    },
    get viewportY() {
      // readonly
      return m_y;
    },
    get x() {
      if (is_rtl) return container.scrollWidth - container.clientWidth - container.scrollLeft;
      return container.scrollLeft;
    },
    set x(use_x) {
      if (typeof use_x === 'number')
        if (is_rtl) {
          const max_scroll = container.scrollWidth - container.clientWidth;
          const scroll_pos = Math.min(max_scroll, Math.max(0, use_x));
          container.scrollLeft = max_scroll - scroll_pos;
          cached_metrics.scroll_left = scroll_pos;
        } else {
          container.scrollLeft = use_x;
          cached_metrics.scroll_left = use_x;
        }
    },
    get y() {
      return container.scrollTop;
    },
    set y(use_y) {
      if (typeof use_y === 'number') {
        container.scrollTop = use_y;
        cached_metrics.scroll_top = use_y;
      }
    },
    get mode() {
      return opts.mode;
    },
    set mode(use_mode) {
      if (typeof use_mode === 'string' && use_mode === 'zoom') {
        opts.mode = 'zoom';
        _warn(messages['warn-mode']);
        element.style.zoom = scale;
        element.style.transform = '';
      } else {
        opts.mode = 'transform';
        element.style.transform = `scale(${scale})`;
        element.style.zoom = '';
      }
      update_and_paint();
    },
    get min() {
      return opts.min;
    },
    set min(use_min) {
      opts.min = set_normalize.min(use_min);
      [opts.min, opts.max] = set_normalize.min_max(opts.min, opts.max);
      update_and_paint();
    },
    get max() {
      return opts.max;
    },
    set max(use_max) {
      opts.max = set_normalize.max(use_max);
      [opts.min, opts.max] = set_normalize.min_max(opts.min, opts.max);
      update_and_paint();
    },
    get speed() {
      return opts.speed * 100;
    },
    set speed(use_speed) {
      opts.speed = set_normalize.speed(use_speed);
    },
    get hinted() {
      return opts.hinted;
    },
    set hinted(use_hint) {
      opts.hinted = !!use_hint;
      if (opts.hinted)
        if (opts.mode === 'zoom') {
          element.style.willChange = 'zoom';
        } else {
          element.style.willChange = 'transform';
        }
    },
    get kbdEvents() {
      return opts.kbdEvents;
    },
    set kbdEvents(use_kbd) {
      if (opts.kbdEvents && !use_kbd) {
        opts.kbdEvents = false;
        detach_all_listeners(kbd_listeners);
      } else if (!opts.kbdEvents && !!use_kbd) {
        opts.kbdEvents = true;
        kbd_listeners.push(attach_listener(document, 'keydown', kbd_listener, { passive: false }));
      }
    },
    get smooth() {
      return opts.smooth;
    },
    set smooth(use_smooth) {
      opts.smooth = set_normalize.smooth(use_smooth);
      if (!opts.smooth) {
        scale = target_scale;
        update_and_paint();
      }
    },
    get panMode() {
      return pan_mode;
    },
    set panMode(use_pan_mode) {
      detach_all_listeners(pan_kbd_end_listeners);
      detach_all_listeners(pan_mouse_listeners);
      detach_all_listeners(pan_start_listeners);
      is_kbd_pannable = false;
      is_lmouse_down = false;
      is_mmouse_down = false;
      is_rmouse_down = false;

      opts.panMode = use_pan_mode;
      pan_mode = opts.panMode;
      use_middle = pan_mode.indexOf('middle') !== -1;
      use_right = pan_mode.indexOf('right') !== -1;

      if (
        pan_mode.indexOf('ctrl') !== -1 ||
        pan_mode.indexOf('shift') !== -1 ||
        pan_mode.indexOf('meta') !== -1 ||
        pan_mode.indexOf('alt') !== -1 ||
        use_middle ||
        use_right
      ) {
        pan_start_listeners.push(attach_listener(container, 'mousedown', pan_drag__mouse_down));
        pan_start_listeners.push(
          attach_listener(document, 'keydown', pan_kbd_drag__keydown, { passive: true })
        );
        pan_start_listeners.push(attach_listener(container, 'contextmenu', pan_drag__ctx_cancel));
      }
      update_pan_cursor_state();
    },
    get onPan() {
      return opts.onPan;
    },
    set onPan(use_onPan) {
      if (typeof use_onPan === 'function') opts.onPan = use_onPan;
      else _error(messages['onPan-type']);
    },
    get target() {
      // readonly
      return element;
    },
    get container() {
      // readonly
      return container;
    },
    get isRtl() {
      // readonly
      return is_rtl;
    },
    get reset() {
      // readonly
      return function () {
        apply_zoom({
          delta: (scale - 1) / scale / opts.speed,
          x: m_x,
          y: m_y,
          rect: container.getBoundingClientRect(),
          scroll_left: container.scrollLeft,
          scroll_top: container.scrollTop,
        });
      };
    },
    get update() {
      // readonly
      return function () {
        update_and_paint();
      };
    },
    get destroy() {
      // readonly
      return function () {
        clearTimeout(wheel_debounce_timout);
        clearTimeout(scroll_debounce_timout);
        clearTimeout(observer_debounce_timout);

        // container.classList.remove('pinch-zoom-container');
        // element.classList.remove('pinch-zoom-content');

        detach_all_listeners(general_listeners);
        detach_all_listeners(kbd_listeners);

        detach_all_listeners(pan_kbd_end_listeners);
        detach_all_listeners(pan_mouse_listeners);
        detach_all_listeners(pan_start_listeners);

        detach_all_listeners(touch_listeners);

        if (observer) {
          observer.disconnect();
          observer = null;
        }

        reset_styles(container, resets_container);
        container.style.cursor = '';

        reset_styles(element, resets_element);

        if (opts.mode === 'zoom') element.style.zoom = '';
        else element.style.transform = '';

        container.scrollTop /= scale;
        container.scrollLeft /= scale;
      };
    },
  };
}

// ---

/**
 * Global utility to prevent browser-level zooming.
 * @param {{useMeta?: boolean}} options --- Generate or alter <meta> tag to lock mobile viewport
 * @returns {{readonly unlock(): void}} --- Unlock viewport restrictions
 */
export function pinchZoomLockViewport({ useMeta = false } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    _error(messages['ssr']);
    return {
      unlock() {},
    };
  }
  function lock_wheel_listener(e) {
    if (e.ctrlKey) e.preventDefault();
  }
  window.addEventListener('wheel', lock_wheel_listener, { passive: false });
  document.documentElement.style.touchAction = 'pan-x pan-y';
  document.documentElement.style.overscrollBehavior = 'none';
  let original_meta = null;
  let new_meta = null;
  if (useMeta)
    if (document.querySelector('meta[name=viewport]') !== null) {
      original_meta = document.querySelector('meta[name=viewport]').content;
      document.querySelector('meta[name=viewport]').content =
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content';
    } else if (document.getElementsByTagName('head').length !== 0) {
      new_meta = document
        .getElementsByTagName('head')[0]
        .appendChild(document.createElement('meta'));
      new_meta.name = 'viewport';
      new_meta.content =
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content';
    }

  return {
    get unlock() {
      // readonly
      return function () {
        window.removeEventListener('wheel', lock_wheel_listener);
        document.documentElement.style.touchAction = '';
        document.documentElement.style.overscrollBehavior = '';
        if (useMeta)
          if (original_meta !== null) {
            document.querySelector('meta[name=viewport]').content = original_meta;
          } else {
            new_meta.parentElement.removeChild(new_meta);
          }
      };
    },
  };
}
