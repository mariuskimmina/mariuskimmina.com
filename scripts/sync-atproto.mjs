import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HANDLE = 'mariuskimmina.com';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'src/data/atproto.json');
const SOFT = process.argv.includes('--soft');
const WATCH = process.argv.includes('--watch');
const WATCH_INTERVAL_MS = 60_000;
const COLLECTIONS = [
  'app.bsky.feed.post',
  'app.bsky.feed.repost',
  'app.offprint.document.article',
  'app.skyreader.social.share',
  'app.standard-reader.read',
  'buzz.bookhive.book',
  'id.sifa.profile.education',
  'id.sifa.profile.externalAccount',
  'id.sifa.profile.language',
  'id.sifa.profile.location',
  'id.sifa.profile.position',
  'id.sifa.profile.presentation',
  'id.sifa.profile.presentationDelivery',
  'id.sifa.profile.project',
  'id.sifa.profile.self',
  'id.sifa.profile.skill',
  'io.kosakata.card',
  'io.kosakata.deck',
  'io.kosakata.session',
  'network.cosmik.card',
  'pub.leaflet.document',
  'pub.leaflet.publication',
  'sh.tangled.repo',
  'site.standard.document',
  'site.standard.publication',
  'so.sprk.feed.post',
];

const BLOG_PUBLICATION_RKEY = '3mad52e7wpk24';

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function listRecords(pds, did, collection) {
  let cursor;
  const records = [];
  do {
    const url = new URL('/xrpc/com.atproto.repo.listRecords', pds);
    url.searchParams.set('repo', did);
    url.searchParams.set('collection', collection);
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);
    const page = await getJson(url);
    records.push(...(page.records || []));
    cursor = page.cursor;
  } while (cursor && records.length < 500);
  return records;
}

function rkey(uri) {
  return uri.split('/').at(-1);
}

function firstDate(value) {
  return value.date || value.createdAt || value.publishedAt || value.startedAt || value.finishedAt || value.updatedAt || null;
}

function cleanText(input = '') {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function richTextSegments(plaintext = '', facets = []) {
  const source = Buffer.from(plaintext, 'utf8');
  const sorted = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);
  const segments = [];
  let cursor = 0;

  for (const facet of sorted) {
    const start = Math.max(cursor, facet.index.byteStart);
    const end = Math.max(start, facet.index.byteEnd);
    if (start > cursor) segments.push({ text: source.subarray(cursor, start).toString('utf8') });
    const text = source.subarray(start, end).toString('utf8');
    const feature = facet.features?.[0];
    if (feature?.$type?.endsWith('#link')) segments.push({ text, type: 'link', url: feature.uri });
    else if (feature?.$type?.endsWith('#didMention')) segments.push({ text, type: 'mention', url: `https://bsky.app/profile/${feature.did}` });
    else if (feature?.$type?.endsWith('#code')) segments.push({ text, type: 'code' });
    else if (feature?.$type?.endsWith('#bold')) segments.push({ text, type: 'bold' });
    else if (feature?.$type?.endsWith('#italic')) segments.push({ text, type: 'italic' });
    else segments.push({ text });
    cursor = end;
  }

  if (cursor < source.length) segments.push({ text: source.subarray(cursor).toString('utf8') });
  return segments.length ? segments : [{ text: plaintext }];
}

function normalizeListItem(item) {
  return {
    segments: richTextSegments(item.content?.plaintext || '', item.content?.facets || []),
    children: (item.children || []).map(normalizeListItem),
  };
}

function normalizeLeafletBlock(block, pds, did) {
  const type = block?.$type?.split('.').at(-1);
  if (type === 'text') return { type, segments: richTextSegments(block.plaintext || '', block.facets || []) };
  if (type === 'code') return { type, text: block.plaintext || '', language: block.language || '' };
  if (type === 'image') {
    const cid = block.image?.ref?.$link;
    return {
      type,
      src: cid ? `${pds}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}` : null,
      aspectRatio: block.aspectRatio || null,
    };
  }
  if (type === 'unorderedList') return { type: 'list', items: (block.children || []).map(normalizeListItem) };
  if (type === 'bskyPost') {
    const uri = block.postRef?.uri;
    return { type: 'bsky', uri, url: uri ? `https://bsky.app/profile/${HANDLE}/post/${rkey(uri)}` : null };
  }
  return { type: 'unknown' };
}

function activityLabel(collection, value) {
  if (collection === 'app.bsky.feed.post') return value.reply ? 'Replied on Bluesky' : 'Posted on Bluesky';
  if (collection === 'pub.leaflet.document') return `Published “${value.title || 'a Leaflet'}”`;
  if (collection === 'site.standard.document') return `Published “${value.title || 'an article'}”`;
  if (collection === 'buzz.bookhive.book') return `Added “${value.title || 'a book'}” on BookHive`;
  if (collection === 'io.kosakata.session') return 'Studied a language on Kosakata';
  if (collection === 'io.kosakata.card') return 'Added a language-learning card';
  if (collection === 'network.cosmik.card') return `Saved “${value.content?.metadata?.title || 'a link'}”`;
  if (collection === 'sh.tangled.repo') return `Created ${value.name || 'a repository'} on Tangled`;
  if (collection === 'so.sprk.feed.post') return 'Shared a photo on Spark';
  if (collection === 'app.skyreader.social.share') return `Shared “${value.itemTitle || 'an article'}”`;
  if (collection.startsWith('id.sifa.')) return 'Updated the Sifa profile';
  return collection;
}

