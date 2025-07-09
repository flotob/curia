          c.logo_url as community_logo_url,
            -- Semantic similarity score (0-1, higher is better)
            (1 - (p.embedding <-> $3::vector)) as similarity_score,
            -- Traditional ranking signals
            (
              -- Upvote boost (logarithmic to prevent dominance)
              GREATEST(0, LN(1 + p.upvote_count)) * 0.1 +
              -- Recency boost (favor recent posts slightly)
              GREATEST(0, EXTRACT(EPOCH FROM (NOW() - p.created_at)) / -86400) * 0.05 +
              -- Comment activity boost
              GREATEST(0, LN(1 + p.comment_count)) * 0.05
            ) as boost_score,
            CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted,
            -- Share statistics
            COALESCE(share_stats.total_access_count, 0) as share_access_count,
            COALESCE(share_stats.share_count, 0) as share_count,
            share_stats.last_shared_at,
            share_stats.most_recent_access_at
          FROM posts p 
          JOIN users u ON p.author_user_id = u.user_id
          JOIN boards b ON p.board_id = b.id
          JOIN communities c ON b.community_id = c.id
          LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1
          LEFT JOIN (
            SELECT 
              post_id,
              SUM(access_count) as total_access_count,
              COUNT(*) as share_count,
              MAX(created_at) as last_shared_at,
              MAX(last_accessed_at) as most_recent_access_at
            FROM links 
            WHERE expires_at IS NULL OR expires_at > NOW()
            GROUP BY post_id
          ) share_stats ON p.id = share_stats.post_id
          WHERE 
            p.board_id IN ($2)
            AND p.embedding IS NOT NULL
            -- AND (1 - (p.embedding <-> $3::vector)) > $4  -- Temporarily disabled for debugging
        )
        SELECT *, 
               (similarity_score * 0.7 + boost_score * 0.3) as rank_score
        FROM semantic_results
        ORDER BY rank_score DESC
        LIMIT $5
      
