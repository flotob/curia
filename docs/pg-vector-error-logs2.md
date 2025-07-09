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
            -- Temporarily disabled threshold to see actual similarity scores
            -- AND (1 - (p.embedding <-> $3::vector)) > $4
        )
        SELECT *, 
               (similarity_score * 0.7 + boost_score * 0.3) as rank_score
        FROM semantic_results
        ORDER BY rank_score DESC
        LIMIT $5
      
[SemanticSearchService] Parameters: [
  '$1: string - 86326068-5e1f-41b4-ba39-213402bf3601',
  '$2: number - 1',
  '$3: string - [0.017108275,0.00017265347,0.012035268,-0.05093997...',
  '$4: number - 0.001',
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
    '            -- Temporarily disabled threshold to see actual similarity scores\n' +
    '            -- AND (1 - (p.embedding <-> $3::vector)) > $4\n' +
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
    '[0.017108275,0.00017265347,0.012035268,-0.050939973,-0.008688251,0.014880816,-0.041097175,0.010157674,-0.02521342,-0.02861875,0.035382755,-0.048420962,-0.017749688,0.021854741,0.023429122,0.038904704,-0.021469893,-0.018915897,0.01692168,0.008215937,-0.02521342,0.032280643,-0.006851473,0.013014883,0.01506741,0.03920792,-0.046974864,0.03176751,0.015848769,-0.0383216,-0.008280078,-0.03724869,0.035989184,-0.007912722,-0.03148762,-0.002997155,0.022216266,0.007813594,-0.019813877,-0.007871905,-0.014600926,0.007580353,0.027965672,0.015323975,0.030624626,-0.0061634104,-0.0041254614,-0.0557914,0.0007175825,0.055091675,0.042380005,0.022099644,0.05159305,0.04084061,0.05024025,0.004457831,-0.027825726,0.01428605,-0.006122593,-0.006991418,-0.008180951,-0.051359806,-0.033306904,0.012630034,-0.0012777268,0.0019723496,-0.0006067927,0.011714561,-0.034473114,0.007317956,-0.04312638,0.030158143,-0.04958717,0.004373281,-0.06222887,0.0121169025,0.009755331,-0.0039855163,0.021283299,-0.038111683,-0.020980084,0.0149041405,0.010385084,0.028665397,-0.03983767,-0.004880581,-0.031557593,0.02156319,0.016665114,-0.005807717,-0.08130804,-0.04543547,-0.021551527,-0.029994873,0.01002939,-0.015160706,-0.052479368,0.0037960075,0.04347624,0.00571442,0.027942348,0.018787613,0.050566785,-0.014181091,-0.008326726,0.013644636,-0.01086906,-0.01680506,-0.043662835,0.029388446,0.008758224,-0.017294867,-0.0142044155,-0.0038222473,0.010332604,0.003562766,0.038065035,-0.050100304,0.0073296186,0.011288895,-0.01674675,0.008373375,-0.012175214,0.00823343,0.029271824,0.01809955,-0.024606992,-0.028362183,-0.0022828525,0.018636007,0.009708683,-0.055931345,-0.010670804,-0.033633444,0.0016589311,0.018531049,0.0142160775,0.0048834966,-0.0071780114,-0.002207049,0.019883849,0.0045511276,0.012501752,-0.03731866,-0.0368755,0.012700007,-0.012350145,0.0696926,-0.08569298,0.021948038,-0.041610308,-0.0080118505,0.013423056,-0.00076022197,0.0071546873,-0.011516306,0.00095191743,0.03804171,-0.006571583,0.07431079,0.024886882,-0.029948225,0.024373751,-0.026682843,0.0012850156,-0.002456326,-0.039464485,0.029831605,-0.0053266557,0.022437844,-0.050380193,-0.002226,0.030274764,0.02801232,0.018076226,0.011498813,0.081168085,-0.01607035,-0.044455856,-0.0086707575,0.0040700664,0.03993097,0.0334935,-0.035266135,-0.002832428,-0.02745254,-0.012070254,0.022904329,0.028058968,0.050613433,0.008087654,0.000129194,0.046088547,0.054112058,0.012874939,-0.036968797,-0.009836966,0.01131805,-0.02078183,0.034356494,0.010245139,-0.03848487,-0.035942536,-0.032957043,-0.023569068,0.03444979,-0.037668522,0.018192848,0.019743904,-0.066473864,0.024373751,-0.02745254,0.0055948836,-0.010385084,-0.056211233,0.02072352,0.09852127,0.008145964,0.025679903,-0.006519104,-0.0155922035,0.015977051,0.026193036,-0.012245186,0.042939786,0.03731866,0.016151983,-0.0046415087,-0.04846761,-0.03584924,0.024303779,-0.024606992,-0.04130709,0.032583855,-0.0000011303337,0.053365685,-0.07962869,-0.008717407,-0.01552223,0.011329712,-0.057610683,-0.055604804,0.0529925,0.05219948,0.019417366,0.05322574,0.021073382,0.020770168,-0.021656485,0.06026964,0.00071539584,0.064328045,-0.00092203333,0.01776135,-0.008431685,0.0039738542,-0.026916085,0.04088726,0.011160612,-0.0013608192,-0.04415264,-0.029271824,-0.028898638,0.002285768,-0.02032701,-0.04203014,-0.020047119,-0.019137476,0.011545461,-0.02358073,0.006268369,0.028898638,-0.02521342,0.006419976,-0.015452258,0.013318097,0.06829315,-0.0057727303,-0.058590297,0.049447227,0.022939315,-0.011160612,0.026029766,0.00924803,0.02101507,0.0066882037,0.023055935,-0.03188413,-0.012431779,0.030601302,0.028058968,-0.00034476028,-0.0074987183,-0.05929002,-0.018286144,0.016035363,-0.014111119,-0.02324253,-0.032070726,-0.05075338,0.043942723,0.057843924,-0.019032517,-0.02005878,-0.021423245,0.044199288,0.013563001,0.056164585,0.017224895,-0.022566129,0.023230867,-0.0045073945,-0.030997813,-0.021796431,-0.013423056,-0.04940058,-0.03232729,0.026426278,0.028478803,0.00044024357,0.00096503727,-0.023312502,0.0043324633,0.0134930285,0.019650608,0.0024606993,-0.036035832,-0.009160565,-0.017598081,0.020233711,-0.0272193,0.0125484,0.025446663,0.054951727,-0.017959606,-0.027475864,0.050380193,-0.007312125,-0.03209405,0.040094238,0.0149041405,-0.0222979,-0.03053133,0.018717641,-0.03860149,-0.006122593,0.020233711,0.004868919,-0.018134536,-0.023825632,0.019149138,-0.022204604,-0.009877783,-0.014029484,0.021994686,-0.017551433,-0.024327103,-0.030857868,-0.01316649,-0.0045132255,-0.0009533752,-0.035709295,-0.031277705,-0.027405892,0.006134255,0.016443536,-0.008997296,0.016233617,0.0064957794,0.050520137,-0.015895417,0.028968612,-0.038858056,-0.045622062,0.018484399,0.025586607,-0.032793775,0.027988996,0.014251064,0.01310818,-0.0024184242,0.025166772,-0.0100585455,-0.0113996845,-0.044269264,0.006583245,-0.025843173,-0.01758642,0.054578543,0.0037114576,-0.020513602,-0.018157862,0.009644542,0.016140321,0.026636194,-0.0019242435,0.01646686,0.051406458,-0.03081122,0.010449225,-0.0054257833,-0.012595048,-0.009323834,0.05663107,-0.008787379,-0.020420305,-0.016151983,-0.0061925654,-0.0051342314,-0.050100304,0.009382145,-0.016478522,0.022892667,0.019475676,0.018192848,0.006134255,-0.043149702,-0.015918741,0.013597988,0.008594954,0.053085797,-0.00756286,0.0050205262,-0.015300651,0.05658442,0.062042274,-0.02296264,-0.014029484,0.02985493,0.048980743,-0.011906985,-0.02022205,-0.021703133,0.014577602,-0.0835938,-0.039744373,-0.058123816,0.0334002,0.045342173,-0.001817827,0.0018615598,0.00101533,0.040677343,-0.0066298936,-0.0010474008,-0.022892667,0.046065222,0.0006880628,0.017609743,0.010455056,0.030181468,-0.0017230726,0.006851473,-0.010804919,0.06754678,-0.0012507583,0.022134632,0.0051954575,-0.01876429,-0.010676635,0.0023703182,-0.024023889,-0.0021487386,-0.0079477085,-0.01955731,0.0010087701,0.0024446638,-0.017656391,0.007236322,-0.00088267383,-0.043103054,-0.028408831,0.005836872,-0.031697538,-0.0046910723,0.006110931,0.04732473,-0.0010371964,-0.0033732571,-0.012758317,-0.0135280145,0.0014657779,-0.0571442,0.01876429,-0.014157767,0.033260256,0.0067581763,-0.0061867344,-0.04151701,-0.014251064,-0.01120726,0.021096706,0.0012165009,-0.009941924,0.018017916,-0.009796149,-0.01798293,-0.024560343,-0.01832113,-0.038741436,0.016758412,0.032233994,-0.0005568644,0.021761445,0.04123712,0.023370812,-0.022741059,0.0012893889,0.030274764,0.00683398,0.054578543,-0.008863182,0.0071546873,-0.016653452,-0.0100643765,-0.019242436,0.0070613907,-0.0074870563,-0.003058381,-0.01944069,0.0093646515,-0.061529145,0.000017982838,-0.0066532176,0.0079535395,-0.00806433,-0.003519033,-0.037015446,0.026682843,-0.02952839,0.016560156,-0.056817662,-0.050146952,0.01366796,-0.0017391079,-0.0003075874,0.011335543,0.01540561,-0.002613764,-0.010577508,-0.011108133,0.007026404,-0.032747127,-0.0039476147,0.009650373,0.02178477,0.014379347,0.004072982,-0.015358961,0.01921911,-0.0122102,0.022052996,0.009440456,0.00509633,0.025539959,0.0062450445,0.02112003,0.044292588,-0.01944069,-0.009049775,0.004486986,0.017726364,0.037178718,-0.025283393,0.018799275,0.007317956,-0.040420774,0.012641696,-0.022531142,0.027242623,0.045295525,0.023837294,0.03479965,0.007265477,0.021364933,0.028222239,0.024023889,-0.0028470056,0.0058631115,0.022216266,0.012315159,-0.000016001197,-0.01546392,-0.008880675,-0.014869154,0.009976911,0.0054928404,0.022974301,-0.014612588,-0.04508561,0.018414427,0.01720157,-0.000501834,-0.00963288,-0.018122874,-0.063628316,-0.03428652,-0.04403602,-0.023277516,-0.007685312,-0.02028036,-0.023662364,0.029924901,0.002795984,-0.028315535,-0.026169712,0.01260671,0.00012436516,0.013819567,0.0071721803,0.014344361,0.058123816,0.011358867,-0.03720204,-0.03249056,0.006256707,-0.041213796,-0.008834027,-0.027475864,0.009842797,-0.034659706,-0.030694598,0.0005204204,0.012595048,-0.0029854928,0.015172368,-0.0034694693,-0.03361012,-0.0070905457,0.055604804,0.041260444,0.030881193,0.02784905,-0.009813642,0.0034490607,-0.012769979,0.011125626,0.008583292,-0.015650515,0.0017186992,0.02661287,-0.00003840287,0.017656391,-0.011510475,0.031277705,0.023230867,-0.016548494,0.010414239,-0.00509633,0.029038584,0.061809033,0.007924384,-0.001580212,0.007743622,0.020525264,0.006110931,-0.0057902234,0.0053587267,0.006973925,0.0368755,0.026146388,0.044175964,0.030274764,-0.033260256,0.02672949,0.0355227,-0.024070537,-0.00147088,-0.0024344595,0.003994263,0.04475907,0.010839905,0.015918741,0.03148762,0.11176939,-0.021003408,0.01904418,-0.028875314,0.048747502,0.040677343,-0.025353367,-0.034543086,-0.03333023,-0.0250968,0.0013039665,-0.009038113,-0.021306623,-0.022869343,-0.009901107,-0.01792462,-0.03256053,-0.0069331075,0.023790646,0.04056072,0.014647574,-0.03293372,0.016198631,-0.019452352,0.0066415556,-0.004693988,0.0038076697,-0.0044170134,-0.015557217,-0.028268887,-0.055977993,0.021434907,-0.0074695633,-0.021318285,0.020361995,-0.006816487,0.014787519,-0.019417366,-0.041143823,-0.02885199,0.04312638,-0.0368755,-0.0053733042,-0.032700475,0.016093673,-0.019790553,0.008315064,-0.027056029,-0.024023889,-0.014880816,-0.041027203,-0.038578168,-0.0244204,-0.004347041,-0.0063383416,-0.006997249,0.015895417,0.021003408,-0.010355929,-0.03540608,0.0046415087,-0.019417366,-0.020478616,0.010495873,-0.017877972,-0.013889539,0.01865933,-0.03752858,-0.014880816,-0.014729209,-0.023930592,0.002644377,-0.006023465,0.011329712,-0.0086416025,0.004072982,-0.0014446403,0.005175049,0.03640902,-0.026286332,-0.010909878,-0.057284147,-0.025983118,-0.015662177,0.035149515,0.021131692,0.023767322,-0.01137636,-0.013563001,-0.018974207,-0.0100643765,0.0170383,0.0114113465,0.022379534,-0.0062742,-0.014344361,-0.004291646,-0.031091109,-0.0073529426,0.021586513,-0.025166772,-0.015195693,-0.010023559,-0.0023426206,0.0035860902,0.019184124,0.0011108132,-0.020466954,-0.01865933,0.024606992,-0.040700667,-0.014764195,0.011498813,-0.025679903,0.0073995907,-0.0024300863,-0.019230772,0.062322166,-0.028805342,-0.031814158,0.017784674,-0.0155922035,0.03013482,0.012466765,0.0055045024,0.009609555,-0.009662035,-0.006519104'... 9192 more characters,
    0.001,
    10
  ],
  err: error: could not determine data type of parameter $4
      at async query (src/lib/db.ts:48:16)
      at async SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:252:21)
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
    at async SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:252:21)
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
    at SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:281:12)
    at async eval (src/app/api/search/posts/semantic/route.ts:71:20)
    at async eval (src/lib/middleware/authEnhanced.ts:96:13)
    at async eval (src/lib/withAuth.ts:80:13)
    at async eval (src/lib/middleware/authEnhanced.ts:123:13)
  279 |         throw error;
  280 |       }
