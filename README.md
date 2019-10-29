# AMQ-local-client
Local client for Anime Music Quiz that supports Discord rich presence

## Will I get into trouble if I use this client?
This client is nothing more than an embedded web browser that also communicates with your local Discord client.
AMQ vise, it doesn't give you any advantages. No new functionality nor new features are added, and will never be added.

If your are instead concerned about this client being a virus, know that [it isn't.](https://www.virustotal.com/gui/file/09499147fbea227f337baaa31bcfd97085070028d7a48d8deeb88f4905d873c9/detection)

## Download
You can download the client [from here](https://anime-alice.moe/AMQ.local.beta.zip). It's portable so you can place the .exe where ever.

## Build insturctions
These instructions are very much YMMV. You probably need .net 4.5.2 or something to build the .dll
* Clone or download the repository
* Download and exctract Discord game-SDK [from here](https://discordapp.com/developers/docs/game-sdk/sdk-starter-guide)
* place the ``csharp`` folder from the game-SDK into ``AnimeMusicQuiz`` folder
* place the 64 bit windows .dll found at ``lib/x86_64/discord_game_sdk.dll`` into root folder
* build the .net project in ``AnimeMusicQuiz`` folder. Place the resulting ``AnimeMusicQuiz.dll`` file into root folder
* download node modules (using ``yarn install``)
* build the executable (using ``yarn dist``)
