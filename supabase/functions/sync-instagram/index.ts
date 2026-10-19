import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type IgMedia = {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
};

type PlannedPost = {
  id: string;
  tipo: string;
  legenda: string | null;
  data_prevista: string | null;
  instagram_media_id: string | null;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
});

function normalize(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/https?:\/\/\S+/g, ' ').replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function similarity(a = '', b = '') {
  const left = new Set(normalize(a).split(' ').filter((x) => x.length > 2));
  const right = new Set(normalize(b).split(' ').filter((x) => x.length > 2));
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach((word) => { if (right.has(word)) intersection++; });
  return intersection / (left.size + right.size - intersection);
}

function compatible(post: PlannedPost, media: IgMedia) {
  if (media.media_type === 'VIDEO') return post.tipo === 'reels';
  if (media.media_type === 'CAROUSEL_ALBUM') return post.tipo === 'carrossel';
  return post.tipo === 'post';
}

function sameDay(date: string | null, timestamp: string) {
  return Boolean(date && timestamp.slice(0, 10) === date);
}

function chooseMatch(media: IgMedia, candidates: PlannedPost[]) {
  const scored = candidates.filter((p) => compatible(p, media)).map((post) => ({
    post,
    text: similarity(post.legenda || '', media.caption || ''),
    date: sameDay(post.data_prevista, media.timestamp),
  })).sort((a, b) => (b.text + Number(b.date) * .2) - (a.text + Number(a.date) * .2));
  const best = scored[0];
  if (!best) return null;
  // Legenda forte e unica; ou mesma data com alguma confirmacao textual.
  if (best.text >= .72 && (!scored[1] || best.text - scored[1].text >= .08)) return {post: best.post, reason: 'legenda'};
  if (best.date && best.text >= .35 && scored.filter((x) => x.date).length === 1) return {post: best.post, reason: 'data'};
  return null;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({error: 'method_not_allowed'}, 405);
  const cronSecret = Deno.env.get('INSTAGRAM_SYNC_SECRET');
  if (!cronSecret || request.headers.get('x-sync-secret') !== cronSecret) return json({error: 'unauthorized'}, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const metaToken = Deno.env.get('META_INSTAGRAM_ACCESS_TOKEN');
  if (!supabaseUrl || !serviceKey || !metaToken) return json({error: 'missing_server_secrets'}, 500);
  const sb = createClient(supabaseUrl, serviceKey, {auth: {persistSession: false}});

  const requestedSlug = new URL(request.url).searchParams.get('cliente') || 'margo';
  const {data: client, error: clientError} = await sb.from('clientes')
    .select('id,slug,instagram_business_account_id,instagram_sync_ativo')
    .eq('slug', requestedSlug).single();
  if (clientError || !client) return json({error: 'cliente_nao_encontrado'}, 404);
  if (!client.instagram_sync_ativo || !client.instagram_business_account_id) return json({error: 'instagram_nao_configurado'}, 409);

  try {
    const {data: rounds} = await sb.from('rodadas').select('id').eq('cliente_id', client.id)
      .neq('status', 'arquivada').order('criado_em', {ascending: false}).limit(1);
    const currentRoundId = rounds?.[0]?.id || null;
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    const graphVersion = Deno.env.get('META_GRAPH_VERSION') || 'v24.0';
    const endpoint = new URL(`https://graph.facebook.com/${graphVersion}/${client.instagram_business_account_id}/media`);
    endpoint.searchParams.set('fields', fields);
    endpoint.searchParams.set('limit', '50');
    endpoint.searchParams.set('access_token', metaToken);
    const graphResponse = await fetch(endpoint);
    const graph = await graphResponse.json();
    if (!graphResponse.ok) throw new Error(graph?.error?.message || 'meta_graph_error');
    const mediaItems: IgMedia[] = graph.data || [];

    const {data: existing, error: postsError} = await sb.from('posts')
      .select('id,tipo,legenda,data_prevista,instagram_media_id')
      .eq('cliente_id', client.id);
    if (postsError) throw postsError;
    const posts = (existing || []) as PlannedPost[];
    const matched = new Set(posts.filter((p) => p.instagram_media_id).map((p) => p.instagram_media_id));
    let updated = 0;
    let imported = 0;

    for (const media of [...mediaItems].reverse()) {
      if (matched.has(media.id)) {
        await sb.from('posts').update({
          instagram_permalink: media.permalink,
          instagram_media_url: media.media_url || null,
          instagram_thumbnail_url: media.thumbnail_url || null,
          publicado_em: media.timestamp,
        }).eq('instagram_media_id', media.id);
        continue;
      }
      const available = posts.filter((p) => !p.instagram_media_id && !matched.has(p.id));
      const match = chooseMatch(media, available);
      if (match) {
        const {error} = await sb.from('posts').update({
          status: 'publicado', etapa: 'publicado', instagram_media_id: media.id,
          instagram_permalink: media.permalink, instagram_media_url: media.media_url || null,
          instagram_thumbnail_url: media.thumbnail_url || null, publicado_em: media.timestamp,
          correspondencia_instagram: match.reason,
        }).eq('id', match.post.id);
        if (error) throw error;
        match.post.instagram_media_id = media.id;
        matched.add(media.id);
        updated++;
        continue;
      }

      const {error} = await sb.from('posts').insert({
        cliente_id: client.id, rodada_id: currentRoundId,
        tipo: media.media_type === 'VIDEO' ? 'reels' : media.media_type === 'CAROUSEL_ALBUM' ? 'carrossel' : 'post',
        titulo: (media.caption || 'Publicacao do Instagram').split('\n')[0].slice(0, 80),
        legenda: media.caption || '', status: 'publicado', etapa: 'publicado', copy_status: 'aprovado',
        midias: [], ordem: Math.floor(new Date(media.timestamp).getTime() / 1000),
        instagram_media_id: media.id, instagram_permalink: media.permalink,
        instagram_media_url: media.media_url || null, instagram_thumbnail_url: media.thumbnail_url || null,
        publicado_em: media.timestamp, origem: 'instagram', correspondencia_instagram: 'importado',
      });
      if (error) throw error;
      matched.add(media.id);
      imported++;
    }

    await sb.from('clientes').update({instagram_sincronizado_em: new Date().toISOString(), instagram_sync_erro: null}).eq('id', client.id);
    return json({ok: true, encontrados: mediaItems.length, atualizados: updated, importados: imported});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await sb.from('clientes').update({instagram_sync_erro: message.slice(0, 500)}).eq('id', client.id);
    return json({error: 'sync_failed', detail: message}, 502);
  }
});

