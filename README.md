# @nsqx/pinch-zoom

A lightweight and performant pinch-to-zoom implementation for DOM elements.


## features

* **wheel & trackpad**:  supports both trackpad & wheel zoom
* **touch gestures**:  native-like pinch-to-zoom functionality for mobile devices and touchscreens
* **versatile**:  works with any element that has a scrollable parent
* **supports panning**:  support for panning with middle-mouse, right-mouse, or modifier-key dragging.
* **keyboard shortcuts**:  built-in support for keyboard shortcuts (`^+`/`^-`/`^0`)
* **supports RTL layouts**:  handles right-to-left document layouts\*
* **lightweight**:  zero dependencies, optimized for performance

\*experimental


## installation

```bash
npm install @nsqx/pinch-zoom
```


## quick start

#### JS
```js
import { attachPinchZoom } from '@nsqx/pinch-zoom';

const target = document.querySelector('.zoom-target');
const controller = attachPinchZoom(target, {
  max: 5,
  kbdEvents: true,
  panMode: ['middle', 'ctrl']
});
if (!controller.success) {
  console.error("Attachment failed: check console.");
} else {
  document.querySelector('#reset').onclick = () => controller.reset();
}
```

#### HTML
```html
<div class="zoom-container" style="width: 100%; height: 100%">
  <div class="zoom-target">
    <!-- ... -->
  </div>
</div>
```

**Important:**
The `target` element _must_ have a parent container element. The utility will automatically configure the container's overflow and positioning.
The target element _should_ be the only layout element within its container, but this is not required.

**Important:**
The utility will set `position` to `absolute` on the target element for layout purposes. Therefore, the parent container should have a defined width and height to avoid layout collapse.

Additionally, the dimensions also should not exceed the viewport size. A pinch-zoom container that overflows off of the page may result in functional but confusing behavior.

