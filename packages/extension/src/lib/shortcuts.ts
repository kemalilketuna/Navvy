/**
 * Keyboard shortcuts handled in-app via JS listeners (side panel + content
 * script) rather than Chrome `commands`, so they can be single keys.
 *
 * Chrome's command system requires a Ctrl/Alt/Cmd modifier and rejects bare
 * keys like Escape, so single-key shortcuts must be wired by hand.
 */

/** Physical key (KeyboardEvent.code) held to talk: ` above Tab. */
export const PTT_KEY_CODE = 'Backquote'

/** Key (KeyboardEvent.key) that cancels a running task. */
export const CANCEL_KEY = 'Escape'
