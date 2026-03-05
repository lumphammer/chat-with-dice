# TODO

* [x] Add created rooms to a db
* [x] Room URLs should be nanoids
* [x] Authentication
* [ ] WS endpoint should accept a chatId and confirm either:
  * You're logged in and the chatId matches, or
  * The chatId does not exist in he database.
  * Then pass it onto the DO's fetch method, which will attach it to the socket metadata and use that when creating messages.
  * Client no longer passes chatId with each message.
* [ ] Remove localstorage userid+name on login
* [ ] Admin page
* [ ] "Claim" a room

https://docs.google.com/document/d/

1wowB7ZcNcJPhR79AilN_6Vkx3tpyGND8O8rflP_lnuw

/edit?usp=sharing
