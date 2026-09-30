/**
 * Nova Scan — offline breach screening for the Key Ring.
 *
 * Screens sealed secrets against an embedded corpus of the internet's most
 * infamously breached passwords (RockYou / HIBP top-list vintage). The corpus
 * is hashed with SHA-1 at boot so plaintext common passwords never sit in
 * memory as literals next to comparisons. Fully offline — no k-anonymity
 * network call, nothing leaves the vault, CSP-pure.
 */

import type { PasswordRecord } from '../types';

const COMMON_PASSWORDS: readonly string[] = [
  '123456', 'password', '123456789', '12345678', '12345', 'qwerty', '111111', '1234567',
  'iloveyou', 'admin', 'welcome', 'monkey', 'login', 'abc123', 'dragon', 'passw0rd',
  'master', 'hello', 'freedom', 'whatever', 'qazwsx', 'trustno1', 'batman', 'pass',
  'letmein', 'football', 'baseball', 'starwars', 'michael', 'shadow', 'superman',
  'michael1', 'soccer', 'hannah', 'jennifer', 'jordan', 'harley', 'ranger',
  'hunter', 'buster', 'soccer1', 'andrew', 'tigger', 'sunshine', 'purple',
  'angel', 'bimmer', 'pepper', 'hunter2', 'soccer12', 'charlie', 'thomas',
  'robert', 'access', 'love', 'summer', 'ashley', 'bailey', 'passwrd',
  'shadow1', 'joshua', 'maggie', 'brandon', 'chelsea', 'matthew', 'andrea',
  'jordan23', 'nicole', 'taylor', 'daniel', 'gandalf', 'silence', '101010',
  'blahblah', 'cookie', 'computer', 'master1', 'jenny', 'carlos', '.gateway',
  'snoopy1', 'william', 'rangers', 'dallas', 'yankees', 'mustang', 'secret',
  'sexy', 'slipknot', 'pokemon', 'mitchel', 'matrix', 'silver', 'willow',
  'leather', 'chicken', 'mercedes', 'liverpool', 'Arsenal', 'Chelsea1',
  'barcelona', 'realmadrid', 'juventus', 'manchester', 'walter', 'biteme',
  'winter', 'private', 'yellow', 'nemesis', 'corvette', 'zxcvbnm', 'asdfgh',
  'qwertyuiop', '1q2w3e4r', '1qaz2wsx', 'qwe123', '123123', '121212', '654321',
  '666666', '888888', '159753', 'ninja', 'azerty', 'solo', 'test', 'test123',
  'guest', 'root', 'toor', 'changeme', 'default', 'password1', 'password12',
  'password123', 'p@ssw0rd', 'p@ssword', 'passwd', 'pwd123', 'secret123',
  'letmein1', 'welcome1', 'welcome123', 'admin123', 'admin1234', 'administrator',
  'root123', 'qwertz', 'thunder', 'cougar', 'falcon', 'hawkeye', 'marina',
  'cherry', 'phoenix', 'casper', 'stella', 'scooter', 'peanut', 'jasmine',
  'aurora', 'sunset', 'rainbow', 'butterfly', 'unicorn', 'princess', 'diamond',
  'golden', 'silver1', 'platinum', 'hammer', 'fishing', 'golfer', 'runner',
  'walker', 'player', 'fighter', 'winner', 'loser', 'poker', 'casino',
  'google', 'facebook', 'twitter', 'linkedin', 'amazon', 'netflix', 'spotify',
  'apple', 'samsung', 'nokia', 'android', 'iphone', 'youtube', 'gmail',
  'myspace', 'hotmail', 'yahoo', 'outlook', 'minecraft', 'fortnite',
  'roblox', 'league', 'steam', 'xbox', 'playstation', 'nintendo', 'switch',
  'canvas', 'student', 'college', 'school', 'teacher', 'classroom', 'homework',
  'january', 'february', 'march', 'april', 'june', 'july', 'august',
  'september', 'october', 'november', 'december', 'monday', 'friday',
  'sunday', 'weekend', 'holiday', 'vacation', 'birthday', 'anniversary',
  'lovely', 'lover', 'lovers', 'kissing', 'hottie', 'beautiful', 'gorgeous',
  'prince', 'queen', 'king', 'emperor', 'warrior', 'samurai', 'ninja1',
  'pirate', 'viking', 'knight', 'wizard', 'merlin', 'gandalf1', 'frodo',
  'legolas', 'aragorn', 'spiderman', 'ironman', 'captain', 'avengers',
  'wolverine', 'hulk', 'thor', 'loki', 'blackpanther', 'deadpool', 'venom',
  'qwerty123', '1q2w3e', 'zaq12wsx', '1234qwer', 'q1w2e3r4', 'abcd1234',
  'a1b2c3', 'asd123', 'zxc123', 'pass123', 'pass1234', 'secret1', 'secrets',
  'flower', 'garden', 'forest', 'river', 'ocean', 'mountain', 'desert',
  'jungle', 'island', 'beach', 'wave', 'storm', 'cloud', 'skywalker',
  'brazil', 'russia', 'china', 'japan', 'india', 'canada', 'mexico',
  'germany', 'france', 'england', 'ireland', 'scotland', 'australia',
  'london', 'paris', 'berlin', 'tokyo', 'madrid', 'lisbon', 'rome',
  'milan', 'napoli', 'bari', 'palermo', 'torino', 'genova', 'venice',
  'juve', 'roma', 'lazio', 'fiorentina', 'atalanta', 'napoli1', 'soccer18',
  'tiger', 'lion', 'bear', 'wolf', 'fox', 'eagle', 'shark', 'whale',
  'dolphin', 'penguin', 'panda', 'koala', 'tiger1', 'lionking', 'junglebook',
  'pizza', 'burger', 'hotdog', 'candy', 'chocolate', 'vanilla', 'strawberry',
  'banana', 'apple1', 'orange', 'grape', 'lemon', 'cherry1', 'peach',
  'coffee', 'tea123', 'sugar', 'spice', 'salt123', 'pepper1', 'honey',
  'music', 'guitar', 'piano', 'drums', 'violin', 'singer', 'dancer',
  'movie', 'cinema', 'theatre', 'actor', 'model', 'photo', 'camera',
  'lol123', 'haha', 'hehe', 'omg123', 'wtf123', 'idontknow', 'none',
  'nothing', 'unknown', 'anonymouse', 'nonsense', 'whatever1', 'blah',
  'xxyyzz', 'aabbcc', 'aaabbb', 'asdf', 'asdfas', 'qwerqwer', 'zxczxc',
  '147258369', '987654321', '102030', '112233', '121314', '123321', '123abc',
  'abc12345', 'abcd123', 'qazxsw', 'edc123', '3edc4rfv', '1qazxsw2',
  'pokemon1', 'pikachu', 'charizard', 'bulbasaur', 'squirtle', 'ashketchum',
  'pussy', 'pussy1', 'dick', 'cock', 'fuck', 'fucker', 'fucking', 'bitch',
  'asshole', 'bastard', 'slut', 'xxx', 'porn', 'sex', 'sexy1', 'naked',
];