[SemanticSearchService] Parameters: [
  '$1: string - 86326068-5e1f-41b4-ba39-213402bf3601',
  '$2: number - 1',
  '$3: string - [-0.008200708,-0.035282116,-0.00025378886,0.049871...',
  '$4: number - 0.05',
  '$5: number - 10'
]
Error executing query {
  text: '\n' +
    '        WITH semantic_results AS (\n' +
    '          SELECT \n' +
    '            p.*,\n' +
    '            u.name as author_name,\n' +
    '            u.profile_picture_url as author_profile_picture_url,\n' +
    '            b.name as board_name,\n' +
    '            b.id as board_id,\n' +
    '            c.community_short_id,\n' +
    '            c.plugin_id,\n' +
    '            c.name as community_name,\n' +
    '            c.logo_url as community_logo_url,\n' +
    '            -- Semantic similarity score (0-1, higher is better)\n' +
    '            (1 - (p.embedding <-> $3::vector)) as similarity_score,\n' +
    '            -- Traditional ranking signals\n' +
    '            (\n' +
    '              -- Upvote boost (logarithmic to prevent dominance)\n' +
    '              GREATEST(0, LN(1 + p.upvote_count)) * 0.1 +\n' +
    '              -- Recency boost (favor recent posts slightly)\n' +
    '              GREATEST(0, EXTRACT(EPOCH FROM (NOW() - p.created_at)) / -86400) * 0.05 +\n' +
    '              -- Comment activity boost\n' +
    '              GREATEST(0, LN(1 + p.comment_count)) * 0.05\n' +
    '            ) as boost_score,\n' +
    '            CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted,\n' +
    '            -- Share statistics\n' +
    '            COALESCE(share_stats.total_access_count, 0) as share_access_count,\n' +
    '            COALESCE(share_stats.share_count, 0) as share_count,\n' +
    '            share_stats.last_shared_at,\n' +
    '            share_stats.most_recent_access_at\n' +
    '          FROM posts p \n' +
    '          JOIN users u ON p.author_user_id = u.user_id\n' +
    '          JOIN boards b ON p.board_id = b.id\n' +
    '          JOIN communities c ON b.community_id = c.id\n' +
    '          LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1\n' +
    '          LEFT JOIN (\n' +
    '            SELECT \n' +
    '              post_id,\n' +
    '              SUM(access_count) as total_access_count,\n' +
    '              COUNT(*) as share_count,\n' +
    '              MAX(created_at) as last_shared_at,\n' +
    '              MAX(last_accessed_at) as most_recent_access_at\n' +
    '            FROM links \n' +
    '            WHERE expires_at IS NULL OR expires_at > NOW()\n' +
    '            GROUP BY post_id\n' +
    '          ) share_stats ON p.id = share_stats.post_id\n' +
    '          WHERE \n' +
    '            p.board_id IN ($2)\n' +
    '            AND p.embedding IS NOT NULL\n' +
    '            -- AND (1 - (p.embedding <-> $3::vector)) > $4  -- Temporarily disabled for debugging\n' +
    '        )\n' +
    '        SELECT *, \n' +
    '               (similarity_score * 0.7 + boost_score * 0.3) as rank_score\n' +
    '        FROM semantic_results\n' +
    '        ORDER BY rank_score DESC\n' +
    '        LIMIT $5\n' +
    '      ',
  values: [
    '86326068-5e1f-41b4-ba39-213402bf3601',
    1,
    '[-0.008200708,-0.035282116,-0.00025378886,0.04987175,0.01181633,-0.024395518,0.011903741,0.038905684,-0.03502783,-0.02803498,0.005868433,-0.03305712,0.02441141,-0.024395518,0.011045528,0.024618018,-0.039986398,-0.025714625,-0.034678187,0.03378819,0.045898538,0.05400389,-0.0019488601,0.0076206196,-0.019850165,0.005153255,0.016274273,0.0060432544,0.024538554,0.0020779895,0.07590423,-0.038905684,0.045485325,-0.00079464226,0.016830523,-0.013628115,-0.00093370466,-0.012738116,-0.040367827,-0.034423903,0.009543654,-0.047932822,0.06865709,0.056165315,0.026143732,0.01926213,-0.045326397,-0.004302988,0.02345784,0.015026686,-0.023886947,-0.04233854,0.026604623,0.1028585,0.0099886535,0.016623916,-0.03658533,0.024776947,-0.021852663,-0.01323874,-0.019754807,0.002534909,0.010179368,0.043927826,0.0134294545,-0.024029983,-0.0067187003,0.03814283,-0.0015177667,0.0029938149,0.003502386,0.03127712,-0.023553196,0.030816227,0.013850614,0.0143591855,-0.019230343,-0.0071319146,-0.013477133,-0.027796587,-0.040812828,0.01719606,0.0011144858,-0.025031231,0.010695885,0.008391422,-0.063380666,0.04322854,0.006539906,-0.05635603,-0.017005345,-0.024506768,-0.038810328,0.01466115,0.018960165,0.0211057,0.009408564,0.0015992175,0.04189354,0.021741413,0.020088557,-0.021550698,0.012213652,0.019500522,0.007855039,-0.0064564683,0.00921785,-0.015320703,0.010354189,0.046566036,-0.03960497,0.02445909,0.0025964936,0.011808384,-0.021185163,-0.0046168715,-0.0047082556,-0.027955515,0.04256104,-0.011546153,0.0080338335,-0.01983427,0.021582484,-0.009265529,0.015646506,0.019738914,-0.007147807,0.016608024,-0.05250996,-0.058167815,0.0045970054,0.008045753,0.015797488,-0.022202305,-0.048187107,0.08245208,-0.013715526,-0.018928379,-0.0553071,0.013334097,0.017958915,-0.0028448193,0.022694983,0.036426403,0.017974809,0.0028249533,0.011498474,0.030895691,0.0037268721,-0.009829725,0.010672046,-0.0060194153,-0.020024985,0.018721772,-0.03970033,-0.022329448,0.010910438,-0.026731767,-0.005920085,-0.002997788,-0.007978208,-0.03280283,-0.00988535,-0.013389722,-0.00802986,0.019087307,-0.023902839,-0.023712125,-0.048727464,-0.009893296,-0.03502783,0.0072590574,-0.080163516,0.058008887,0.0049943267,-0.004946648,0.037507117,-0.058453884,-0.053813174,-0.034709975,0.0393189,0.084041364,-0.016250435,-0.0042394167,-0.009376779,-0.04707461,0.014669096,-0.02089909,0.008478833,0.040081758,-0.0048592375,-0.0044698627,0.04049497,0.03245319,0.005848567,-0.04647068,0.014009544,-0.0072630304,0.05066639,-0.004950621,0.029068014,-0.035472833,0.04380068,-0.054925673,0.017720522,-0.02423659,0.034169618,0.012968562,0.050412107,0.015590881,0.1275242,-0.037507117,-0.04964925,-0.0032659797,-0.032167118,0.01083892,0.05244639,0.018388022,0.03327962,0.029926227,-0.02245659,0.02485641,0.008518565,0.02898855,-0.012499723,-0.016909987,-0.019850165,0.0048393714,-0.04500854,-0.010608475,-0.001108526,0.020072663,-0.051715318,-0.05142925,-0.018531058,0.04322854,-0.009456243,-0.04907711,0.008788744,-0.02228177,-0.057436742,-0.048727464,0.023505518,-0.026763551,-0.008844368,0.018689986,0.021026235,0.011426955,-0.018308558,0.01725963,0.011275974,-0.00029525926,0.039732113,0.0134135615,-0.013977758,0.027733015,0.013063919,0.006762406,0.040018186,-0.011347491,-0.051079605,0.019166771,-0.03401069,-0.019389272,-0.020454092,-0.024665697,0.019595878,-0.005034059,0.018578736,0.000934698,0.009615172,-0.011188563,0.03401069,-0.028781943,-0.08315137,0.05394032,0.060647096,0.007823253,0.026143732,0.008085486,-0.05127032,0.007739816,-0.0057412903,-0.019182665,-0.051302105,0.02647748,0.055593174,0.003607676,0.0011919634,-0.03989104,0.057404958,-0.05362246,0.019707128,-0.011069367,0.015400168,-0.0026322526,0.0031666495,-0.009964814,-0.04278354,-0.04338747,0.065287806,0.025380874,0.0033076985,0.029799085,-0.024204804,0.081625655,0.0045135682,0.025603374,-0.00087460317,-0.006436602,0.028082658,-0.012523563,-0.009742314,0.03451926,-0.00018413352,-0.08365994,-0.05317746,0.0013111598,0.026048373,0.016115345,0.013453294,-0.043673538,0.020295164,0.0010975996,-0.011991152,-0.0080219135,-0.010505171,-0.023219448,0.008478833,-0.019023737,-0.035886046,-0.022472484,0.007878878,0.0109581165,0.087792076,-0.028797835,-0.0034070287,0.065987095,-0.026620517,-0.03210355,-0.028352836,0.018737664,-0.023314804,0.022663198,-0.040145326,0.014446597,0.046375323,-0.007835173,0.03496426,-0.0010469411,-0.029846763,0.011800438,-0.05139746,0.028130336,-0.036013186,-0.018928379,0.037952114,-0.008319905,0.015519364,0.096310645,-0.004394372,-0.0058207544,0.0019210477,-0.022408912,-0.0017660925,-0.040749256,-0.034137834,-0.02374391,0.07851066,-0.054830316,-0.027876051,-0.029385872,-0.030339442,0.014565793,0.021773199,0.03591783,0.017656952,0.022996947,0.005014193,-0.01648088,0.020072663,0.045898538,0.058581028,-0.07030995,0.0088841,0.015892845,-0.010687939,-0.0029918281,-0.02552391,-0.03747533,0.078319944,-0.05311389,0.026684087,-0.032183014,-0.005117496,-0.027160874,0.038174614,0.049108893,-0.034678187,0.022949269,0.003768591,-0.055942815,-0.0052168267,-0.004525488,-0.016091507,0.028607123,-0.018022487,0.018705878,0.035091404,-0.0297673,0.03830176,-0.00027514488,0.051747106,0.052033175,0.02434784,0.007815307,0.016973559,-0.039636757,0.009090708,0.0065716915,0.027065516,0.008590083,-0.0057532103,-0.037125688,0.0021852662,-0.011720974,0.043260325,0.020056771,0.05902603,-0.0804178,0.009940974,-0.0033970957,-0.031531405,-0.0067544593,-0.009289368,-0.017943023,-0.012046777,0.02580998,-0.017513916,0.020771949,0.023839269,-0.03283462,-0.0064882543,-0.013500973,-0.013739365,0.0295448,-0.026159624,0.015718024,0.007211379,-0.023728019,-0.0012316955,-0.04847318,0.009225797,-0.026270874,0.035250332,-0.017053023,-0.012213652,0.029862657,0.03238962,0.01206267,-0.012110348,-0.044595324,-0.017847665,0.016170971,0.016210703,-0.035154976,-0.01334999,0.027574087,-0.035313904,-0.008423208,-0.021185163,-0.0036394617,-0.0071319146,0.010425706,-0.03461462,-0.016004095,0.034900688,-0.045548894,0.03436033,-0.020168021,-0.04453175,0.018006593,-0.00924169,0.007441825,-0.014247936,0.037125688,0.028893193,-0.027764801,-0.055752102,0.015066418,0.04742425,0.0012495749,0.029973907,-0.02161427,0.00445397,-0.019166771,-0.031372476,-0.052668888,-0.043673538,-0.016290167,-0.020454092,-0.09510279,-0.031118192,0.025714625,0.019913735,-0.017466238,0.0058366475,-0.010028386,-0.02898855,0.047201753,0.0008984424,0.04926782,-0.008661601,-0.02636623,-0.023918733,0.0012803674,0.0065677185,0.005355889,-0.02960837,-0.0153524885,0.034551047,-0.035663545,0.037570685,-0.012841419,-0.0043546394,-0.009432403,-0.0012555348,-0.02832105,-0.025682839,0.026747659,0.006373031,-0.016782844,0.012229545,0.005192987,0.019023737,-0.0016329898,0.050634604,-0.012873204,0.021646056,-0.019421058,0.012587134,0.028305158,0.024173018,-0.008701333,-0.0045771394,0.06674995,-0.017641058,0.017688736,0.017784094,0.024586232,0.0042751753,-0.024665697,0.013437401,-0.024093553,0.03188105,-0.00957544,0.012777848,0.0041599525,0.005435353,-0.00012347996,-0.006802138,-0.0119593665,0.029417656,-0.018022487,0.014788292,0.031563193,0.01117267,0.0071756197,0.03267569,-0.013620169,-0.025221946,0.027717123,-0.008669547,-0.04869568,0.024252482,0.024904089,0.021201055,0.019119093,0.015026686,-0.0075053964,-0.0049585677,0.016576238,-0.026239088,-0.0002994808,0.026795337,-0.022440698,-0.011061421,-0.0011790504,-0.044817824,0.0064048166,0.0109978495,0.013874454,-0.012491777,-0.022329448,0.012587134,-0.009448296,0.016115345,0.004195711,-0.008812583,-0.008756958,0.020787843,-0.0011432916,0.0064445487,0.004062609,0.021630162,-0.0063412455,0.017688736,-0.04434104,-0.013071866,-0.008637762,0.013445348,0.03049837,-0.0017124541,0.0022508241,-0.038778543,0.010433653,-0.0034189483,0.0010946197,-0.008605976,0.018133737,-0.05746853,0.004851291,0.011355438,0.031038728,0.0053876746,0.012412312,-0.045898538,-0.0019001884,-0.042116042,0.027415158,-0.014478383,0.012134188,0.006480308,-0.023918733,-0.022011591,0.01659213,-0.04891818,0.02089909,0.0060790135,-0.009686689,0.012722223,0.030005692,-0.0044499966,-0.021121591,0.0038460686,-0.019166771,0.012197759,-0.011228295,-0.01630606,-0.0037526982,0.0011641509,0.014541954,0.019516414,-0.025762303,-0.0072868695,-0.008383476,-0.0009088721,-0.018976057,0.004791693,-0.014494275,-0.04233854,0.0016687488,0.024220696,-0.004322854,0.018626414,0.02825748,0.014812132,0.013779097,-0.043037824,-0.018785343,0.03849247,0.023918733,0.04335568,-0.010338296,0.016337845,-0.024554446,-0.009209904,0.010028386,-0.01237258,-0.026652303,-0.00008051961,0.024474982,0.014589632,-0.038206402,0.024570338,0.01894427,0.04891818,-0.026509266,-0.025746409,-0.0038321624,-0.037411757,0.013389722,0.018467486,0.0058167814,0.056737456,0.008494725,-0.0066034775,-0.012722223,-0.031912833,-0.0564196,-0.046025682,0.038015686,-0.04338747,-0.01748213,-0.028416408,-0.07126352,-0.015209453,0.015805434,0.0058326744,0.0035043724,0.0075649945,0.002971962,0.0016528559,0.016512666,0.016862309,0.0211057,0.00868544,-0.015956417,0.008208655,-0.022027483,0.016226595,-0.0052446392,-0.0047797733,0.018515166,-0.0058763796,-0.013540705,-0.038460687,0.017561594,-0.017625166,-0.017958915,-0.013421508,-0.034042474,-0.0018256906,0.011856062,-0.004529461,0.00054432993,-0.0032858457,-0.0044897287,-0.013222847,-0.015074364,0.003516292,-0.013365883,-0.00011491272,-0.033216048,-0.010012493,-0.0076206196,0.02050177,-0.02161427,0.011498474,0.016798738,-0.05161996,0.014708828,-0.0031527432,-0.015908739,-0.02943355,-0.030927477,0.035472833,-0.018562844,0.013342043,0.031404264,0.004970487,0.044881396,0.011562045,-0.002433592,0.016957667,-0.03138837,-0.042147826,-0.021137485,-0.019182665,-0.0068339235,-0.011117046,-0.04049497,0.012952669,0.011077314,-0.022313556,-0.0016190836,-0.013254633,-0.016719274,-0.024967661,0.03407426,0.027303908,0.017275523,-0.011490528,0.00037944168,0.019087307,-0.0033970957,0.013437401,-0.0066908877,-0.026016587,-0.00046312745,-0.006051201,0.01787945,-0.0039036802,0.0023064492,0.025873553,0.0062419153,-0.0024455115,-0.06662281,0.008296065,-0.018292665,-0.'... 9275 more characters,
    0.05,
    10
  ],
  err: error: could not determine data type of parameter $4
      at async query (src/lib/db.ts:48:16)
      at async SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:251:21)
      at async eval (src/app/api/search/posts/semantic/route.ts:71:20)
      at async eval (src/lib/middleware/authEnhanced.ts:96:13)
      at async eval (src/lib/withAuth.ts:80:13)
      at async eval (src/lib/middleware/authEnhanced.ts:123:13)
    46 |   const client = await getPool().connect();
    47 |   try {
  > 48 |     const res = await client.query(text, values);
       |                ^
    49 |     const duration = Date.now() - start;
    50 |     console.log('executed query', { text, duration, rows: res.rowCount });
    51 |     return res; {
    length: 124,
    severity: 'ERROR',
    code: '42P18',
    detail: undefined,
    hint: undefined,
    position: undefined,
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'postgres.c',
    line: '742',
    routine: 'pg_analyze_and_rewrite_varparams'
  }
}
[SemanticSearchService] Semantic search failed: error: could not determine data type of parameter $4
    at async query (src/lib/db.ts:48:16)
    at async SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:251:21)
    at async eval (src/app/api/search/posts/semantic/route.ts:71:20)
    at async eval (src/lib/middleware/authEnhanced.ts:96:13)
    at async eval (src/lib/withAuth.ts:80:13)
    at async eval (src/lib/middleware/authEnhanced.ts:123:13)
  46 |   const client = await getPool().connect();
  47 |   try {
> 48 |     const res = await client.query(text, values);
     |                ^
  49 |     const duration = Date.now() - start;
  50 |     console.log('executed query', { text, duration, rows: res.rowCount });
  51 |     return res; {
  length: 124,
  severity: 'ERROR',
  code: '42P18',
  detail: undefined,
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'postgres.c',
  line: '742',
  routine: 'pg_analyze_and_rewrite_varparams'
}
[Semantic Search API] Error: Error [ValidationError]: Semantic search failed
    at SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:275:12)
    at async eval (src/app/api/search/posts/semantic/route.ts:71:20)
    at async eval (src/lib/middleware/authEnhanced.ts:96:13)
    at async eval (src/lib/withAuth.ts:80:13)
    at async eval (src/lib/middleware/authEnhanced.ts:123:13)
  273 |         throw error;
  274 |       }