function appName(collection, value, standardPublications = new Map()) {
  if (collection.startsWith('app.bsky.')) return 'Bluesky';
  if (collection.startsWith('pub.leaflet.')) return 'Leaflet';
  if (collection.startsWith('buzz.bookhive.')) return 'BookHive';
  if (collection.startsWith('id.sifa.')) return 'Sifa';
  if (collection.startsWith('io.kosakata.') || collection.startsWith('app.kosakata.')) return 'Kosakata';
  if (collection.startsWith('sh.tangled.')) return 'Tangled';
  if (collection.startsWith('network.cosmik.')) return 'Cosmik';
  if (collection.startsWith('so.sprk.')) return 'Spark';
  if (collection.startsWith('app.skyreader.')) return 'Skyreader';
  if (collection.startsWith('app.standard-reader.')) return 'Standard';
  if (collection.startsWith('app.offprint.')) return 'Offprint';
  if (collection === 'site.standard.document') {
    const publication = standardPublications.get(value.site);
    const url = publication?.url || '';
    if (url.includes('leaflet.pub')) return 'Leaflet';
    if (url.includes('offprint.app')) return 'Offprint';
    if (url.includes('skyreader.app')) return 'Skyreader';
    return 'Standard';
  }
  return 'ATProto';
}

function activityUrl(collection, value, uri) {
  const key = rkey(uri);
  if (collection === 'app.bsky.feed.post') return `https://bsky.app/profile/${HANDLE}/post/${key}`;
  if (collection === 'pub.leaflet.document') return `/writing/${key}/`;
  if (collection === 'site.standard.document' && value.site?.endsWith(`/${BLOG_PUBLICATION_RKEY}`)) return `/writing/${key}/`;
  if (collection === 'buzz.bookhive.book' && value.hiveId) return `https://bookhive.buzz/book/${value.hiveId}`;
  if (collection.startsWith('id.sifa.')) return `https://sifa.id/p/${HANDLE}`;
  if (collection.startsWith('io.kosakata.')) return 'https://kosakata-production.up.railway.app/';
  if (collection === 'network.cosmik.card') return value.content?.url;
  if (collection === 'sh.tangled.repo') return `https://tangled.org/${HANDLE}/${value.name}`;
  if (collection === 'app.skyreader.social.share') return value.itemUrl;
  return `https://pdsls.dev/at/${encodeURIComponent(uri)}`;
}