let corpusHashes: Promise<Set<string>> | null = null;

async function sha1Hex(s: string): Promise<string> {
  const dig = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Lazily hash the corpus once per session. */
function getCorpus(): Promise<Set<string>> {
  corpusHashes ??= (async () => {
    const entries = await Promise.all(COMMON_PASSWORDS.map((p) => sha1Hex(p.toLowerCase())));
    return new Set(entries);
  })();
  return corpusHashes;
}

export interface NovaVerdict {
  secret: string;
  nova: boolean;
}

/** True when the secret matches the compromised corpus. (R85: module-private —
    novaScan is the only caller, and its inline duplicate of this exact check
    is gone; the keyring's local `isNova` shadow that hid this function from
    every usage scan is renamed `isBreached`.) */
async function isNova(secret: string): Promise<boolean> {
  if (!secret) return false;
  const corpus = await getCorpus();
  return corpus.has(await sha1Hex(secret.toLowerCase()));
}

export interface NovaScanResult {
  records: PasswordRecord[];       /* updated copies — breachedAt stamped  */
  novae: PasswordRecord[];         /* newly discovered compromised items  */
  cleared: number;                 /* items whose earlier nova flag lifted */
}

/** Scan a whole ring; stamps `breachedAt` on hits, clears stale flags. */
export async function novaScan(records: PasswordRecord[]): Promise<NovaScanResult> {
  const novae: PasswordRecord[] = [];
  let cleared = 0;
  const now = Date.now();
  const updated = await Promise.all(records.map(async (r) => {
    const hit = await isNova(r.secret);
    if (hit && !r.breachedAt) {
      const stamped = { ...r, breachedAt: now };
      novae.push(stamped);
      return stamped;
    }
    if (!hit && r.breachedAt) { cleared++; const { breachedAt: _drop, ...rest } = r; return rest as PasswordRecord; }
    return r;
  }));
  return { records: updated, novae, cleared };
}

export const CORPUS_SIZE = COMMON_PASSWORDS.length;
