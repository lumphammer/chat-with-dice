# TODO

Capability system is mostly there on the server side. What's done so far:

* Framework for defining capabilities, including config, state, and actions
* Mechanisms for sending that to clients at the right moments
* Client side is aggregating all state in an untyped way

We may may want to add more tools for initialisers and message handlers, but the next step is the UI.

* [ ] put chat area in a max-width container
* [ ] add a sidebar which opens to the side in desktop, or overlaying on mobile
* [ ] in sidebar, check or load room config and render a default UI per capability type
* [ ] probably add something to CapabilityDef to handle getting state from central store, validating it, making it available
* [ ] each component can then use that to get state and display magic on screen
* [ ] finally, close the circle by being able to dispatch the actions we have on the capability

Do we want an equivalent of `mount(...)` for the client side? `useMountCapability(...): ({state, actions}) `?