**Note:** See [troubleshooting](#troubleshooting) if you are considering applying any spacing between the container and the target element.


## API

`attachPinchZoom(element, options)`
| option | type | default | description |
| :-- | :-- | :-- | :-- |
| `min` / `max` | `number` | `1` / `4` | minimum / maximum zoom levels |
| `speed` | `number` | `1` | zoom sensitivity |
| `mode` | `string` | `'transform'` | applied transform method <br>* `'transform'`: CSS `transform: scale` <br>* `'zoom'`: CSS `zoom` property (non-standard) |
| `smooth` | `boolean` | ~ | enable smooth interpolation for zooming. The default value depends on the `prefers-reduced-motion` value of the client. |
| `hinted` | `boolean` | `false` | use CSS `will-change` optimization hint |
| `kbdEvents` | `boolean` | `false` | enable **global** keyboard shortcuts (overrides default behavior) |
| `panMode` | `string` \| `array` | `'none'` | mouse panning methods <br>may include<br>* `'ctrl'`: Control + drag to pan <br>* `'alt'`: Alt + drag to pan <br>* `'meta'`: meta (Command) + drag to pan <br>* `'shift'`: Shift + drag to pan <br>* `'middle'`: middle mouse button drag to pan <br>* `'right'`: right mouse button drag to pan <br>or any combination thereof |
| `onZoom` | `function` | *`() => {}`* | zoom event listener callback <br>* available event properties: `scale`, `x`, `y` |
| `onPan` | `function` | *`() => {}`* | pan event listener callback <br>* available event properties: `scale`, `x`, `y` |

**Note:** The `'zoom'` mode is deprecated. Do *not* use this option in production environments.


### controller object

The function returns a controller, allowing granular control of the PinchZoom object after attachment:

* `scale`:  set the current zoom level.
* `x` / `y`:  set the current scroll-top / scroll-left values.
* `mode`, `min`, `max`, `speed`, `smooth`, `hinted`, `kbdEvents`, `panMode` options can all be changed on-the-fly.
* `reset()`:  reset zoom level.
* `destroy()`:  remove all pinch-zoom functionality and revert to original styles.
* readonly `viewportX` / `viewportY`:  get the screen coordinates of the last zoom event origin.
* readonly `success`:  check if attachment succeeded.
* readonly `isRtl`:  get if pinch-zoom uses right-to-left coordinates.
* readonly `target` / `container`:  references to DOM elements.

**Note:** For performance reasons, the metrics accessed via the controller object are debounced and may be inconsistent with actual measurements.

### global viewport locking

To prevent the entire browser page from zooming while the user interacts with your component, you can use the following helper function to lock the viewport.

```js
import { pinchZoomLockViewport } from '@nsqx/pinch-zoom';

const lock = pinchZoomLockViewport({ useMeta: true });
// Call lock.unlock() to unlock the viewport & restore native behavior
```


## troubleshooting

* **Did you set a width and height on the element's parent?** Make sure your target element's parent has a defined width and height to prevent layout collapse.
* **Did you set overflow on the container?** If you did, that may interfere with this library's functionality and prevent scrolling or spill contents out of the container.
* **Is the target a block element?** pinch-zoom works best on `div`s, `img`s, and other block elements. Inline elements, such as  `span`s, may behave unexpectedly.
* **Are you using CSS transitions?** If you are, consider disabling CSS transitions for the target's transform or zoom and instead use `smooth: true` in the options. CSS transitions for the relevant properties will conflict with the library's built-in logic and cause stuttering.
* **Are you setting `transform`, `zoom`, or `transform-origin` manually?** Doing so will interfere with the library's functionality and lead to unexpected behavior.
* **Are you setting `overflow`, `position`, `touch-action`, or `cursor` on the container element?** The library will also interact with these CSS properties, so it's best to avoid touching them on the container element.
* **Do you have a `padding` on the container or a `margin` on the target?** If you apply spacing between the container and the target element, only the top and left (RTL-right) spacings will be visible, leading to asymmetrical layouts. Instead, consider doing layout work within the target element or outside the container element.
* Additionally, the following CSS properties will be applied to the target element in order to improve performance:
  * `backface-visibility: hidden`
  * `contain: layout paint`
* All modified styles will be restored upon calling `destroy()`.


## examples

### React

```jsx
import React, { useEffect, useRef } from 'react';
import { attachPinchZoom } from '@nsqx/pinch-zoom';

const ZoomableComponent = () => {
  const elementRef = useRef(null);
  const controllerRef = useRef(null);

  useEffect(() => {
    if (elementRef.current) {
      controllerRef.current = attachPinchZoom(elementRef.current, {
        mode: 'transform',
        min: 0.5,
        max: 3,
        smooth: true,
        onZoom: ({ scale }) => console.log('Current scale:', scale),
      });
    }

    // Important! Remember to call destroy() upon unmount
    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="container" style={{ width: '100%', height: '100%' }}>
      <div ref={elementRef}>
        ...
      </div>
    </div>
  );
};

export default ZoomableComponent;
```

### Vue
```html
<template>
  <div class="container">
    <div ref="zoomTarget">
      ...
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted } from 'vue';
  import { attachPinchZoom } from '@nsqx/pinch-zoom';

  const zoomTarget = ref(null);
  let zoomController = null;

  onMounted(() => {
    if (zoomTarget.value) {
      zoomController = attachPinchZoom(zoomTarget.value, {
        speed: 0.5,
        panMode: ['middle', 'ctrl'],
        onPan: (data) => console.log('Panning:', data),
      });
    }
  });

  // Important! Remember to call destroy() upon unmount
  onUnmounted(() => {
    if (zoomController) {
      zoomController.destroy();
    }
  });
</script>

<style scoped>
  .container {
    width: 100%;
    height: 400px;
  }
</style>
```


## advanced options

### mouse panning

You can assign panning to multiple modifiers. For example, to allow panning with the middle mouse button or holding the `Control` or `Command` keys while dragging,

```js
const controller = attachPinchZoom(target, {
  panMode: ['middle', 'ctrl', 'meta']
});
```

### event listening

You can listen to zoom and pan events by assigning callbacks to the relevant event listener, for example,

```js
attachPinchZoom(target, {
  onZoom: ({ scale, x, y }) => {
    console.log(`Zoomed to: ${scale} at position ${x}, ${y}`);
  },
  onPan: ({ scale, x, y }) => {
    console.log(`Panned to ${x}, ${y}`);
  }
});
```

**Note:**  The pan event only fires when the user uses their mouse to pan the element, set by `panMode`. The pan event also does not apply to mobile or touchscreen surfaces. To monitor all pan events, use a scrollEvent listener on the container instead.


## additional information

### legacy support
```html
<script nomodule src="node_modules/@nsqx/pinch-zoom/dist/index.legacy.js"></script>
<script nomodule>
  // The legacy build exposes API to the window object as 'PinchZoom'
  var el = document.querySelector('.zoom-container');
  var controller = PinchZoom.attachPinchZoom(el, {
    max: 5
  });
</script>
```