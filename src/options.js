import { messages, _error, _warn, _log } from './dx';


export function empty_controller() {
  return {
    success: false,
    scale: 1,
    onZoom() {},
    viewportX: 0,
    viewportY: 0,
    mode: 'transform',
    min: 1,
    max: 1,
    speed: 0,
    hinted: false,
    kbdEvents: false,
    smooth: true,
    panMode: 'none',
    onPan() {},
    target: null,
    container: null,
    isRtl: false,
    reset() {},
    destroy() {},
  };
}

export const option_defaults = {
  min: 1,
  max: 4,
  speed: 1,
  mode: 'transform',
  hinted: false,
  kbdEvents: false,
  panMode: 'none',
}

export function normalize_options(opts) {
  opts.mode = set_normalize.mode(opts.mode);
  opts.smooth = set_normalize.smooth(opts.smooth);
  [opts.min, opts.max] = set_normalize.min_max(opts.min, opts.max);
  opts.min = set_normalize.min(opts.min);
  opts.max = set_normalize.max(opts.max);
  opts.speed = set_normalize.speed(opts.speed);
  return opts;
}

export const set_normalize = {
  mode(use_mode) {
    if (typeof use_mode === 'string' && use_mode === 'zoom') {
      _warn(messages['warn-mode']);
      return 'zoom';
    } else {
      return 'transform';
    }
  },
  smooth(use_smooth) {
    return typeof use_smooth === 'boolean'
      ? use_smooth
      : (window.matchMedia ? !window.matchMedia('(prefers-reduced-motion: reduce)').matches : false);
  },
  min(use_min) {
    if (typeof use_min !== 'number') {
      _error(messages['min-NaN']);
      return 1
    };
    if (use_min > 1) {
      _error(messages['min>']);
      return 1;
    } else if (use_min < 0.001) {
      _error(messages['min<']);
      return 0.001;
    } else {
      return use_min;
    }
  },
  max(use_max) {
    if (typeof use_max !== 'number') {
      _error(messages['max-NaN']);
      return 4;
    };
    if (use_max >= 1000) {
      _warn(messages['warn-high-zoom']);
    }
    if (use_max < 1) {
      _error(messages['max<']);
      return 1;
    } else if (use_max > 2500) {
      _error(messages['max>']);
      return 2500;
    } else {
      return use_max;
    }
  },
  min_max(use_min, use_max) {
    if (use_min > use_max) {
      _error(messages['min-max']);
      return [use_max, use_min];
    } else {
      return [use_min, use_max];
    }
  },
  speed(use_speed) {
    if (typeof use_speed !== 'number') {
      _error(messages['speed-NaN']);
      return 1 / 100;
    };
    if (use_speed > 10) {
      _error(messages['speed>']);
      return 10 / 100;
    } else if (use_speed < 0.1) {
      _error(messages['speed<']);
      return 0.1 / 100;
    } else {
      return use_speed / 100;
    }
  }
}