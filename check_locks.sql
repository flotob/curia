SELECT l.id, l.name, l.gating_config FROM boards b JOIN locks l ON l.id = ANY(ARRAY(SELECT jsonb_array_elements_text(b.settings->'permissions'->'locks'->'lockIds')::integer)) WHERE b.id = 62;