> 275 |       throw new ValidationError(
      |            ^
  276 |         'Semantic search failed',
  277 |         { originalError: error, searchQuery: searchQuery.substring(0, 100) }
  278 |       ); {
  code: 'VALIDATION_FAILED',
  statusCode: 400,
  details: [Object],
  timestamp: '2025-07-09T06:37:21.780Z',
  requestId: undefined
}
 GET /api/search/posts/semantic?q=alien 500 in 2373ms
[withAuth] Token verified successfully. Decoded exp: 1752046605 Current time: 1752043042
executed query {
  text: '\n' +
    '      -- Get owned boards\n' +
    '      SELECT \n' +
    '        b.id, b.name, b.description, b.settings, b.community_id, \n' +
    '        b.created_at, b.updated_at,\n' +
    '        false as is_imported,\n' +
    '        null as source_community_id,\n' +
    '        null as source_community_name\n' +
    '      FROM boards b \n' +
    '      WHERE b.community_id = $1\n' +
    '      \n' +
    '      UNION ALL\n' +
    '      \n' +
    '      -- Get imported boards\n' +
    '      SELECT \n' +
    '        b.id, b.name, b.description, b.settings, b.community_id,\n' +
    '        b.created_at, b.updated_at,\n' +
    '        true as is_imported,\n' +
    '        ib.source_community_id,\n' +
    '        sc.name as source_community_name\n' +
    '      FROM boards b\n' +
    '      JOIN imported_boards ib ON b.id = ib.source_board_id\n' +
    '      JOIN communities sc ON ib.source_community_id = sc.id\n' +
    '      WHERE ib.importing_community_id = $1 AND ib.is_active = true\n' +
    '      \n' +
    '      ORDER BY name ASC\n' +
    '    ',
  duration: 4,
  rows: 1
}
[SemanticSearchService] Executing semantic search: {
  searchQuery: 'alien',
  accessibleBoardIds: [ 1 ],
  threshold: 0.05,
  limit: 10,
  embeddingLength: 1536,
  includeUserVoting: true,
  userId: '86326068-5e1f-41b4-ba39-213402bf3601',
  paramsLength: 5,
  paramsStructure: [
    '$1: string 86326068-5e1f-41b4-b',
    '$2: number 1',
    '$3: string [-0.008200708,-0.035',
    '$4: number 0.05',
    '$5: number 10'
  ],
  boardIdsPlaceholders: '$2'
}
[SemanticSearchService] Generated SQL: 
        WITH semantic_results AS (
          SELECT 
            p.*,
            u.name as author_name,
            u.profile_picture_url as author_profile_picture_url,
            b.name as board_name,
            b.id as board_id,
            c.community_short_id,
            c.plugin_id,
            c.name as community_name,
            c.logo_url as community_logo_url,
            -- Semantic similarity score (0-1, higher is better)
            (1 - (p.embedding <-> $3::vector)) as similarity_score,
            -- Traditional ranking signals
            (
              -- Upvote boost (logarithmic to prevent dominance)
              GREATEST(0, LN(1 + p.upvote_count)) * 0.1 +
              -- Recency boost (favor recent posts slightly)
              GREATEST(0, EXTRACT(EPOCH FROM (NOW() - p.created_at)) / -86400) * 0.05 +
              -- Comment activity boost
              GREATEST(0, LN(1 + p.comment_count)) * 0.05
            ) as boost_score,
            CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted,
            -- Share statistics
            COALESCE(share_stats.total_access_count, 0) as share_access_count,
            COALESCE(share_stats.share_count, 0) as share_count,
            share_stats.last_shared_at,
            share_stats.most_recent_access_at
          FROM posts p 
          JOIN users u ON p.author_user_id = u.user_id
          JOIN boards b ON p.board_id = b.id
          JOIN communities c ON b.community_id = c.id
          LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1
          LEFT JOIN (
            SELECT 
              post_id,
              SUM(access_count) as total_access_count,
              COUNT(*) as share_count,
              MAX(created_at) as last_shared_at,
              MAX(last_accessed_at) as most_recent_access_at
            FROM links 
            WHERE expires_at IS NULL OR expires_at > NOW()
            GROUP BY post_id
          ) share_stats ON p.id = share_stats.post_id
          WHERE 
            p.board_id IN ($2)
            AND p.embedding IS NOT NULL
            -- AND (1 - (p.embedding <-> $3::vector)) > $4  -- Temporarily disabled for debugging
        )
        SELECT *, 
               (similarity_score * 0.7 + boost_score * 0.3) as rank_score
        FROM semantic_results
        ORDER BY rank_score DESC
        LIMIT $5
      
