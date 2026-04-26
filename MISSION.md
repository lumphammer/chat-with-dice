# Chat with Dice: Mission Statement

## The Mission

Produce a lightweight, cheap, easy-to-use tool for people playing low-prep/no-prep TTRPGs online.

## Discussion

Technically this will be in the "VTT" space, but taking a fundamentally different approach. This is a handy structured notepad for jotting down the stuff you need in-play. Unlike a traditional VTT, I'm not trying to produce a virtual tabletop with the map and tokens front and center. We will in due course have something like a whiteboard, but it will put drawing tools first, not the map. It doesn't expect you to have a 4K battlemap and art assets - you can just dive in with no prep and scribble on the whiteboard as you go.

## Values

All values are presented in a "X over Y" format; that is: while Y may be important or valid, we are putting X ahead of it.

### Fast, obvious, intuitive over rich, detailed, automated

Some VTTs are extremely deep, and require learning through poring over docs, trial and error, and word-of-mouth on a Discord server. The idea with Chat with Dice is that it is immediately obvious how stuff works. The room owner/GM may have to do a teensy bit more work than the players, but it should never feel overwhelming or like you need to give up and do a load of training after the game.

Trade-off: we're never going to have the levels of automation and richness that some VTTs offer.

### Device-agnostic over desktop-first

Mobile devices (even phones) are first-class citizens, although we acknowledge that desktop will be an easier experience for some times of interaction (mainly those requiring lots of screen real-estate.)

This means no interactions that require hovers, no tiny buttons, no interactions that require long drags.

Trade-off: it's going to be slower to develop some features.

### Accessibility over aesthetics

When developing, pay attention to the accessibility tree in the browser dev tools. Use Ark UI components where feasible. Think about text contrast. Treat accessibility problems as bugs, not nice-to-haves. Avoid semitransparent elements except as a way to dim elements.

Trade-off: some highly aesthetic UIs just aren't accessible.
