# COLORIDO route transitions

Route motion is deliberately implemented around the existing `main` content
container in `App.tsx`. Keep each page's JSX, sections, and layout unchanged.
Navigation continues through the existing `handleNavigate` callback; the route
commits after the first part of the visual transition and a failsafe timer
removes the decorative overlay.

To add a route label or adjust its direction, update `destinationWords` and
`routeOrder` in `App.tsx`. Add major identity routes to
`majorFestivalRoutes` only when they should receive the longer identity pass.
Admin navigation uses its short fade automatically. The overlay is decorative
(`aria-hidden`, `pointer-events: none`) and reduced-motion users receive a brief
fade instead of the light sweep. Public navigation writes a lightweight history
entry; `popstate` uses the same transition and restores direct/deep-link URLs.
Rapid navigation replaces the in-flight overlay. The mobile drawer closes over
the start of route entry instead of leaving an empty frame.

The `FestivalRouteTransition` component and its CSS own all transition visuals;
they do not introduce a routing or animation dependency. `RevealText` and
`Stagger` are opt-in primitives for existing headings and card containers.
Gallery photo open/close uses the browser View Transitions API for a shared
image morph, with the standard lightbox behavior as a fallback. Event details
remain a modal, so they do not use a route transition.
Cursor glow and magnetic movement are limited to fine-pointer, non-reduced-motion,
non-low-power public sessions; mobile keeps the lighter vertical sweep.