[SemanticSearchService] Parameters: [
  '$1: string - 86326068-5e1f-41b4-ba39-213402bf3601',
  '$2: number - 1',
  '$3: string - [-0.008200708,-0.035282116,-0.00025378886,0.049871...',
  '$4: number - 0.05',
  '$5: number - 10'
]
Error executing query {
  text: '\n' +
    '        WITH semantic_results AS (\n' +
    '          SELECT \n' +
    '            p.*,\n' +
    '            u.name as author_name,\n' +
    '            u.profile_picture_url as author_profile_picture_url,\n' +
    '            b.name as board_name,\n' +
    '            b.id as board_id,\n' +
    '            c.community_short_id,\n' +
    '            c.plugin_id,\n' +
    '            c.name as community_name,\n' +
    '            c.logo_url as community_logo_url,\n' +
    '            -- Semantic similarity score (0-1, higher is better)\n' +
    '            (1 - (p.embedding <-> $3::vector)) as similarity_score,\n' +
    '            -- Traditional ranking signals\n' +
    '            (\n' +
    '              -- Upvote boost (logarithmic to prevent dominance)\n' +
    '              GREATEST(0, LN(1 + p.upvote_count)) * 0.1 +\n' +
    '              -- Recency boost (favor recent posts slightly)\n' +
    '              GREATEST(0, EXTRACT(EPOCH FROM (NOW() - p.created_at)) / -86400) * 0.05 +\n' +
    '              -- Comment activity boost\n' +
    '              GREATEST(0, LN(1 + p.comment_count)) * 0.05\n' +
    '            ) as boost_score,\n' +
    '            CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted,\n' +
    '            -- Share statistics\n' +
    '            COALESCE(share_stats.total_access_count, 0) as share_access_count,\n' +
    '            COALESCE(share_stats.share_count, 0) as share_count,\n' +
    '            share_stats.last_shared_at,\n' +
    '            share_stats.most_recent_access_at\n' +
    '          FROM posts p \n' +
    '          JOIN users u ON p.author_user_id = u.user_id\n' +
    '          JOIN boards b ON p.board_id = b.id\n' +
    '          JOIN communities c ON b.community_id = c.id\n' +
    '          LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1\n' +
    '          LEFT JOIN (\n' +
    '            SELECT \n' +
    '              post_id,\n' +
    '              SUM(access_count) as total_access_count,\n' +
    '              COUNT(*) as share_count,\n' +
    '              MAX(created_at) as last_shared_at,\n' +
    '              MAX(last_accessed_at) as most_recent_access_at\n' +
    '            FROM links \n' +
    '            WHERE expires_at IS NULL OR expires_at > NOW()\n' +
    '            GROUP BY post_id\n' +
    '          ) share_stats ON p.id = share_stats.post_id\n' +
    '          WHERE \n' +
    '            p.board_id IN ($2)\n' +
    '            AND p.embedding IS NOT NULL\n' +
    '            -- AND (1 - (p.embedding <-> $3::vector)) > $4  -- Temporarily disabled for debugging\n' +
    '        )\n' +
    '        SELECT *, \n' +
    '               (similarity_score * 0.7 + boost_score * 0.3) as rank_score\n' +
    '        FROM semantic_results\n' +
    '        ORDER BY rank_score DESC\n' +
    '        LIMIT $5\n' +
    '      ',
  values: [
    '86326068-5e1f-41b4-ba39-213402bf3601',
    1,
    '[-0.008200708,-0.035282116,-0.00025378886,0.04987175,0.01181633,-0.024395518,0.011903741,0.038905684,-0.03502783,-0.02803498,0.005868433,-0.03305712,0.02441141,-0.024395518,0.011045528,0.024618018,-0.039986398,-0.025714625,-0.034678187,0.03378819,0.045898538,0.05400389,-0.0019488601,0.0076206196,-0.019850165,0.005153255,0.016274273,0.0060432544,0.024538554,0.0020779895,0.07590423,-0.038905684,0.045485325,-0.00079464226,0.016830523,-0.013628115,-0.00093370466,-0.012738116,-0.040367827,-0.034423903,0.009543654,-0.047932822,0.06865709,0.056165315,0.026143732,0.01926213,-0.045326397,-0.004302988,0.02345784,0.015026686,-0.023886947,-0.04233854,0.026604623,0.1028585,0.0099886535,0.016623916,-0.03658533,0.024776947,-0.021852663,-0.01323874,-0.019754807,0.002534909,0.010179368,0.043927826,0.0134294545,-0.024029983,-0.0067187003,0.03814283,-0.0015177667,0.0029938149,0.003502386,0.03127712,-0.023553196,0.030816227,0.013850614,0.0143591855,-0.019230343,-0.0071319146,-0.013477133,-0.027796587,-0.040812828,0.01719606,0.0011144858,-0.025031231,0.010695885,0.008391422,-0.063380666,0.04322854,0.006539906,-0.05635603,-0.017005345,-0.024506768,-0.038810328,0.01466115,0.018960165,0.0211057,0.009408564,0.0015992175,0.04189354,0.021741413,0.020088557,-0.021550698,0.012213652,0.019500522,0.007855039,-0.0064564683,0.00921785,-0.015320703,0.010354189,0.046566036,-0.03960497,0.02445909,0.0025964936,0.011808384,-0.021185163,-0.0046168715,-0.0047082556,-0.027955515,0.04256104,-0.011546153,0.0080338335,-0.01983427,0.021582484,-0.009265529,0.015646506,0.019738914,-0.007147807,0.016608024,-0.05250996,-0.058167815,0.0045970054,0.008045753,0.015797488,-0.022202305,-0.048187107,0.08245208,-0.013715526,-0.018928379,-0.0553071,0.013334097,0.017958915,-0.0028448193,0.022694983,0.036426403,0.017974809,0.0028249533,0.011498474,0.030895691,0.0037268721,-0.009829725,0.010672046,-0.0060194153,-0.020024985,0.018721772,-0.03970033,-0.022329448,0.010910438,-0.026731767,-0.005920085,-0.002997788,-0.007978208,-0.03280283,-0.00988535,-0.013389722,-0.00802986,0.019087307,-0.023902839,-0.023712125,-0.048727464,-0.009893296,-0.03502783,0.0072590574,-0.080163516,0.058008887,0.0049943267,-0.004946648,0.037507117,-0.058453884,-0.053813174,-0.034709975,0.0393189,0.084041364,-0.016250435,-0.0042394167,-0.009376779,-0.04707461,0.014669096,-0.02089909,0.008478833,0.040081758,-0.0048592375,-0.0044698627,0.04049497,0.03245319,0.005848567,-0.04647068,0.014009544,-0.0072630304,0.05066639,-0.004950621,0.029068014,-0.035472833,0.04380068,-0.054925673,0.017720522,-0.02423659,0.034169618,0.012968562,0.050412107,0.015590881,0.1275242,-0.037507117,-0.04964925,-0.0032659797,-0.032167118,0.01083892,0.05244639,0.018388022,0.03327962,0.029926227,-0.02245659,0.02485641,0.008518565,0.02898855,-0.012499723,-0.016909987,-0.019850165,0.0048393714,-0.04500854,-0.010608475,-0.001108526,0.020072663,-0.051715318,-0.05142925,-0.018531058,0.04322854,-0.009456243,-0.04907711,0.008788744,-0.02228177,-0.057436742,-0.048727464,0.023505518,-0.026763551,-0.008844368,0.018689986,0.021026235,0.011426955,-0.018308558,0.01725963,0.011275974,-0.00029525926,0.039732113,0.0134135615,-0.013977758,0.027733015,0.013063919,0.006762406,0.040018186,-0.011347491,-0.051079605,0.019166771,-0.03401069,-0.019389272,-0.020454092,-0.024665697,0.019595878,-0.005034059,0.018578736,0.000934698,0.009615172,-0.011188563,0.03401069,-0.028781943,-0.08315137,0.05394032,0.060647096,0.007823253,0.026143732,0.008085486,-0.05127032,0.007739816,-0.0057412903,-0.019182665,-0.051302105,0.02647748,0.055593174,0.003607676,0.0011919634,-0.03989104,0.057404958,-0.05362246,0.019707128,-0.011069367,0.015400168,-0.0026322526,0.0031666495,-0.009964814,-0.04278354,-0.04338747,0.065287806,0.025380874,0.0033076985,0.029799085,-0.024204804,0.081625655,0.0045135682,0.025603374,-0.00087460317,-0.006436602,0.028082658,-0.012523563,-0.009742314,0.03451926,-0.00018413352,-0.08365994,-0.05317746,0.0013111598,0.026048373,0.016115345,0.013453294,-0.043673538,0.020295164,0.0010975996,-0.011991152,-0.0080219135,-0.010505171,-0.023219448,0.008478833,-0.019023737,-0.035886046,-0.022472484,0.007878878,0.0109581165,0.087792076,-0.028797835,-0.0034070287,0.065987095,-0.026620517,-0.03210355,-0.028352836,0.018737664,-0.023314804,0.022663198,-0.040145326,0.014446597,0.046375323,-0.007835173,0.03496426,-0.0010469411,-0.029846763,0.011800438,-0.05139746,0.028130336,-0.036013186,-0.018928379,0.037952114,-0.008319905,0.015519364,0.096310645,-0.004394372,-0.0058207544,0.0019210477,-0.022408912,-0.0017660925,-0.040749256,-0.034137834,-0.02374391,0.07851066,-0.054830316,-0.027876051,-0.029385872,-0.030339442,0.014565793,0.021773199,0.03591783,0.017656952,0.022996947,0.005014193,-0.01648088,0.020072663,0.045898538,0.058581028,-0.07030995,0.0088841,0.015892845,-0.010687939,-0.0029918281,-0.02552391,-0.03747533,0.078319944,-0.05311389,0.026684087,-0.032183014,-0.005117496,-0.027160874,0.038174614,0.049108893,-0.034678187,0.022949269,0.003768591,-0.055942815,-0.0052168267,-0.004525488,-0.016091507,0.028607123,-0.018022487,0.018705878,0.035091404,-0.0297673,0.03830176,-0.00027514488,0.051747106,0.052033175,0.02434784,0.007815307,0.016973559,-0.039636757,0.009090708,0.0065716915,0.027065516,0.008590083,-0.0057532103,-0.037125688,0.0021852662,-0.011720974,0.043260325,0.020056771,0.05902603,-0.0804178,0.009940974,-0.0033970957,-0.031531405,-0.0067544593,-0.009289368,-0.017943023,-0.012046777,0.02580998,-0.017513916,0.020771949,0.023839269,-0.03283462,-0.0064882543,-0.013500973,-0.013739365,0.0295448,-0.026159624,0.015718024,0.007211379,-0.023728019,-0.0012316955,-0.04847318,0.009225797,-0.026270874,0.035250332,-0.017053023,-0.012213652,0.029862657,0.03238962,0.01206267,-0.012110348,-0.044595324,-0.017847665,0.016170971,0.016210703,-0.035154976,-0.01334999,0.027574087,-0.035313904,-0.008423208,-0.021185163,-0.0036394617,-0.0071319146,0.010425706,-0.03461462,-0.016004095,0.034900688,-0.045548894,0.03436033,-0.020168021,-0.04453175,0.018006593,-0.00924169,0.007441825,-0.014247936,0.037125688,0.028893193,-0.027764801,-0.055752102,0.015066418,0.04742425,0.0012495749,0.029973907,-0.02161427,0.00445397,-0.019166771,-0.031372476,-0.052668888,-0.043673538,-0.016290167,-0.020454092,-0.09510279,-0.031118192,0.025714625,0.019913735,-0.017466238,0.0058366475,-0.010028386,-0.02898855,0.047201753,0.0008984424,0.04926782,-0.008661601,-0.02636623,-0.023918733,0.0012803674,0.0065677185,0.005355889,-0.02960837,-0.0153524885,0.034551047,-0.035663545,0.037570685,-0.012841419,-0.0043546394,-0.009432403,-0.0012555348,-0.02832105,-0.025682839,0.026747659,0.006373031,-0.016782844,0.012229545,0.005192987,0.019023737,-0.0016329898,0.050634604,-0.012873204,0.021646056,-0.019421058,0.012587134,0.028305158,0.024173018,-0.008701333,-0.0045771394,0.06674995,-0.017641058,0.017688736,0.017784094,0.024586232,0.0042751753,-0.024665697,0.013437401,-0.024093553,0.03188105,-0.00957544,0.012777848,0.0041599525,0.005435353,-0.00012347996,-0.006802138,-0.0119593665,0.029417656,-0.018022487,0.014788292,0.031563193,0.01117267,0.0071756197,0.03267569,-0.013620169,-0.025221946,0.027717123,-0.008669547,-0.04869568,0.024252482,0.024904089,0.021201055,0.019119093,0.015026686,-0.0075053964,-0.0049585677,0.016576238,-0.026239088,-0.0002994808,0.026795337,-0.022440698,-0.011061421,-0.0011790504,-0.044817824,0.0064048166,0.0109978495,0.013874454,-0.012491777,-0.022329448,0.012587134,-0.009448296,0.016115345,0.004195711,-0.008812583,-0.008756958,0.020787843,-0.0011432916,0.0064445487,0.004062609,0.021630162,-0.0063412455,0.017688736,-0.04434104,-0.013071866,-0.008637762,0.013445348,0.03049837,-0.0017124541,0.0022508241,-0.038778543,0.010433653,-0.0034189483,0.0010946197,-0.008605976,0.018133737,-0.05746853,0.004851291,0.011355438,0.031038728,0.0053876746,0.012412312,-0.045898538,-0.0019001884,-0.042116042,0.027415158,-0.014478383,0.012134188,0.006480308,-0.023918733,-0.022011591,0.01659213,-0.04891818,0.02089909,0.0060790135,-0.009686689,0.012722223,0.030005692,-0.0044499966,-0.021121591,0.0038460686,-0.019166771,0.012197759,-0.011228295,-0.01630606,-0.0037526982,0.0011641509,0.014541954,0.019516414,-0.025762303,-0.0072868695,-0.008383476,-0.0009088721,-0.018976057,0.004791693,-0.014494275,-0.04233854,0.0016687488,0.024220696,-0.004322854,0.018626414,0.02825748,0.014812132,0.013779097,-0.043037824,-0.018785343,0.03849247,0.023918733,0.04335568,-0.010338296,0.016337845,-0.024554446,-0.009209904,0.010028386,-0.01237258,-0.026652303,-0.00008051961,0.024474982,0.014589632,-0.038206402,0.024570338,0.01894427,0.04891818,-0.026509266,-0.025746409,-0.0038321624,-0.037411757,0.013389722,0.018467486,0.0058167814,0.056737456,0.008494725,-0.0066034775,-0.012722223,-0.031912833,-0.0564196,-0.046025682,0.038015686,-0.04338747,-0.01748213,-0.028416408,-0.07126352,-0.015209453,0.015805434,0.0058326744,0.0035043724,0.0075649945,0.002971962,0.0016528559,0.016512666,0.016862309,0.0211057,0.00868544,-0.015956417,0.008208655,-0.022027483,0.016226595,-0.0052446392,-0.0047797733,0.018515166,-0.0058763796,-0.013540705,-0.038460687,0.017561594,-0.017625166,-0.017958915,-0.013421508,-0.034042474,-0.0018256906,0.011856062,-0.004529461,0.00054432993,-0.0032858457,-0.0044897287,-0.013222847,-0.015074364,0.003516292,-0.013365883,-0.00011491272,-0.033216048,-0.010012493,-0.0076206196,0.02050177,-0.02161427,0.011498474,0.016798738,-0.05161996,0.014708828,-0.0031527432,-0.015908739,-0.02943355,-0.030927477,0.035472833,-0.018562844,0.013342043,0.031404264,0.004970487,0.044881396,0.011562045,-0.002433592,0.016957667,-0.03138837,-0.042147826,-0.021137485,-0.019182665,-0.0068339235,-0.011117046,-0.04049497,0.012952669,0.011077314,-0.022313556,-0.0016190836,-0.013254633,-0.016719274,-0.024967661,0.03407426,0.027303908,0.017275523,-0.011490528,0.00037944168,0.019087307,-0.0033970957,0.013437401,-0.0066908877,-0.026016587,-0.00046312745,-0.006051201,0.01787945,-0.0039036802,0.0023064492,0.025873553,0.0062419153,-0.0024455115,-0.06662281,0.008296065,-0.018292665,-0.'... 9275 more characters,
    0.05,
    10
  ],
  err: error: could not determine data type of parameter $4
      at async query (src/lib/db.ts:48:16)
      at async SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:251:21)
      at async eval (src/app/api/search/posts/semantic/route.ts:71:20)
      at async eval (src/lib/middleware/authEnhanced.ts:96:13)
      at async eval (src/lib/withAuth.ts:80:13)
      at async eval (src/lib/middleware/authEnhanced.ts:123:13)
    46 |   const client = await getPool().connect();
    47 |   try {
  > 48 |     const res = await client.query(text, values);
       |                ^
    49 |     const duration = Date.now() - start;
    50 |     console.log('executed query', { text, duration, rows: res.rowCount });
    51 |     return res; {
    length: 124,
    severity: 'ERROR',
    code: '42P18',
    detail: undefined,
    hint: undefined,
    position: undefined,
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'postgres.c',
    line: '742',
    routine: 'pg_analyze_and_rewrite_varparams'
  }
}
[SemanticSearchService] Semantic search failed: error: could not determine data type of parameter $4
    at async query (src/lib/db.ts:48:16)
    at async SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:251:21)
    at async eval (src/app/api/search/posts/semantic/route.ts:71:20)
    at async eval (src/lib/middleware/authEnhanced.ts:96:13)
    at async eval (src/lib/withAuth.ts:80:13)
    at async eval (src/lib/middleware/authEnhanced.ts:123:13)
  46 |   const client = await getPool().connect();
  47 |   try {
> 48 |     const res = await client.query(text, values);
     |                ^
  49 |     const duration = Date.now() - start;
  50 |     console.log('executed query', { text, duration, rows: res.rowCount });
  51 |     return res; {
  length: 124,
  severity: 'ERROR',
  code: '42P18',
  detail: undefined,
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'postgres.c',
  line: '742',
  routine: 'pg_analyze_and_rewrite_varparams'
}
[Semantic Search API] Error: Error [ValidationError]: Semantic search failed
    at SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:275:12)
    at async eval (src/app/api/search/posts/semantic/route.ts:71:20)
    at async eval (src/lib/middleware/authEnhanced.ts:96:13)
    at async eval (src/lib/withAuth.ts:80:13)
    at async eval (src/lib/middleware/authEnhanced.ts:123:13)
  273 |         throw error;
  274 |       }