> 281 |       throw new ValidationError(
      |            ^
  282 |         'Semantic search failed',
  283 |         { originalError: error, searchQuery: searchQuery.substring(0, 100) }
  284 |       ); {
  code: 'VALIDATION_FAILED',
  statusCode: 400,
  details: [Object],
  timestamp: '2025-07-09T06:58:55.817Z',
  requestId: undefined
}
 GET /api/search/posts/semantic?q=saxophone 500 in 2509ms
[withAuth] Token verified successfully. Decoded exp: 1752047916 Current time: 1752044336
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
  duration: 2,
  rows: 1
}
[SemanticSearchService] Executing semantic search: {
  searchQuery: 'saxophone',
  accessibleBoardIds: [ 1 ],
  threshold: 0.001,
  limit: 10,
  embeddingLength: 1536,
  includeUserVoting: true,
  userId: '86326068-5e1f-41b4-ba39-213402bf3601',
  paramsLength: 5,
  paramsStructure: [
    '$1: string 86326068-5e1f-41b4-b',
    '$2: number 1',
    '$3: string [0.017108275,0.00017',
    '$4: number 0.001',
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
            -- Temporarily disabled threshold to see actual similarity scores
            -- AND (1 - (p.embedding <-> $3::vector)) > $4
        )
        SELECT *, 
               (similarity_score * 0.7 + boost_score * 0.3) as rank_score
        FROM semantic_results
        ORDER BY rank_score DESC
        LIMIT $5
      
[SemanticSearchService] Parameters: [
  '$1: string - 86326068-5e1f-41b4-ba39-213402bf3601',
  '$2: number - 1',
  '$3: string - [0.017108275,0.00017265347,0.012035268,-0.05093997...',
  '$4: number - 0.001',
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
    '            -- Temporarily disabled threshold to see actual similarity scores\n' +
    '            -- AND (1 - (p.embedding <-> $3::vector)) > $4\n' +
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
    '[0.017108275,0.00017265347,0.012035268,-0.050939973,-0.008688251,0.014880816,-0.041097175,0.010157674,-0.02521342,-0.02861875,0.035382755,-0.048420962,-0.017749688,0.021854741,0.023429122,0.038904704,-0.021469893,-0.018915897,0.01692168,0.008215937,-0.02521342,0.032280643,-0.006851473,0.013014883,0.01506741,0.03920792,-0.046974864,0.03176751,0.015848769,-0.0383216,-0.008280078,-0.03724869,0.035989184,-0.007912722,-0.03148762,-0.002997155,0.022216266,0.007813594,-0.019813877,-0.007871905,-0.014600926,0.007580353,0.027965672,0.015323975,0.030624626,-0.0061634104,-0.0041254614,-0.0557914,0.0007175825,0.055091675,0.042380005,0.022099644,0.05159305,0.04084061,0.05024025,0.004457831,-0.027825726,0.01428605,-0.006122593,-0.006991418,-0.008180951,-0.051359806,-0.033306904,0.012630034,-0.0012777268,0.0019723496,-0.0006067927,0.011714561,-0.034473114,0.007317956,-0.04312638,0.030158143,-0.04958717,0.004373281,-0.06222887,0.0121169025,0.009755331,-0.0039855163,0.021283299,-0.038111683,-0.020980084,0.0149041405,0.010385084,0.028665397,-0.03983767,-0.004880581,-0.031557593,0.02156319,0.016665114,-0.005807717,-0.08130804,-0.04543547,-0.021551527,-0.029994873,0.01002939,-0.015160706,-0.052479368,0.0037960075,0.04347624,0.00571442,0.027942348,0.018787613,0.050566785,-0.014181091,-0.008326726,0.013644636,-0.01086906,-0.01680506,-0.043662835,0.029388446,0.008758224,-0.017294867,-0.0142044155,-0.0038222473,0.010332604,0.003562766,0.038065035,-0.050100304,0.0073296186,0.011288895,-0.01674675,0.008373375,-0.012175214,0.00823343,0.029271824,0.01809955,-0.024606992,-0.028362183,-0.0022828525,0.018636007,0.009708683,-0.055931345,-0.010670804,-0.033633444,0.0016589311,0.018531049,0.0142160775,0.0048834966,-0.0071780114,-0.002207049,0.019883849,0.0045511276,0.012501752,-0.03731866,-0.0368755,0.012700007,-0.012350145,0.0696926,-0.08569298,0.021948038,-0.041610308,-0.0080118505,0.013423056,-0.00076022197,0.0071546873,-0.011516306,0.00095191743,0.03804171,-0.006571583,0.07431079,0.024886882,-0.029948225,0.024373751,-0.026682843,0.0012850156,-0.002456326,-0.039464485,0.029831605,-0.0053266557,0.022437844,-0.050380193,-0.002226,0.030274764,0.02801232,0.018076226,0.011498813,0.081168085,-0.01607035,-0.044455856,-0.0086707575,0.0040700664,0.03993097,0.0334935,-0.035266135,-0.002832428,-0.02745254,-0.012070254,0.022904329,0.028058968,0.050613433,0.008087654,0.000129194,0.046088547,0.054112058,0.012874939,-0.036968797,-0.009836966,0.01131805,-0.02078183,0.034356494,0.010245139,-0.03848487,-0.035942536,-0.032957043,-0.023569068,0.03444979,-0.037668522,0.018192848,0.019743904,-0.066473864,0.024373751,-0.02745254,0.0055948836,-0.010385084,-0.056211233,0.02072352,0.09852127,0.008145964,0.025679903,-0.006519104,-0.0155922035,0.015977051,0.026193036,-0.012245186,0.042939786,0.03731866,0.016151983,-0.0046415087,-0.04846761,-0.03584924,0.024303779,-0.024606992,-0.04130709,0.032583855,-0.0000011303337,0.053365685,-0.07962869,-0.008717407,-0.01552223,0.011329712,-0.057610683,-0.055604804,0.0529925,0.05219948,0.019417366,0.05322574,0.021073382,0.020770168,-0.021656485,0.06026964,0.00071539584,0.064328045,-0.00092203333,0.01776135,-0.008431685,0.0039738542,-0.026916085,0.04088726,0.011160612,-0.0013608192,-0.04415264,-0.029271824,-0.028898638,0.002285768,-0.02032701,-0.04203014,-0.020047119,-0.019137476,0.011545461,-0.02358073,0.006268369,0.028898638,-0.02521342,0.006419976,-0.015452258,0.013318097,0.06829315,-0.0057727303,-0.058590297,0.049447227,0.022939315,-0.011160612,0.026029766,0.00924803,0.02101507,0.0066882037,0.023055935,-0.03188413,-0.012431779,0.030601302,0.028058968,-0.00034476028,-0.0074987183,-0.05929002,-0.018286144,0.016035363,-0.014111119,-0.02324253,-0.032070726,-0.05075338,0.043942723,0.057843924,-0.019032517,-0.02005878,-0.021423245,0.044199288,0.013563001,0.056164585,0.017224895,-0.022566129,0.023230867,-0.0045073945,-0.030997813,-0.021796431,-0.013423056,-0.04940058,-0.03232729,0.026426278,0.028478803,0.00044024357,0.00096503727,-0.023312502,0.0043324633,0.0134930285,0.019650608,0.0024606993,-0.036035832,-0.009160565,-0.017598081,0.020233711,-0.0272193,0.0125484,0.025446663,0.054951727,-0.017959606,-0.027475864,0.050380193,-0.007312125,-0.03209405,0.040094238,0.0149041405,-0.0222979,-0.03053133,0.018717641,-0.03860149,-0.006122593,0.020233711,0.004868919,-0.018134536,-0.023825632,0.019149138,-0.022204604,-0.009877783,-0.014029484,0.021994686,-0.017551433,-0.024327103,-0.030857868,-0.01316649,-0.0045132255,-0.0009533752,-0.035709295,-0.031277705,-0.027405892,0.006134255,0.016443536,-0.008997296,0.016233617,0.0064957794,0.050520137,-0.015895417,0.028968612,-0.038858056,-0.045622062,0.018484399,0.025586607,-0.032793775,0.027988996,0.014251064,0.01310818,-0.0024184242,0.025166772,-0.0100585455,-0.0113996845,-0.044269264,0.006583245,-0.025843173,-0.01758642,0.054578543,0.0037114576,-0.020513602,-0.018157862,0.009644542,0.016140321,0.026636194,-0.0019242435,0.01646686,0.051406458,-0.03081122,0.010449225,-0.0054257833,-0.012595048,-0.009323834,0.05663107,-0.008787379,-0.020420305,-0.016151983,-0.0061925654,-0.0051342314,-0.050100304,0.009382145,-0.016478522,0.022892667,0.019475676,0.018192848,0.006134255,-0.043149702,-0.015918741,0.013597988,0.008594954,0.053085797,-0.00756286,0.0050205262,-0.015300651,0.05658442,0.062042274,-0.02296264,-0.014029484,0.02985493,0.048980743,-0.011906985,-0.02022205,-0.021703133,0.014577602,-0.0835938,-0.039744373,-0.058123816,0.0334002,0.045342173,-0.001817827,0.0018615598,0.00101533,0.040677343,-0.0066298936,-0.0010474008,-0.022892667,0.046065222,0.0006880628,0.017609743,0.010455056,0.030181468,-0.0017230726,0.006851473,-0.010804919,0.06754678,-0.0012507583,0.022134632,0.0051954575,-0.01876429,-0.010676635,0.0023703182,-0.024023889,-0.0021487386,-0.0079477085,-0.01955731,0.0010087701,0.0024446638,-0.017656391,0.007236322,-0.00088267383,-0.043103054,-0.028408831,0.005836872,-0.031697538,-0.0046910723,0.006110931,0.04732473,-0.0010371964,-0.0033732571,-0.012758317,-0.0135280145,0.0014657779,-0.0571442,0.01876429,-0.014157767,0.033260256,0.0067581763,-0.0061867344,-0.04151701,-0.014251064,-0.01120726,0.021096706,0.0012165009,-0.009941924,0.018017916,-0.009796149,-0.01798293,-0.024560343,-0.01832113,-0.038741436,0.016758412,0.032233994,-0.0005568644,0.021761445,0.04123712,0.023370812,-0.022741059,0.0012893889,0.030274764,0.00683398,0.054578543,-0.008863182,0.0071546873,-0.016653452,-0.0100643765,-0.019242436,0.0070613907,-0.0074870563,-0.003058381,-0.01944069,0.0093646515,-0.061529145,0.000017982838,-0.0066532176,0.0079535395,-0.00806433,-0.003519033,-0.037015446,0.026682843,-0.02952839,0.016560156,-0.056817662,-0.050146952,0.01366796,-0.0017391079,-0.0003075874,0.011335543,0.01540561,-0.002613764,-0.010577508,-0.011108133,0.007026404,-0.032747127,-0.0039476147,0.009650373,0.02178477,0.014379347,0.004072982,-0.015358961,0.01921911,-0.0122102,0.022052996,0.009440456,0.00509633,0.025539959,0.0062450445,0.02112003,0.044292588,-0.01944069,-0.009049775,0.004486986,0.017726364,0.037178718,-0.025283393,0.018799275,0.007317956,-0.040420774,0.012641696,-0.022531142,0.027242623,0.045295525,0.023837294,0.03479965,0.007265477,0.021364933,0.028222239,0.024023889,-0.0028470056,0.0058631115,0.022216266,0.012315159,-0.000016001197,-0.01546392,-0.008880675,-0.014869154,0.009976911,0.0054928404,0.022974301,-0.014612588,-0.04508561,0.018414427,0.01720157,-0.000501834,-0.00963288,-0.018122874,-0.063628316,-0.03428652,-0.04403602,-0.023277516,-0.007685312,-0.02028036,-0.023662364,0.029924901,0.002795984,-0.028315535,-0.026169712,0.01260671,0.00012436516,0.013819567,0.0071721803,0.014344361,0.058123816,0.011358867,-0.03720204,-0.03249056,0.006256707,-0.041213796,-0.008834027,-0.027475864,0.009842797,-0.034659706,-0.030694598,0.0005204204,0.012595048,-0.0029854928,0.015172368,-0.0034694693,-0.03361012,-0.0070905457,0.055604804,0.041260444,0.030881193,0.02784905,-0.009813642,0.0034490607,-0.012769979,0.011125626,0.008583292,-0.015650515,0.0017186992,0.02661287,-0.00003840287,0.017656391,-0.011510475,0.031277705,0.023230867,-0.016548494,0.010414239,-0.00509633,0.029038584,0.061809033,0.007924384,-0.001580212,0.007743622,0.020525264,0.006110931,-0.0057902234,0.0053587267,0.006973925,0.0368755,0.026146388,0.044175964,0.030274764,-0.033260256,0.02672949,0.0355227,-0.024070537,-0.00147088,-0.0024344595,0.003994263,0.04475907,0.010839905,0.015918741,0.03148762,0.11176939,-0.021003408,0.01904418,-0.028875314,0.048747502,0.040677343,-0.025353367,-0.034543086,-0.03333023,-0.0250968,0.0013039665,-0.009038113,-0.021306623,-0.022869343,-0.009901107,-0.01792462,-0.03256053,-0.0069331075,0.023790646,0.04056072,0.014647574,-0.03293372,0.016198631,-0.019452352,0.0066415556,-0.004693988,0.0038076697,-0.0044170134,-0.015557217,-0.028268887,-0.055977993,0.021434907,-0.0074695633,-0.021318285,0.020361995,-0.006816487,0.014787519,-0.019417366,-0.041143823,-0.02885199,0.04312638,-0.0368755,-0.0053733042,-0.032700475,0.016093673,-0.019790553,0.008315064,-0.027056029,-0.024023889,-0.014880816,-0.041027203,-0.038578168,-0.0244204,-0.004347041,-0.0063383416,-0.006997249,0.015895417,0.021003408,-0.010355929,-0.03540608,0.0046415087,-0.019417366,-0.020478616,0.010495873,-0.017877972,-0.013889539,0.01865933,-0.03752858,-0.014880816,-0.014729209,-0.023930592,0.002644377,-0.006023465,0.011329712,-0.0086416025,0.004072982,-0.0014446403,0.005175049,0.03640902,-0.026286332,-0.010909878,-0.057284147,-0.025983118,-0.015662177,0.035149515,0.021131692,0.023767322,-0.01137636,-0.013563001,-0.018974207,-0.0100643765,0.0170383,0.0114113465,0.022379534,-0.0062742,-0.014344361,-0.004291646,-0.031091109,-0.0073529426,0.021586513,-0.025166772,-0.015195693,-0.010023559,-0.0023426206,0.0035860902,0.019184124,0.0011108132,-0.020466954,-0.01865933,0.024606992,-0.040700667,-0.014764195,0.011498813,-0.025679903,0.0073995907,-0.0024300863,-0.019230772,0.062322166,-0.028805342,-0.031814158,0.017784674,-0.0155922035,0.03013482,0.012466765,0.0055045024,0.009609555,-0.009662035,-0.006519104'... 9192 more characters,
    0.001,
    10
  ],
  err: error: could not determine data type of parameter $4
      at async query (src/lib/db.ts:48:16)
      at async SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:252:21)
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
    at async SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:252:21)
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
    at SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:281:12)
    at async eval (src/app/api/search/posts/semantic/route.ts:71:20)
    at async eval (src/lib/middleware/authEnhanced.ts:96:13)
    at async eval (src/lib/withAuth.ts:80:13)
    at async eval (src/lib/middleware/authEnhanced.ts:123:13)
  279 |         throw error;
  280 |       }
