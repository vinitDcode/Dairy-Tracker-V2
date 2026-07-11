---
    name: mobile img native-drag glitch
    description: tapping a small clickable <img> (e.g. avatar button) on Chrome/Android can trigger a native drag-ghost overlay that looks like a UI glitch
    ---

    Any `<img>` inside a tappable control (avatar buttons, small icon photos) is
    draggable by default in browsers. On touchscreens a tap almost always
    includes a tiny bit of finger movement, which Chrome/Android can interpret
    as starting a native image drag. The browser then renders a raw,
    full-resolution "drag ghost" of that image completely outside the page's
    own layout and CSS — it looks like an unstyled, floating, white-bordered
    copy of the photo overlapping the UI, and it stays on screen until the
    drag/touch gesture ends.

    **Why:** Discovered in the Bhullar Dairy Farm dashboard (artifacts/file-viewer) —
    user reported the profile-photo dropdown button "glitching" the whole page
    after Google login. Looked like an app bug (image sizing, z-index, even a
    suspected native OS account-picker overlay) but the app's own bundle had
    only 3 correctly-sized `<img>` tags; the actual cause was the browser's
    default drag affordance on `<img>`.

    **How to apply:** If a user reports a photo/avatar "briefly blowing up" or
    "floating unstyled" specifically when tapping/pressing it (not on generic
    page load), suspect native image-drag before chasing CSS/layout theories.
    Fix with CSS on all `img` (or the specific avatar): `-webkit-user-drag: none;
    user-drag: none; -webkit-touch-callout: none;`. No JS or HTML attribute
    change needed if you can only ship a CSS override layer.
    