async function sync() {
  const identity = await getJson(`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${HANDLE}`);
  const didDoc = await getJson(`https://plc.directory/${identity.did}`);
  const pds = didDoc.service.find((service) => service.type === 'AtprotoPersonalDataServer')?.serviceEndpoint;
  if (!pds) throw new Error('No PDS service found in DID document');

  const entries = await Promise.all(COLLECTIONS.map(async (collection) => [collection, await listRecords(pds, identity.did, collection)]));
  const records = Object.fromEntries(entries);
  const publications = new Map((records['pub.leaflet.publication'] || []).map((record) => [record.uri, record.value]));
  const standardPublications = new Map((records['site.standard.publication'] || []).map((record) => [record.uri, record.value]));

  for (const record of records['pub.leaflet.document'] || []) {
    const publication = publications.get(record.value.publication);
    record.value.__leafletUrl = publication?.base_path ? `https://${publication.base_path}/${rkey(record.uri)}` : `https://leaflet.pub/${rkey(record.uri)}`;
  }

  const blogPublicationUri = `at://${identity.did}/site.standard.publication/${BLOG_PUBLICATION_RKEY}`;
  const blogPublication = standardPublications.get(blogPublicationUri);
  const writing = (records['site.standard.document'] || []).filter(({ value }) => value.site === blogPublicationUri).map(({ uri, value }) => {
    const slug = rkey(uri);
    return {
      uri,
      slug,
      title: value.title,
      description: value.description || cleanText(value.pages?.[0]?.blocks?.[0]?.block?.plaintext || ''),
      publishedAt: value.publishedAt,
      tags: value.tags || [],
      source: 'Leaflet',
      url: `/writing/${slug}/`,
      originalUrl: `${blogPublication?.url || 'https://mariuskimmina.leaflet.pub'}${value.path || `/${slug}`}`,
      blocks: (value.content?.pages || []).flatMap((page) => (page.blocks || []).map(({ block }) => normalizeLeafletBlock(block, pds, identity.did))),
    };
  }).filter((item) => item.publishedAt).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const books = (records['buzz.bookhive.book'] || []).map(({ uri, value }) => ({
    uri,
    title: value.title,
    authors: value.authors,
    stars: value.stars,
    status: value.status,
    createdAt: value.createdAt,
    finishedAt: value.finishedAt,
    url: value.hiveId ? `https://bookhive.buzz/book/${value.hiveId}` : 'https://bookhive.buzz/',
    cover: value.cover?.ref?.$link ? `${pds}/xrpc/com.atproto.sync.getBlob?did=${identity.did}&cid=${value.cover.ref.$link}` : null,
  })).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const kosakataDecks = (records['io.kosakata.deck'] || []).map(({ uri, value }) => ({
    uri,
    name: value.name || 'Untitled deck',
    language: value.language || value.sourceLangs?.join(', ') || value.targetLanguage || value.sourceLanguage || 'Unknown',
    sourceLanguages: value.sourceLangs || (value.sourceLanguage ? [value.sourceLanguage] : []),
    targetLanguages: value.targetLangs || (value.targetLanguage ? [value.targetLanguage] : []),
    difficulty: value.difficulty || null,
    listed: value.listed ?? null,
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || value.createdAt || null,
  }));
  const kosakataDeckByUri = new Map(kosakataDecks.map((deck) => [deck.uri, deck]));
  const kosakataCards = (records['io.kosakata.card'] || []).map(({ uri, value }) => {
    const fields = value.fields || [];
    const prompt = fields.find((field) => field.role === 'prompt') || fields[0];
    const answer = fields.find((field) => field.role === 'answer') || fields[1];
    const hint = fields.find((field) => field.role === 'hint');
    return {
      uri,
      deckUri: value.deckUri || null,
      deckName: kosakataDeckByUri.get(value.deckUri)?.name || 'Shared deck',
      prompt: prompt?.text || '',
      answer: answer?.text || '',
      hint: hint?.text || '',
      language: prompt?.lang || kosakataDeckByUri.get(value.deckUri)?.language || null,
      createdAt: value.createdAt || null,
      updatedAt: value.updatedAt || value.createdAt || null,
    };
  }).filter((card) => card.prompt || card.answer).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const kosakataSessions = (records['io.kosakata.session'] || []).map(({ uri, value }) => ({
    uri,
    deckUri: value.deckUri || null,
    deckName: kosakataDeckByUri.get(value.deckUri)?.name || 'Shared deck',
    startedAt: value.startedAt || null,
    endedAt: value.endedAt || null,
    activeSeconds: value.activeSeconds || 0,
  })).filter((session) => session.startedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const kosakata = {
    decks: kosakataDecks.map((deck) => ({
      ...deck,
      cardCount: kosakataCards.filter((card) => card.deckUri === deck.uri).length,
      sessionCount: kosakataSessions.filter((session) => session.deckUri === deck.uri).length,
    })),
    cards: kosakataCards,
    sessions: kosakataSessions,
  };

  const sifa = {};
  for (const collection of COLLECTIONS.filter((name) => name.startsWith('id.sifa.profile.'))) {
    sifa[collection.split('.').at(-1)] = (records[collection] || []).map((record) => ({
      ...record.value,
      uri: record.uri,
    }));
  }

  const activityCollections = COLLECTIONS.filter((collection) => collection !== 'pub.leaflet.document' && !collection.includes('publication') && !collection.includes('profile.externalAccount'));
  const activity = activityCollections.flatMap((collection) => (records[collection] || []).map(({ uri, value }) => {
    const date = firstDate(value);
    if (!date) return null;
    return {
      uri,
      collection,
      app: appName(collection, value, standardPublications),
      date,
      label: activityLabel(collection, value),
      url: activityUrl(collection, value, uri),
      text: cleanText(value.text || value.caption?.text || value.description || value.itemDescription || ''),
    };
  })).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));

  const output = {
    generatedAt: new Date().toISOString(),
    handle: HANDLE,
    did: identity.did,
    pds,
    collections: Object.fromEntries(entries.map(([name, list]) => [name, list.length])),
    writing,
    books,
    kosakata,
    sifa,
    activity,
  };

  try {
    const previous = JSON.parse(await readFile(OUTPUT, 'utf8'));
    const { generatedAt: _previousGeneratedAt, ...previousData } = previous;
    const { generatedAt: _nextGeneratedAt, ...nextData } = output;
    if (JSON.stringify(previousData) === JSON.stringify(nextData)) {
      console.log(`No ATProto changes across ${COLLECTIONS.length} collections.`);
      return;
    }
  } catch {
    // A missing or invalid snapshot is replaced below.
  }

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Synced ${activity.length} dated records across ${COLLECTIONS.length} collections.`);
}

async function runOnce() {
  try {
    await sync();
  } catch (error) {
    if (!SOFT) throw error;
    try {
      await readFile(OUTPUT, 'utf8');
      console.warn(`ATProto sync failed; using checked-in snapshot. ${error.message}`);
    } catch {
      throw error;
    }
  }
}

await runOnce();
while (WATCH) {
  await new Promise((resolve) => setTimeout(resolve, WATCH_INTERVAL_MS));
  await runOnce();
}
