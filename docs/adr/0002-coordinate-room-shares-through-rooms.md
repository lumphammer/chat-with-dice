# Coordinate room shares through rooms

Sharing a file or folder into a room is a room command coordinated by the ChatRoom Durable Object, while the owner user's UserData Durable Object remains authoritative for creating, removing, and dereferencing the Room Share. This keeps room authorization, chat message sequencing, and room-local share cache updates on the room side, while keeping file ownership and share grant validation in the user's file store; future private-room membership checks can tighten the room side without teaching UserData Durable Objects about room policy.