> 275 |       throw new ValidationError(
      |            ^
  276 |         'Semantic search failed',
  277 |         { originalError: error, searchQuery: searchQuery.substring(0, 100) }
  278 |       ); {
  code: 'VALIDATION_FAILED',
  statusCode: 400,
  details: [Object],
  timestamp: '2025-07-09T06:37:22.999Z',
  requestId: undefined
}
 GET /api/search/posts/semantic?q=alien 500 in 119ms
[withAuth] Token verified successfully. Decoded exp: 1752046605 Current time: 1752043045
executed query {
  text: '\n' +
    '      -- Get owned boards\n' +
    '      SELECT \n' +
    '        b.id, b.name, b.description, b.settings, b.community_id, \n' +
    '        b.created_at, b.updated_at,\n' +
    '        false as is_imported,\n' +
    '        null as source_community_id,\n' +
    '        null as source_community_name\n' +
    '      FROM boards b \n' +
    '      WHERE b.community_id = $1\n' +
    '      \n' +
    '      UNION ALL\n' +
    '      \n' +
    '      -- Get imported boards\n' +
    '      SELECT \n' +
    '        b.id, b.name, b.description, b.settings, b.community_id,\n' +
    '        b.created_at, b.updated_at,\n' +
    '        true as is_imported,\n' +
    '        ib.source_community_id,\n' +
    '        sc.name as source_community_name\n' +
    '      FROM boards b\n' +
    '      JOIN imported_boards ib ON b.id = ib.source_board_id\n' +
    '      JOIN communities sc ON ib.source_community_id = sc.id\n' +
    '      WHERE ib.importing_community_id = $1 AND ib.is_active = true\n' +
    '      \n' +
    '      ORDER BY name ASC\n' +
    '    ',
  duration: 3,
  rows: 1
}
[SemanticSearchService] Executing semantic search: {
  searchQuery: 'alien',
  accessibleBoardIds: [ 1 ],
  threshold: 0.05,
  limit: 10,
  embeddingLength: 1536,
  includeUserVoting: true,
  userId: '86326068-5e1f-41b4-ba39-213402bf3601',
  paramsLength: 5,
  paramsStructure: [
    '$1: string 86326068-5e1f-41b4-b',
    '$2: number 1',
    '$3: string [-0.008200708,-0.035',
    '$4: number 0.05',
    '$5: number 10'
  ],
  boardIdsPlaceholders: '$2'
}
[SemanticSearchService] Generated SQL: 
        WITH semantic_results AS (
          SELECT 
            p.*,
            u.name as author_name,
            u.profile_picture_url as author_profile_picture_url,
            b.name as board_name,
            b.id as board_id,
            c.community_short_id,
            c.plugin_id,
            c.name as community_name,
            c.logo_url as community_logo_url,
            -- Semantic similarity score (0-1, higher is better)
            (1 - (p.embedding <-> $3::vector)) as similarity_score,
            -- Traditional ranking signals
            (
              -- Upvote boost (logarithmic to prevent dominance)
              GREATEST(0, LN(1 + p.upvote_count)) * 0.1 +
              -- Recency boost (favor recent posts slightly)
              GREATEST(0, EXTRACT(EPOCH FROM (NOW() - p.created_at)) / -86400) * 0.05 +
              -- Comment activity boost
              GREATEST(0, LN(1 + p.comment_count)) * 0.05
            ) as boost_score,
            CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted,
            -- Share statistics
            COALESCE(share_stats.total_access_count, 0) as share_access_count,
            COALESCE(share_stats.share_count, 0) as share_count,
            share_stats.last_shared_at,
            share_stats.most_recent_access_at
          FROM posts p 
          JOIN users u ON p.author_user_id = u.user_id
          JOIN boards b ON p.board_id = b.id
          JOIN communities c ON b.community_id = c.id
          LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1
          LEFT JOIN (
            SELECT 
              post_id,
              SUM(access_count) as total_access_count,
              COUNT(*) as share_count,
              MAX(created_at) as last_shared_at,
              MAX(last_accessed_at) as most_recent_access_at
            FROM links 
            WHERE expires_at IS NULL OR expires_at > NOW()
            GROUP BY post_id
          ) share_stats ON p.id = share_stats.post_id
          WHERE 
            p.board_id IN ($2)
            AND p.embedding IS NOT NULL
            -- AND (1 - (p.embedding <-> $3::vector)) > $4  -- Temporarily disabled for debugging
        )
        SELECT *, 
               (similarity_score * 0.7 + boost_score * 0.3) as rank_score
        FROM semantic_results
        ORDER BY rank_score DESC
        LIMIT $5
      
