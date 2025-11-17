# Saint-PD 

## Install
- Put Script in resources and start it.
- Make sure default chat is running (for jail messages).
- Edit `config.lua`.

## Use
- Go to a configured PC and press the key (default E) or use the test command if enabled.
- Evidence app: fill details, items, attachments, submit.
- Booking app: enter suspect details, add charges, review, submit.
- Viewers: browse cards, click for details.

## Files
- UI: `pd_pc/web/*`
- Client: `pd_pc/client.lua`
- Server: `pd_pc/server.lua`
- Data: `data/evidence.json`, `data/bookings.json`

## Webhook
`Config.WebhookUrl` must be set. Each submit sends two embeds (fields + description/notes).

## config.lua 
- `OpenKey`: help text key label.
- `UseCommandForTesting`, `TestCommand`: open via chat command.
- `PCs`: list of PC locations.
- `JailInside`, `JailRelease`: prison in/out coords.
- `ComputeJailFromCharges`: sum times from charges.
- `JailMaxSeconds`: server cap (default 300).
- `JailScale`: UI time scale.
- `WebhookUrl`: Discord URL.
- `CasePrefix`: auto case prefix.
- `JSON.EvidencePath`, `JSON.BookingsPath`, `JSON.RotateAfter`.
