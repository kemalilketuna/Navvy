/**
 * At-rest obfuscation for locally-stored secrets (API keys, masking values).
 *
 * A random AES-GCM key is generated once and kept as a non-extractable
 * {@link CryptoKey} in IndexedDB. Non-extractable means even code running in the
 * extension can only use it to encrypt/decrypt — the raw key bytes never appear
 * anywhere on disk. This defeats casual inspection of `chrome.storage.local`
 * (plaintext-on-disk, profile backups, sync leaks). It does NOT protect against
 * an attacker who can execute code in the extension context; that is impossible
 * to defend against in a fully client-side bundle and is out of scope here.
 *
 * Ciphertext is tagged with {@link PREFIX} so {@link decryptString} can pass any
 * legacy plaintext through untouched — making migration transparent.
 */
import { openDB } from 'idb'

const KEY_DB = 'page-agent-keys'
const KEY_STORE = 'keys'
const KEY_ID = 'config-aes-gcm'
const PREFIX = 'enc:v1:'
const IV_BYTES = 12

let keyPromise: Promise<CryptoKey> | null = null

async function getKey(): Promise<CryptoKey> {
	if (!keyPromise) keyPromise = loadOrCreateKey()
	return keyPromise
}

async function loadOrCreateKey(): Promise<CryptoKey> {
	const db = await openDB(KEY_DB, 1, {
		upgrade(database) {
			database.createObjectStore(KEY_STORE)
		},
	})
	const existing = (await db.get(KEY_STORE, KEY_ID)) as CryptoKey | undefined
	if (existing) return existing
	const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
		'encrypt',
		'decrypt',
	])
	await db.put(KEY_STORE, key, KEY_ID)
	return key
}

function toBase64(bytes: Uint8Array): string {
	let bin = ''
	for (const b of bytes) bin += String.fromCharCode(b)
	return btoa(bin)
}

function fromBase64(b64: string): Uint8Array {
	const bin = atob(b64)
	const out = new Uint8Array(bin.length)
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
	return out
}

/** True for values produced by {@link encryptString}. */
export function isEncrypted(value: unknown): value is string {
	return typeof value === 'string' && value.startsWith(PREFIX)
}

export async function encryptString(plain: string): Promise<string> {
	const key = await getKey()
	const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
	const ct = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(plain)
	)
	const packed = new Uint8Array(iv.length + ct.byteLength)
	packed.set(iv, 0)
	packed.set(new Uint8Array(ct), iv.length)
	return PREFIX + toBase64(packed)
}

/**
 * Decrypt a value produced by {@link encryptString}. Legacy plaintext (no
 * {@link PREFIX}) is returned unchanged. Throws if ciphertext can't be decrypted
 * (e.g. the IndexedDB key was wiped independently of `chrome.storage.local`);
 * callers decide how to degrade.
 */
export async function decryptString(payload: string): Promise<string> {
	if (!isEncrypted(payload)) return payload
	const key = await getKey()
	const packed = fromBase64(payload.slice(PREFIX.length))
	const iv = packed.slice(0, IV_BYTES)
	const ct = packed.slice(IV_BYTES)
	const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
	return new TextDecoder().decode(plain)
}
