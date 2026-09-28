/*
|--------------------------------------------------------------------------
| Password Reset Tokens
|--------------------------------------------------------------------------
| The secret that a reset link carries, and the fingerprint of it that the
| database keeps.
|
| The two are deliberately not the same value. What is stored is a SHA-256 of
| the token, never the token itself, so reading the employee record tells you
| nothing you could put in a link. That matters more here than it would in
| most apps: the account node is read by anybody who can reach the database,
| so a raw token sitting in it would be a reset link published to the world.
|
| `crypto.getRandomValues` and not `Math.random`: the latter is seeded from
| the clock and is predictable to anybody who knows roughly when the reset was
| asked for, which is precisely the person who asked for it.
|--------------------------------------------------------------------------
*/

/*
| The token alphabet. URL safe and case sensitive, because this value is only
| ever clicked, never read aloud or typed - so unlike a temporary password
| there is nothing to gain by dropping the characters that look alike.
*/
const ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/*
| 32 characters out of a 62 character alphabet is about 190 bits. Far past
| the point where guessing is worth discussing, and still short enough that
| the link survives an email client deciding where to wrap it.
*/
const TOKEN_LENGTH = 32;

/* How long a link stays good for. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/*
| An index into the alphabet with no modulo bias. `byte % 62` would make the
| first eight characters slightly likelier than the rest; drawing again on the
| uneven tail of the byte range costs nothing and removes the question.
*/
const randomIndex = (length) => {

    const limit = Math.floor(256 / length) * length;

    const buffer = new Uint8Array(1);

    let value = limit;

    while (value >= limit) {
        crypto.getRandomValues(buffer);
        value = buffer[0];
    }

    return value % length;

};

export const generateResetToken = () => {

    let token = "";

    for (let index = 0; index < TOKEN_LENGTH; index += 1) {
        token += ALPHABET[randomIndex(ALPHABET.length)];
    }

    return token;

};

/*
| The stored form. Async because `crypto.subtle` is, and it is used rather
| than a hand written hash so the digest is the browser's own implementation.
|
| It needs a secure context - https, or localhost while developing. Every
| screen that calls this is already served over one, and a page that was not
| could not be trusted with a password anyway.
*/
export const hashResetToken = async (token) => {

    const bytes = new TextEncoder().encode(String(token ?? ""));

    const digest = await crypto.subtle.digest("SHA-256", bytes);

    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

};

/*
| Comparing a token from a link against the stored hash.
|
| Both sides are hashes by the time they meet, so this is not comparing
| secrets and a plain `===` is honest here: a timing difference would leak
| something about a digest the attacker is holding anyway, not about the
| token they are trying to find.
*/
export const matchesResetToken = async (token, storedHash) => {

    if (!token || !storedHash) return false;

    return (await hashResetToken(token)) === storedHash;

};
