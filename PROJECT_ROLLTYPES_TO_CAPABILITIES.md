# Turning "Roll Types" into capabilities

The first iteration of pluggable funcionality in this project was "roll types". Each one had a "formula validator", a "results validator", a function which took a formula and spat out some results, an input UI, and a display UI.

We then added capabilities, which are a powerful, typed way to run a reducer over websockets. An easy addition to this was to allow more functionality on the server side, such as modifying messages (and in future, stored files, shared notes etc.)

As a stress-test of the rollType system, I implemented the "Honk D6" system from "There but for the Geese of God", which involves multi-stage rolls which can be handed off from one player to another. My main finding was that I was effectively creating another miniature typed-actions system right inside the handler function, plus effectively creating a long-lived state by passing it from roll to roll. In other words, it was something that could have been handled better by a capability. This would have UX advantages, because players would be able to see at a glance all the "schemes" currently in play, in the sidebar.

After briefly considering some bridge between capabilities and roll types, I think I'm coming to the understanding that roll types don't need to exist. There's no such thing. What we need is a way for capabilities to create messages.

Then, capabilities can advertise an inputUI and displayUI in the capability registry. The chat bar just loads whatever capabilities are configured which advertise an inputUI (lots won't.)

The next thought is: I've been struggling to come up with a pleasant UX for rolls on mobile. As soon as there's more than one or two inputs, they start stacking up crazily and hogging screen space. And they're fiddly. The usual rule for UIs in tight spaces is modality, not cramming. So question: Should the roll UI actually live in the sidebar? 

On desktop this could feel very natural - instead of a double-duty form at the foot of the page, you have "chat" in the usual place, and "rolls" in the sidebar. This would also work well when you have systems like Honk D6 which is a much more natural fit for stateful, sidebar-based interactions after the initial roll anyway. Having the rolling *start* there would be great. Not to mention that I've been unsure of the UX merit of having interactive chat bubbles as we do in the current Honk D6 implementation (what happens if someone adds chat when you're in the middle of typing or clicking?)

On mobile, this gives us a much more comfortable way to present the UI rather than cramming it in with the chat.

A plan of attack might look like:

* [ ] Ditch the roll form
* [ ] Changes to the capability system:
  * [ ] Multiple sidebar elements
  * [ ] Roll result validator
  * [ ] Roll display UI
  * [ ] Effectful functions are given some typed helpers to publish and modify messages
  * [ ] Message display is based on capability name
* [ ]  Ditch the whole roll types system
