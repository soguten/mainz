## Three navigation modes

Mainz models navigation separately from render.

That gives you **SPA**, **MPA**, and **enhanced-MPA** as distinct runtime behaviors.

## Enhanced-MPA is still document-first

Enhanced-MPA does not turn an app into a SPA.

It keeps browser-native navigation semantics, then layers in practical upgrades like prefetching, scroll restoration, and progressive transitions where supported.

## The app bootstrap stays small

Because navigation mode comes from build context, the app bootstrap should not need to parse URLs or decide runtime strategy manually.