[SemanticSearchService] Parameters: [
  '$1: string - 86326068-5e1f-41b4-ba39-213402bf3601',
  '$2: number - 1',
  '$3: string - [-0.008200708,-0.035282116,-0.00025378886,0.049871...',
  '$4: number - 0.05',
  '$5: number - 10'
]
Error executing query {
  text: '\n' +
    '        WITH semantic_results AS (\n' +
    '          SELECT \n' +
    '            p.*,\n' +
    '            u.name as author_name,\n' +
    '            u.profile_picture_url as author_profile_picture_url,\n' +
    '            b.name as board_name,\n' +
    '            b.id as board_id,\n' +
    '            c.community_short_id,\n' +
    '            c.plugin_id,\n' +
    '            c.name as community_name,\n' +
    '            c.logo_url as community_logo_url,\n' +
    '            -- Semantic similarity score (0-1, higher is better)\n' +
    '            (1 - (p.embedding <-> $3::vector)) as similarity_score,\n' +
    '            -- Traditional ranking signals\n' +
    '            (\n' +
    '              -- Upvote boost (logarithmic to prevent dominance)\n' +
    '              GREATEST(0, LN(1 + p.upvote_count)) * 0.1 +\n' +
    '              -- Recency boost (favor recent posts slightly)\n' +
    '              GREATEST(0, EXTRACT(EPOCH FROM (NOW() - p.created_at)) / -86400) * 0.05 +\n' +
    '              -- Comment activity boost\n' +
    '              GREATEST(0, LN(1 + p.comment_count)) * 0.05\n' +
    '            ) as boost_score,\n' +
    '            CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted,\n' +
    '            -- Share statistics\n' +
    '            COALESCE(share_stats.total_access_count, 0) as share_access_count,\n' +
    '            COALESCE(share_stats.share_count, 0) as share_count,\n' +
    '            share_stats.last_shared_at,\n' +
    '            share_stats.most_recent_access_at\n' +
    '          FROM posts p \n' +
    '          JOIN users u ON p.author_user_id = u.user_id\n' +
    '          JOIN boards b ON p.board_id = b.id\n' +
    '          JOIN communities c ON b.community_id = c.id\n' +
    '          LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1\n' +
    '          LEFT JOIN (\n' +
    '            SELECT \n' +
    '              post_id,\n' +
    '              SUM(access_count) as total_access_count,\n' +
    '              COUNT(*) as share_count,\n' +
    '              MAX(created_at) as last_shared_at,\n' +
    '              MAX(last_accessed_at) as most_recent_access_at\n' +
    '            FROM links \n' +
    '            WHERE expires_at IS NULL OR expires_at > NOW()\n' +
    '            GROUP BY post_id\n' +
    '          ) share_stats ON p.id = share_stats.post_id\n' +
    '          WHERE \n' +
    '            p.board_id IN ($2)\n' +
    '            AND p.embedding IS NOT NULL\n' +
    '            -- AND (1 - (p.embedding <-> $3::vector)) > $4  -- Temporarily disabled for debugging\n' +
    '        )\n' +
    '        SELECT *, \n' +
    '               (similarity_score * 0.7 + boost_score * 0.3) as rank_score\n' +
    '        FROM semantic_results\n' +
    '        ORDER BY rank_score DESC\n' +
    '        LIMIT $5\n' +
    '      ',
  values: [
    '86326068-5e1f-41b4-ba39-213402bf3601',
    1,
    '[-0.008200708,-0.035282116,-0.00025378886,0.04987175,0.01181633,-0.024395518,0.011903741,0.038905684,-0.03502783,-0.02803498,0.005868433,-0.03305712,0.02441141,-0.024395518,0.011045528,0.024618018,-0.039986398,-0.025714625,-0.034678187,0.03378819,0.045898538,0.05400389,-0.0019488601,0.0076206196,-0.019850165,0.005153255,0.016274273,0.0060432544,0.024538554,0.0020779895,0.07590423,-0.038905684,0.045485325,-0.00079464226,0.016830523,-0.013628115,-0.00093370466,-0.012738116,-0.040367827,-0.034423903,0.009543654,-0.047932822,0.06865709,0.056165315,0.026143732,0.01926213,-0.045326397,-0.004302988,0.02345784,0.015026686,-0.023886947,-0.04233854,0.026604623,0.1028585,0.0099886535,0.016623916,-0.03658533,0.024776947,-0.021852663,-0.01323874,-0.019754807,0.002534909,0.010179368,0.043927826,0.0134294545,-0.024029983,-0.0067187003,0.03814283,-0.0015177667,0.0029938149,0.003502386,0.03127712,-0.023553196,0.030816227,0.013850614,0.0143591855,-0.019230343,-0.0071319146,-0.013477133,-0.027796587,-0.040812828,0.01719606,0.0011144858,-0.025031231,0.010695885,0.008391422,-0.063380666,0.04322854,0.006539906,-0.05635603,-0.017005345,-0.024506768,-0.038810328,0.01466115,0.018960165,0.0211057,0.009408564,0.0015992175,0.04189354,0.021741413,0.020088557,-0.021550698,0.012213652,0.019500522,0.007855039,-0.0064564683,0.00921785,-0.015320703,0.010354189,0.046566036,-0.03960497,0.02445909,0.0025964936,0.011808384,-0.021185163,-0.0046168715,-0.0047082556,-0.027955515,0.04256104,-0.011546153,0.0080338335,-0.01983427,0.021582484,-0.009265529,0.015646506,0.019738914,-0.007147807,0.016608024,-0.05250996,-0.058167815,0.0045970054,0.008045753,0.015797488,-0.022202305,-0.048187107,0.08245208,-0.013715526,-0.018928379,-0.0553071,0.013334097,0.017958915,-0.0028448193,0.022694983,0.036426403,0.017974809,0.0028249533,0.011498474,0.030895691,0.0037268721,-0.009829725,0.010672046,-0.0060194153,-0.020024985,0.018721772,-0.03970033,-0.022329448,0.010910438,-0.026731767,-0.005920085,-0.002997788,-0.007978208,-0.03280283,-0.00988535,-0.013389722,-0.00802986,0.019087307,-0.023902839,-0.023712125,-0.048727464,-0.009893296,-0.03502783,0.0072590574,-0.080163516,0.058008887,0.0049943267,-0.004946648,0.037507117,-0.058453884,-0.053813174,-0.034709975,0.0393189,0.084041364,-0.016250435,-0.0042394167,-0.009376779,-0.04707461,0.014669096,-0.02089909,0.008478833,0.040081758,-0.0048592375,-0.0044698627,0.04049497,0.03245319,0.005848567,-0.04647068,0.014009544,-0.0072630304,0.05066639,-0.004950621,0.029068014,-0.035472833,0.04380068,-0.054925673,0.017720522,-0.02423659,0.034169618,0.012968562,0.050412107,0.015590881,0.1275242,-0.037507117,-0.04964925,-0.0032659797,-0.032167118,0.01083892,0.05244639,0.018388022,0.03327962,0.029926227,-0.02245659,0.02485641,0.008518565,0.02898855,-0.012499723,-0.016909987,-0.019850165,0.0048393714,-0.04500854,-0.010608475,-0.001108526,0.020072663,-0.051715318,-0.05142925,-0.018531058,0.04322854,-0.009456243,-0.04907711,0.008788744,-0.02228177,-0.057436742,-0.048727464,0.023505518,-0.026763551,-0.008844368,0.018689986,0.021026235,0.011426955,-0.018308558,0.01725963,0.011275974,-0.00029525926,0.039732113,0.0134135615,-0.013977758,0.027733015,0.013063919,0.006762406,0.040018186,-0.011347491,-0.051079605,0.019166771,-0.03401069,-0.019389272,-0.020454092,-0.024665697,0.019595878,-0.005034059,0.018578736,0.000934698,0.009615172,-0.011188563,0.03401069,-0.028781943,-0.08315137,0.05394032,0.060647096,0.007823253,0.026143732,0.008085486,-0.05127032,0.007739816,-0.0057412903,-0.019182665,-0.051302105,0.02647748,0.055593174,0.003607676,0.0011919634,-0.03989104,0.057404958,-0.05362246,0.019707128,-0.011069367,0.015400168,-0.0026322526,0.0031666495,-0.009964814,-0.04278354,-0.04338747,0.065287806,0.025380874,0.0033076985,0.029799085,-0.024204804,0.081625655,0.0045135682,0.025603374,-0.00087460317,-0.006436602,0.028082658,-0.012523563,-0.009742314,0.03451926,-0.00018413352,-0.08365994,-0.05317746,0.0013111598,0.026048373,0.016115345,0.013453294,-0.043673538,0.020295164,0.0010975996,-0.011991152,-0.0080219135,-0.010505171,-0.023219448,0.008478833,-0.019023737,-0.035886046,-0.022472484,0.007878878,0.0109581165,0.087792076,-0.028797835,-0.0034070287,0.065987095,-0.026620517,-0.03210355,-0.028352836,0.018737664,-0.023314804,0.022663198,-0.040145326,0.014446597,0.046375323,-0.007835173,0.03496426,-0.0010469411,-0.029846763,0.011800438,-0.05139746,0.028130336,-0.036013186,-0.018928379,0.037952114,-0.008319905,0.015519364,0.096310645,-0.004394372,-0.0058207544,0.0019210477,-0.022408912,-0.0017660925,-0.040749256,-0.034137834,-0.02374391,0.07851066,-0.054830316,-0.027876051,-0.029385872,-0.030339442,0.014565793,0.021773199,0.03591783,0.017656952,0.022996947,0.005014193,-0.01648088,0.020072663,0.045898538,0.058581028,-0.07030995,0.0088841,0.015892845,-0.010687939,-0.0029918281,-0.02552391,-0.03747533,0.078319944,-0.05311389,0.026684087,-0.032183014,-0.005117496,-0.027160874,0.038174614,0.049108893,-0.034678187,0.022949269,0.003768591,-0.055942815,-0.0052168267,-0.004525488,-0.016091507,0.028607123,-0.018022487,0.018705878,0.035091404,-0.0297673,0.03830176,-0.00027514488,0.051747106,0.052033175,0.02434784,0.007815307,0.016973559,-0.039636757,0.009090708,0.0065716915,0.027065516,0.008590083,-0.0057532103,-0.037125688,0.0021852662,-0.011720974,0.043260325,0.020056771,0.05902603,-0.0804178,0.009940974,-0.0033970957,-0.031531405,-0.0067544593,-0.009289368,-0.017943023,-0.012046777,0.02580998,-0.017513916,0.020771949,0.023839269,-0.03283462,-0.0064882543,-0.013500973,-0.013739365,0.0295448,-0.026159624,0.015718024,0.007211379,-0.023728019,-0.0012316955,-0.04847318,0.009225797,-0.026270874,0.035250332,-0.017053023,-0.012213652,0.029862657,0.03238962,0.01206267,-0.012110348,-0.044595324,-0.017847665,0.016170971,0.016210703,-0.035154976,-0.01334999,0.027574087,-0.035313904,-0.008423208,-0.021185163,-0.0036394617,-0.0071319146,0.010425706,-0.03461462,-0.016004095,0.034900688,-0.045548894,0.03436033,-0.020168021,-0.04453175,0.018006593,-0.00924169,0.007441825,-0.014247936,0.037125688,0.028893193,-0.027764801,-0.055752102,0.015066418,0.04742425,0.0012495749,0.029973907,-0.02161427,0.00445397,-0.019166771,-0.031372476,-0.052668888,-0.043673538,-0.016290167,-0.020454092,-0.09510279,-0.031118192,0.025714625,0.019913735,-0.017466238,0.0058366475,-0.010028386,-0.02898855,0.047201753,0.0008984424,0.04926782,-0.008661601,-0.02636623,-0.023918733,0.0012803674,0.0065677185,0.005355889,-0.02960837,-0.0153524885,0.034551047,-0.035663545,0.037570685,-0.012841419,-0.0043546394,-0.009432403,-0.0012555348,-0.02832105,-0.025682839,0.026747659,0.006373031,-0.016782844,0.012229545,0.005192987,0.019023737,-0.0016329898,0.050634604,-0.012873204,0.021646056,-0.019421058,0.012587134,0.028305158,0.024173018,-0.008701333,-0.0045771394,0.06674995,-0.017641058,0.017688736,0.017784094,0.024586232,0.0042751753,-0.024665697,0.013437401,-0.024093553,0.03188105,-0.00957544,0.012777848,0.0041599525,0.005435353,-0.00012347996,-0.006802138,-0.0119593665,0.029417656,-0.018022487,0.014788292,0.031563193,0.01117267,0.0071756197,0.03267569,-0.013620169,-0.025221946,0.027717123,-0.008669547,-0.04869568,0.024252482,0.024904089,0.021201055,0.019119093,0.015026686,-0.0075053964,-0.0049585677,0.016576238,-0.026239088,-0.0002994808,0.026795337,-0.022440698,-0.011061421,-0.0011790504,-0.044817824,0.0064048166,0.0109978495,0.013874454,-0.012491777,-0.022329448,0.012587134,-0.009448296,0.016115345,0.004195711,-0.008812583,-0.008756958,0.020787843,-0.0011432916,0.0064445487,0.004062609,0.021630162,-0.0063412455,0.017688736,-0.04434104,-0.013071866,-0.008637762,0.013445348,0.03049837,-0.0017124541,0.0022508241,-0.038778543,0.010433653,-0.0034189483,0.0010946197,-0.008605976,0.018133737,-0.05746853,0.004851291,0.011355438,0.031038728,0.0053876746,0.012412312,-0.045898538,-0.0019001884,-0.042116042,0.027415158,-0.014478383,0.012134188,0.006480308,-0.023918733,-0.022011591,0.01659213,-0.04891818,0.02089909,0.0060790135,-0.009686689,0.012722223,0.030005692,-0.0044499966,-0.021121591,0.0038460686,-0.019166771,0.012197759,-0.011228295,-0.01630606,-0.0037526982,0.0011641509,0.014541954,0.019516414,-0.025762303,-0.0072868695,-0.008383476,-0.0009088721,-0.018976057,0.004791693,-0.014494275,-0.04233854,0.0016687488,0.024220696,-0.004322854,0.018626414,0.02825748,0.014812132,0.013779097,-0.043037824,-0.018785343,0.03849247,0.023918733,0.04335568,-0.010338296,0.016337845,-0.024554446,-0.009209904,0.010028386,-0.01237258,-0.026652303,-0.00008051961,0.024474982,0.014589632,-0.038206402,0.024570338,0.01894427,0.04891818,-0.026509266,-0.025746409,-0.0038321624,-0.037411757,0.013389722,0.018467486,0.0058167814,0.056737456,0.008494725,-0.0066034775,-0.012722223,-0.031912833,-0.0564196,-0.046025682,0.038015686,-0.04338747,-0.01748213,-0.028416408,-0.07126352,-0.015209453,0.015805434,0.0058326744,0.0035043724,0.0075649945,0.002971962,0.0016528559,0.016512666,0.016862309,0.0211057,0.00868544,-0.015956417,0.008208655,-0.022027483,0.016226595,-0.0052446392,-0.0047797733,0.018515166,-0.0058763796,-0.013540705,-0.038460687,0.017561594,-0.017625166,-0.017958915,-0.013421508,-0.034042474,-0.0018256906,0.011856062,-0.004529461,0.00054432993,-0.0032858457,-0.0044897287,-0.013222847,-0.015074364,0.003516292,-0.013365883,-0.00011491272,-0.033216048,-0.010012493,-0.0076206196,0.02050177,-0.02161427,0.011498474,0.016798738,-0.05161996,0.014708828,-0.0031527432,-0.015908739,-0.02943355,-0.030927477,0.035472833,-0.018562844,0.013342043,0.031404264,0.004970487,0.044881396,0.011562045,-0.002433592,0.016957667,-0.03138837,-0.042147826,-0.021137485,-0.019182665,-0.0068339235,-0.011117046,-0.04049497,0.012952669,0.011077314,-0.022313556,-0.0016190836,-0.013254633,-0.016719274,-0.024967661,0.03407426,0.027303908,0.017275523,-0.011490528,0.00037944168,0.019087307,-0.0033970957,0.013437401,-0.0066908877,-0.026016587,-0.00046312745,-0.006051201,0.01787945,-0.0039036802,0.0023064492,0.025873553,0.0062419153,-0.0024455115,-0.06662281,0.008296065,-0.018292665,-0.'... 9275 more characters,
    0.05,
    10
  ],
  err: error: could not determine data type of parameter $4
      at async query (src/lib/db.ts:48:16)
      at async SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:251:21)
      at async eval (src/app/api/search/posts/semantic/route.ts:71:20)
      at async eval (src/lib/middleware/authEnhanced.ts:96:13)
      at async eval (src/lib/withAuth.ts:80:13)
      at async eval (src/lib/middleware/authEnhanced.ts:123:13)
    46 |   const client = await getPool().connect();
    47 |   try {
  > 48 |     const res = await client.query(text, values);
       |                ^
    49 |     const duration = Date.now() - start;
    50 |     console.log('executed query', { text, duration, rows: res.rowCount });
    51 |     return res; {
    length: 124,
    severity: 'ERROR',
    code: '42P18',
    detail: undefined,
    hint: undefined,
    position: undefined,
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'postgres.c',
    line: '742',
    routine: 'pg_analyze_and_rewrite_varparams'
  }
}
[SemanticSearchService] Semantic search failed: error: could not determine data type of parameter $4
    at async query (src/lib/db.ts:48:16)
    at async SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:251:21)
    at async eval (src/app/api/search/posts/semantic/route.ts:71:20)
    at async eval (src/lib/middleware/authEnhanced.ts:96:13)
    at async eval (src/lib/withAuth.ts:80:13)
    at async eval (src/lib/middleware/authEnhanced.ts:123:13)
  46 |   const client = await getPool().connect();
  47 |   try {
> 48 |     const res = await client.query(text, values);
     |                ^
  49 |     const duration = Date.now() - start;
  50 |     console.log('executed query', { text, duration, rows: res.rowCount });
  51 |     return res; {
  length: 124,
  severity: 'ERROR',
  code: '42P18',
  detail: undefined,
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'postgres.c',
  line: '742',
  routine: 'pg_analyze_and_rewrite_varparams'
}
[Semantic Search API] Error: Error [ValidationError]: Semantic search failed
    at SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:275:12)
    at async eval (src/app/api/search/posts/semantic/route.ts:71:20)
    at async eval (src/lib/middleware/authEnhanced.ts:96:13)
    at async eval (src/lib/withAuth.ts:80:13)
    at async eval (src/lib/middleware/authEnhanced.ts:123:13)
  273 |         throw error;
  274 |       }
> 275 |       throw new ValidationError(
      |            ^
  276 |         'Semantic search failed',
  277 |         { originalError: error, searchQuery: searchQuery.substring(0, 100) }
  278 |       ); {
  code: 'VALIDATION_FAILED',
  statusCode: 400,
  details: [Object],
  timestamp: '2025-07-09T06:37:25.321Z',
  requestId: undefined
}
 GET /api/search/posts/semantic?q=alien 500 in 123ms
