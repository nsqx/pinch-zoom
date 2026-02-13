/**
 * Options for pinch-zoom
 */
export interface PinchZoomOptions {
  /** Minimum zoom level @default 1 */
  min?: number;
  /** Maximum zoom level @default 4 */
  max?: number;
  /** Sensitivity of the zoom action @default 1 */
  speed?: number;
  /** Enable smooth interpolation
   *
   * Respects accessibility preferences if left unset
   * @default true
   */
  smooth?: boolean;
  /** CSS method used for scaling
   ** `transform`: use CSS transforms
   * @deprecated `zoom`: use non-standard `zoom` property
   * @default 'transform' */
  mode?: 'transform' | 'zoom';
  /** Apply CSS `will-change` to hint optimization @default false */
  hinted?: boolean;
  /** Enable document-level keyboard shortcuts (Ctrl + / - / 0) @default false */
  kbdEvents?: boolean;
  /** Set mouse panning behavior
   * 
   * Acceptable values:
   ** `none`: disabled
   ** string or array containing any of `ctrl`, `shift`, `meta`, `alt`, `middle`, or `right`
   * @default 'none' */
  panMode?: 'none' | string | ('ctrl' | 'shift' | 'meta' | 'alt' | 'middle' | 'right')[];
  /** Callback when zooming occurs */
  onZoom?: (data: { scale: number; x: number; y: number }) => void;
  /** Callback when panning occurs */
  onPan?: (data: { scale: number; x: number; y: number }) => void;
}

/**
 * The controller object returned by attachPinchZoom
 */
export interface PinchZoomController {
  /** If the controller was successfully attached */
  readonly success: boolean;
  /** Set the current scale value */
  scale: number;
  /** The current X position of the zoom origin (readonly) */
  readonly viewportX: number;
  /** The current Y position of the zoom origin (readonly) */
  readonly viewportY: number;
  /** The current horizontal scroll offset of the container */
  x: number;
  /** The current vertical scroll offset of the container */
  y: number;
  /** The current zoom mode */
  mode: 'transform' | 'zoom';
  /** Minimum zoom limit */
  min: number;
  /** Maximum zoom level */
  max: number;
  /** Zoom speed */
  speed: number;
  /** Enable / disable performance hinting */
  hinted: boolean;
  /** Enable / disable global keyboard events for this instance */
  kbdEvents: boolean;
  /** Mouse panning mode. */
  panMode: 'none' | string | ('ctrl' | 'shift' | 'meta' | 'alt' | 'middle' | 'right')[];
  /** Callback fired when zooming */
  onZoom: (data: { scale: number; x: number; y: number }) => void;
  /** Callback fired when panning */
  onPan: (data: { scale: number; x: number; y: number }) => void;
  /** The target element being scaled (readonly) */
  readonly target: HTMLElement | null;
  /** The container element which manages scroll/pan (readonly) */
  readonly container: HTMLElement | null;
  /** If the element is using RTL coordinates (readonly) */
  readonly isRtl: boolean;
  /** Reset zoom level */
  readonly reset: () => void;
  /** Update metrics & paint */
  readonly update: () => void;
  /** Remove all event listeners and restore original styles */
  readonly destroy: () => void;
}

/**
 * Attach pinch-zoom functionality to an element.
 */
export function attachPinchZoom(
  element: HTMLElement,
  options?: PinchZoomOptions
): PinchZoomController;

/**
 * Global utility to disable viewport-level pinch / zoom events.
 */
export function pinchZoomLockViewport(options: { useMeta?: boolean }): {
  /** Release viewport lock and restore original viewport settings */
  readonly unlock: () => void;
};