> 281 |       throw new ValidationError(
      |            ^
  282 |         'Semantic search failed',
  283 |         { originalError: error, searchQuery: searchQuery.substring(0, 100) }
  284 |       ); {
  code: 'VALIDATION_FAILED',
  statusCode: 400,
  details: [Object],
  timestamp: '2025-07-09T06:58:57.015Z',
  requestId: undefined
}
 GET /api/search/posts/semantic?q=saxophone 500 in 131ms
[withAuth] Token verified successfully. Decoded exp: 1752047916 Current time: 1752044339
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
  duration: 2,
  rows: 1
}
[SemanticSearchService] Executing semantic search: {
  searchQuery: 'saxophone',
  accessibleBoardIds: [ 1 ],
  threshold: 0.001,
  limit: 10,
  embeddingLength: 1536,
  includeUserVoting: true,
  userId: '86326068-5e1f-41b4-ba39-213402bf3601',
  paramsLength: 5,
  paramsStructure: [
    '$1: string 86326068-5e1f-41b4-b',
    '$2: number 1',
    '$3: string [0.017108275,0.00017',
    '$4: number 0.001',
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
            -- Temporarily disabled threshold to see actual similarity scores
            -- AND (1 - (p.embedding <-> $3::vector)) > $4
        )
        SELECT *, 
               (similarity_score * 0.7 + boost_score * 0.3) as rank_score
        FROM semantic_results
        ORDER BY rank_score DESC
        LIMIT $5
      
[SemanticSearchService] Parameters: [
  '$1: string - 86326068-5e1f-41b4-ba39-213402bf3601',
  '$2: number - 1',
  '$3: string - [0.017108275,0.00017265347,0.012035268,-0.05093997...',
  '$4: number - 0.001',
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
    '            -- Temporarily disabled threshold to see actual similarity scores\n' +
    '            -- AND (1 - (p.embedding <-> $3::vector)) > $4\n' +
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
    '[0.017108275,0.00017265347,0.012035268,-0.050939973,-0.008688251,0.014880816,-0.041097175,0.010157674,-0.02521342,-0.02861875,0.035382755,-0.048420962,-0.017749688,0.021854741,0.023429122,0.038904704,-0.021469893,-0.018915897,0.01692168,0.008215937,-0.02521342,0.032280643,-0.006851473,0.013014883,0.01506741,0.03920792,-0.046974864,0.03176751,0.015848769,-0.0383216,-0.008280078,-0.03724869,0.035989184,-0.007912722,-0.03148762,-0.002997155,0.022216266,0.007813594,-0.019813877,-0.007871905,-0.014600926,0.007580353,0.027965672,0.015323975,0.030624626,-0.0061634104,-0.0041254614,-0.0557914,0.0007175825,0.055091675,0.042380005,0.022099644,0.05159305,0.04084061,0.05024025,0.004457831,-0.027825726,0.01428605,-0.006122593,-0.006991418,-0.008180951,-0.051359806,-0.033306904,0.012630034,-0.0012777268,0.0019723496,-0.0006067927,0.011714561,-0.034473114,0.007317956,-0.04312638,0.030158143,-0.04958717,0.004373281,-0.06222887,0.0121169025,0.009755331,-0.0039855163,0.021283299,-0.038111683,-0.020980084,0.0149041405,0.010385084,0.028665397,-0.03983767,-0.004880581,-0.031557593,0.02156319,0.016665114,-0.005807717,-0.08130804,-0.04543547,-0.021551527,-0.029994873,0.01002939,-0.015160706,-0.052479368,0.0037960075,0.04347624,0.00571442,0.027942348,0.018787613,0.050566785,-0.014181091,-0.008326726,0.013644636,-0.01086906,-0.01680506,-0.043662835,0.029388446,0.008758224,-0.017294867,-0.0142044155,-0.0038222473,0.010332604,0.003562766,0.038065035,-0.050100304,0.0073296186,0.011288895,-0.01674675,0.008373375,-0.012175214,0.00823343,0.029271824,0.01809955,-0.024606992,-0.028362183,-0.0022828525,0.018636007,0.009708683,-0.055931345,-0.010670804,-0.033633444,0.0016589311,0.018531049,0.0142160775,0.0048834966,-0.0071780114,-0.002207049,0.019883849,0.0045511276,0.012501752,-0.03731866,-0.0368755,0.012700007,-0.012350145,0.0696926,-0.08569298,0.021948038,-0.041610308,-0.0080118505,0.013423056,-0.00076022197,0.0071546873,-0.011516306,0.00095191743,0.03804171,-0.006571583,0.07431079,0.024886882,-0.029948225,0.024373751,-0.026682843,0.0012850156,-0.002456326,-0.039464485,0.029831605,-0.0053266557,0.022437844,-0.050380193,-0.002226,0.030274764,0.02801232,0.018076226,0.011498813,0.081168085,-0.01607035,-0.044455856,-0.0086707575,0.0040700664,0.03993097,0.0334935,-0.035266135,-0.002832428,-0.02745254,-0.012070254,0.022904329,0.028058968,0.050613433,0.008087654,0.000129194,0.046088547,0.054112058,0.012874939,-0.036968797,-0.009836966,0.01131805,-0.02078183,0.034356494,0.010245139,-0.03848487,-0.035942536,-0.032957043,-0.023569068,0.03444979,-0.037668522,0.018192848,0.019743904,-0.066473864,0.024373751,-0.02745254,0.0055948836,-0.010385084,-0.056211233,0.02072352,0.09852127,0.008145964,0.025679903,-0.006519104,-0.0155922035,0.015977051,0.026193036,-0.012245186,0.042939786,0.03731866,0.016151983,-0.0046415087,-0.04846761,-0.03584924,0.024303779,-0.024606992,-0.04130709,0.032583855,-0.0000011303337,0.053365685,-0.07962869,-0.008717407,-0.01552223,0.011329712,-0.057610683,-0.055604804,0.0529925,0.05219948,0.019417366,0.05322574,0.021073382,0.020770168,-0.021656485,0.06026964,0.00071539584,0.064328045,-0.00092203333,0.01776135,-0.008431685,0.0039738542,-0.026916085,0.04088726,0.011160612,-0.0013608192,-0.04415264,-0.029271824,-0.028898638,0.002285768,-0.02032701,-0.04203014,-0.020047119,-0.019137476,0.011545461,-0.02358073,0.006268369,0.028898638,-0.02521342,0.006419976,-0.015452258,0.013318097,0.06829315,-0.0057727303,-0.058590297,0.049447227,0.022939315,-0.011160612,0.026029766,0.00924803,0.02101507,0.0066882037,0.023055935,-0.03188413,-0.012431779,0.030601302,0.028058968,-0.00034476028,-0.0074987183,-0.05929002,-0.018286144,0.016035363,-0.014111119,-0.02324253,-0.032070726,-0.05075338,0.043942723,0.057843924,-0.019032517,-0.02005878,-0.021423245,0.044199288,0.013563001,0.056164585,0.017224895,-0.022566129,0.023230867,-0.0045073945,-0.030997813,-0.021796431,-0.013423056,-0.04940058,-0.03232729,0.026426278,0.028478803,0.00044024357,0.00096503727,-0.023312502,0.0043324633,0.0134930285,0.019650608,0.0024606993,-0.036035832,-0.009160565,-0.017598081,0.020233711,-0.0272193,0.0125484,0.025446663,0.054951727,-0.017959606,-0.027475864,0.050380193,-0.007312125,-0.03209405,0.040094238,0.0149041405,-0.0222979,-0.03053133,0.018717641,-0.03860149,-0.006122593,0.020233711,0.004868919,-0.018134536,-0.023825632,0.019149138,-0.022204604,-0.009877783,-0.014029484,0.021994686,-0.017551433,-0.024327103,-0.030857868,-0.01316649,-0.0045132255,-0.0009533752,-0.035709295,-0.031277705,-0.027405892,0.006134255,0.016443536,-0.008997296,0.016233617,0.0064957794,0.050520137,-0.015895417,0.028968612,-0.038858056,-0.045622062,0.018484399,0.025586607,-0.032793775,0.027988996,0.014251064,0.01310818,-0.0024184242,0.025166772,-0.0100585455,-0.0113996845,-0.044269264,0.006583245,-0.025843173,-0.01758642,0.054578543,0.0037114576,-0.020513602,-0.018157862,0.009644542,0.016140321,0.026636194,-0.0019242435,0.01646686,0.051406458,-0.03081122,0.010449225,-0.0054257833,-0.012595048,-0.009323834,0.05663107,-0.008787379,-0.020420305,-0.016151983,-0.0061925654,-0.0051342314,-0.050100304,0.009382145,-0.016478522,0.022892667,0.019475676,0.018192848,0.006134255,-0.043149702,-0.015918741,0.013597988,0.008594954,0.053085797,-0.00756286,0.0050205262,-0.015300651,0.05658442,0.062042274,-0.02296264,-0.014029484,0.02985493,0.048980743,-0.011906985,-0.02022205,-0.021703133,0.014577602,-0.0835938,-0.039744373,-0.058123816,0.0334002,0.045342173,-0.001817827,0.0018615598,0.00101533,0.040677343,-0.0066298936,-0.0010474008,-0.022892667,0.046065222,0.0006880628,0.017609743,0.010455056,0.030181468,-0.0017230726,0.006851473,-0.010804919,0.06754678,-0.0012507583,0.022134632,0.0051954575,-0.01876429,-0.010676635,0.0023703182,-0.024023889,-0.0021487386,-0.0079477085,-0.01955731,0.0010087701,0.0024446638,-0.017656391,0.007236322,-0.00088267383,-0.043103054,-0.028408831,0.005836872,-0.031697538,-0.0046910723,0.006110931,0.04732473,-0.0010371964,-0.0033732571,-0.012758317,-0.0135280145,0.0014657779,-0.0571442,0.01876429,-0.014157767,0.033260256,0.0067581763,-0.0061867344,-0.04151701,-0.014251064,-0.01120726,0.021096706,0.0012165009,-0.009941924,0.018017916,-0.009796149,-0.01798293,-0.024560343,-0.01832113,-0.038741436,0.016758412,0.032233994,-0.0005568644,0.021761445,0.04123712,0.023370812,-0.022741059,0.0012893889,0.030274764,0.00683398,0.054578543,-0.008863182,0.0071546873,-0.016653452,-0.0100643765,-0.019242436,0.0070613907,-0.0074870563,-0.003058381,-0.01944069,0.0093646515,-0.061529145,0.000017982838,-0.0066532176,0.0079535395,-0.00806433,-0.003519033,-0.037015446,0.026682843,-0.02952839,0.016560156,-0.056817662,-0.050146952,0.01366796,-0.0017391079,-0.0003075874,0.011335543,0.01540561,-0.002613764,-0.010577508,-0.011108133,0.007026404,-0.032747127,-0.0039476147,0.009650373,0.02178477,0.014379347,0.004072982,-0.015358961,0.01921911,-0.0122102,0.022052996,0.009440456,0.00509633,0.025539959,0.0062450445,0.02112003,0.044292588,-0.01944069,-0.009049775,0.004486986,0.017726364,0.037178718,-0.025283393,0.018799275,0.007317956,-0.040420774,0.012641696,-0.022531142,0.027242623,0.045295525,0.023837294,0.03479965,0.007265477,0.021364933,0.028222239,0.024023889,-0.0028470056,0.0058631115,0.022216266,0.012315159,-0.000016001197,-0.01546392,-0.008880675,-0.014869154,0.009976911,0.0054928404,0.022974301,-0.014612588,-0.04508561,0.018414427,0.01720157,-0.000501834,-0.00963288,-0.018122874,-0.063628316,-0.03428652,-0.04403602,-0.023277516,-0.007685312,-0.02028036,-0.023662364,0.029924901,0.002795984,-0.028315535,-0.026169712,0.01260671,0.00012436516,0.013819567,0.0071721803,0.014344361,0.058123816,0.011358867,-0.03720204,-0.03249056,0.006256707,-0.041213796,-0.008834027,-0.027475864,0.009842797,-0.034659706,-0.030694598,0.0005204204,0.012595048,-0.0029854928,0.015172368,-0.0034694693,-0.03361012,-0.0070905457,0.055604804,0.041260444,0.030881193,0.02784905,-0.009813642,0.0034490607,-0.012769979,0.011125626,0.008583292,-0.015650515,0.0017186992,0.02661287,-0.00003840287,0.017656391,-0.011510475,0.031277705,0.023230867,-0.016548494,0.010414239,-0.00509633,0.029038584,0.061809033,0.007924384,-0.001580212,0.007743622,0.020525264,0.006110931,-0.0057902234,0.0053587267,0.006973925,0.0368755,0.026146388,0.044175964,0.030274764,-0.033260256,0.02672949,0.0355227,-0.024070537,-0.00147088,-0.0024344595,0.003994263,0.04475907,0.010839905,0.015918741,0.03148762,0.11176939,-0.021003408,0.01904418,-0.028875314,0.048747502,0.040677343,-0.025353367,-0.034543086,-0.03333023,-0.0250968,0.0013039665,-0.009038113,-0.021306623,-0.022869343,-0.009901107,-0.01792462,-0.03256053,-0.0069331075,0.023790646,0.04056072,0.014647574,-0.03293372,0.016198631,-0.019452352,0.0066415556,-0.004693988,0.0038076697,-0.0044170134,-0.015557217,-0.028268887,-0.055977993,0.021434907,-0.0074695633,-0.021318285,0.020361995,-0.006816487,0.014787519,-0.019417366,-0.041143823,-0.02885199,0.04312638,-0.0368755,-0.0053733042,-0.032700475,0.016093673,-0.019790553,0.008315064,-0.027056029,-0.024023889,-0.014880816,-0.041027203,-0.038578168,-0.0244204,-0.004347041,-0.0063383416,-0.006997249,0.015895417,0.021003408,-0.010355929,-0.03540608,0.0046415087,-0.019417366,-0.020478616,0.010495873,-0.017877972,-0.013889539,0.01865933,-0.03752858,-0.014880816,-0.014729209,-0.023930592,0.002644377,-0.006023465,0.011329712,-0.0086416025,0.004072982,-0.0014446403,0.005175049,0.03640902,-0.026286332,-0.010909878,-0.057284147,-0.025983118,-0.015662177,0.035149515,0.021131692,0.023767322,-0.01137636,-0.013563001,-0.018974207,-0.0100643765,0.0170383,0.0114113465,0.022379534,-0.0062742,-0.014344361,-0.004291646,-0.031091109,-0.0073529426,0.021586513,-0.025166772,-0.015195693,-0.010023559,-0.0023426206,0.0035860902,0.019184124,0.0011108132,-0.020466954,-0.01865933,0.024606992,-0.040700667,-0.014764195,0.011498813,-0.025679903,0.0073995907,-0.0024300863,-0.019230772,0.062322166,-0.028805342,-0.031814158,0.017784674,-0.0155922035,0.03013482,0.012466765,0.0055045024,0.009609555,-0.009662035,-0.006519104'... 9192 more characters,
    0.001,
    10
  ],
  err: error: could not determine data type of parameter $4
      at async query (src/lib/db.ts:48:16)
      at async SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:252:21)
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
    at async SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:252:21)
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
    at SemanticSearchService.semanticSearch (src/services/SemanticSearchService.ts:281:12)
    at async eval (src/app/api/search/posts/semantic/route.ts:71:20)
    at async eval (src/lib/middleware/authEnhanced.ts:96:13)
    at async eval (src/lib/withAuth.ts:80:13)
    at async eval (src/lib/middleware/authEnhanced.ts:123:13)
  279 |         throw error;
  280 |       }
> 281 |       throw new ValidationError(
      |            ^
  282 |         'Semantic search failed',
  283 |         { originalError: error, searchQuery: searchQuery.substring(0, 100) }
  284 |       ); {
  code: 'VALIDATION_FAILED',
  statusCode: 400,
  details: [Object],
  timestamp: '2025-07-09T06:58:59.311Z',
  requestId: undefined
}
 GET /api/search/posts/semantic?q=saxophone 500 in 104ms
[Socket.IO] User disconnected: 86326068-5e1f-41b4-ba39-213402bf3601 (reason: transport close)
[Socket.IO Multi-Device Presence] Device W5NLV6Y7UG disconnected. Total devices: 0, Users: 1
[Socket.IO] User 86326068-5e1f-41b4-ba39-213402bf3601 went offline (no community broadcast)
