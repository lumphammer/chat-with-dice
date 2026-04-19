# TODO

## Capabilities

- [x] Framework for defining capabilities, including config, state, and actions
- [x] Mechanisms for sending that to clients at the right moments
- [x] Client side is aggregating all state in an untyped way
- [x] put chat area in a max-width container
- [x] add a sidebar which opens to the side in desktop, or overlaying on mobile
- [x] in sidebar, check or load room config and render a default UI per capability type
- [x] probably add something to CapabilityDef to handle getting state from central store, validating it, making it available
- [x] each component can then use that to get state and display magic on screen
- [x] finally, close the circle by being able to dispatch the actions we have on the capability
- [x] ability to "mount" a capability client-side

## Small Items

- [x] Mobile layout
- [x] Help tab
- [ ] Nanostores for room name, display name, etc.
- [ ] limit connections per room (100?)
- [ ] Swipable sidebar on mobile
- [ ] Easier feedback channels (built-in?)

## Big items

- [x] Mission statement
- [x] Basic room admin (owner only)
  - [x] Rename
  - [x] Delete
  - [x] Manage capabilities
- [x] Roll Types to capabilities
- [x] Split chat form / UX work
- [x] System admin
  - [x] Admin users
  - [x] List rooms
- [x] CI / CD
- [ ] "Currently online" / "All visitors" view
- [x] Roles/permissions

## New features

- [ ] File uploads
- [ ] Collaborative documents
- [ ] Whiteboards
- [ ] Room-level roles (e.g. appoint extra admins)
- [ ] Private rooms
