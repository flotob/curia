import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Converting existing gating configurations to locks...');

  // Enable pgcrypto extension for hash functions
  await pgm.sql(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  // Create the helper function for generating lock metadata first
  await pgm.sql(`
    CREATE OR REPLACE FUNCTION generate_lock_metadata(config JSONB)
    RETURNS TABLE(name TEXT, description TEXT)
    LANGUAGE plpgsql
    AS $$
    DECLARE
      categories JSONB;
      category JSONB;
      category_type TEXT;
      requirements JSONB;
      name_parts TEXT[] := ARRAY[]::TEXT[];
      desc_parts TEXT[] := ARRAY[]::TEXT[];
      final_name TEXT;
      final_description TEXT;
      
      -- UP-specific variables
      min_lyx_balance TEXT;
      required_tokens JSONB;
      follower_requirements JSONB;
      token_count INTEGER;
      follower_count INTEGER;
      
      -- Ethereum-specific variables
      requires_ens BOOLEAN;
      min_eth_balance TEXT;
      efp_requirements JSONB;
      erc20_tokens JSONB;
      erc721_collections JSONB;
    BEGIN
      categories := config->'categories';
      
      -- Process each category
      FOR category IN SELECT jsonb_array_elements(categories)
      LOOP
        category_type := category->>'type';
        requirements := category->'requirements';
        
        IF category_type = 'universal_profile' THEN
          -- Handle Universal Profile requirements
          min_lyx_balance := requirements->>'minLyxBalance';
          required_tokens := requirements->'requiredTokens';
          follower_requirements := requirements->'followerRequirements';
          
          -- LYX balance requirement
          IF min_lyx_balance IS NOT NULL AND min_lyx_balance != '0' THEN
            name_parts := name_parts || ARRAY['LYX'];
            desc_parts := desc_parts || ARRAY['Minimum LYX required'];
          END IF;
          
          -- Token requirements
          IF required_tokens IS NOT NULL THEN
            token_count := jsonb_array_length(required_tokens);
            IF token_count > 0 THEN
              name_parts := name_parts || ARRAY['Token'];
              desc_parts := desc_parts || ARRAY['LUKSO tokens required'];
            END IF;
          END IF;
          
          -- Follower requirements
          IF follower_requirements IS NOT NULL THEN
            follower_count := jsonb_array_length(follower_requirements);
            IF follower_count > 0 THEN
              name_parts := name_parts || ARRAY['Social'];
              desc_parts := desc_parts || ARRAY['Social requirements'];
            END IF;
          END IF;
          
        ELSIF category_type = 'ethereum_profile' THEN
          -- Handle Ethereum Profile requirements
          requires_ens := (requirements->>'requiresENS')::BOOLEAN;
          min_eth_balance := requirements->>'minimumETHBalance';
          efp_requirements := requirements->'efpRequirements';
          erc20_tokens := requirements->'requiredERC20Tokens';
          erc721_collections := requirements->'requiredERC721Collections';
          
          -- ENS requirement
          IF requires_ens THEN
            name_parts := name_parts || ARRAY['ENS'];
            desc_parts := desc_parts || ARRAY['ENS domain required'];
          END IF;
          
          -- ETH balance requirement
          IF min_eth_balance IS NOT NULL AND min_eth_balance != '0' THEN
            name_parts := name_parts || ARRAY['ETH'];
            desc_parts := desc_parts || ARRAY['Minimum ETH required'];
          END IF;
          
          -- ERC20 tokens
          IF erc20_tokens IS NOT NULL AND jsonb_array_length(erc20_tokens) > 0 THEN
            name_parts := name_parts || ARRAY['Token'];
            desc_parts := desc_parts || ARRAY['Ethereum tokens required'];
          END IF;
          
          -- NFT collections
          IF erc721_collections IS NOT NULL AND jsonb_array_length(erc721_collections) > 0 THEN
            name_parts := name_parts || ARRAY['NFT'];
            desc_parts := desc_parts || ARRAY['NFT ownership required'];
          END IF;
          
          -- EFP social requirements
          IF efp_requirements IS NOT NULL AND jsonb_array_length(efp_requirements) > 0 THEN
            name_parts := name_parts || ARRAY['Social'];
            desc_parts := desc_parts || ARRAY['EFP requirements'];
          END IF;
        END IF;
      END LOOP;
      
      -- Generate final name (keep it concise)
      IF array_length(name_parts, 1) = 0 THEN
        final_name := 'Custom Gate';
      ELSIF array_length(name_parts, 1) = 1 THEN
        final_name := name_parts[1] || ' Gate';
      ELSIF array_length(name_parts, 1) = 2 THEN
        final_name := array_to_string(name_parts, ' + ') || ' Gate';
      ELSE
        final_name := name_parts[1] || ' + ' || name_parts[2] || ' +' || (array_length(name_parts, 1) - 2) || ' Gate';
      END IF;
      
      -- Generate final description
      IF array_length(desc_parts, 1) = 0 THEN
        final_description := 'Migrated gating configuration';
      ELSE
        final_description := array_to_string(desc_parts, '; ');
        IF length(final_description) > 250 THEN
          final_description := substring(final_description, 1, 247) || '...';
        END IF;
      END IF;
      
      -- Ensure name fits within VARCHAR(255) limit
      IF length(final_name) > 200 THEN
        final_name := substring(final_name, 1, 197) || '...';
      END IF;
      
      name := final_name;
      description := final_description;
      RETURN NEXT;
    END $$;
  `);

  // Use a transaction to ensure atomicity for the main migration
  await pgm.sql(`
    DO $$
    DECLARE
      post_record RECORD;
      gating_config JSONB;
      lock_name TEXT;
      lock_description TEXT;
      current_lock_id INTEGER;
      config_hash TEXT;
      existing_lock_id INTEGER;
      total_posts INTEGER := 0;
      processed_posts INTEGER := 0;
      created_locks INTEGER := 0;
      linked_posts INTEGER := 0;
      base_name TEXT;
      counter INTEGER;
      name_exists BOOLEAN;
    BEGIN
      -- Count total posts with gating for progress tracking
      SELECT COUNT(*) INTO total_posts
      FROM posts 
      WHERE settings->'responsePermissions'->'categories' IS NOT NULL
        AND jsonb_array_length(settings->'responsePermissions'->'categories') > 0;
      
      RAISE NOTICE '[Migration] Found % posts with gating configurations', total_posts;
      
      -- Process each post with gating
      FOR post_record IN 
        SELECT 
          p.id, 
          p.title,
          p.author_user_id,
          p.board_id,
          p.settings->'responsePermissions' as gating_config,
          b.community_id
        FROM posts p
        JOIN boards b ON p.board_id = b.id
        WHERE p.settings->'responsePermissions'->'categories' IS NOT NULL
          AND jsonb_array_length(p.settings->'responsePermissions'->'categories') > 0
        ORDER BY p.created_at ASC
      LOOP
        processed_posts := processed_posts + 1;
        gating_config := post_record.gating_config;
        
        -- Generate a hash of the gating config for deduplication
        config_hash := encode(digest(gating_config::text, 'sha256'), 'hex');
        
        -- Check if we already created a lock for this exact configuration
        SELECT id INTO existing_lock_id
        FROM locks 
        WHERE community_id = post_record.community_id
          AND encode(digest(locks.gating_config::text, 'sha256'), 'hex') = config_hash;
        
        IF existing_lock_id IS NOT NULL THEN
          -- Reuse existing lock
          current_lock_id := existing_lock_id;
          RAISE NOTICE '[Migration] Reusing existing lock % for post %', current_lock_id, post_record.id;
        ELSE
          -- Generate human-readable name and description
          SELECT INTO lock_name, lock_description generate_lock_metadata(gating_config);
          
          -- Ensure unique name within the community by appending counter if needed
          -- But first make sure base name isn't too long for adding counters
          IF length(lock_name) > 240 THEN
            lock_name := substring(lock_name, 1, 240);
          END IF;
          
          base_name := lock_name;
          counter := 1;
          LOOP
            SELECT EXISTS(SELECT 1 FROM locks WHERE community_id = post_record.community_id AND name = lock_name) INTO name_exists;
            IF NOT name_exists THEN
              EXIT;
            END IF;
            counter := counter + 1;
            lock_name := base_name || ' #' || counter;
          END LOOP;
          
          -- Create new lock
          INSERT INTO locks (
            name,
            description,
            icon,
            color,
            gating_config,
            creator_user_id,
            community_id,
            is_template,
            is_public,
            tags,
            usage_count,
            success_rate,
            avg_verification_time
          ) VALUES (
            lock_name,
            lock_description,
            '🔒', -- Default icon
            '#6366f1', -- Default indigo color
            gating_config,
            post_record.author_user_id,
            post_record.community_id,
            false, -- Not a template initially
            true,  -- Make public so others can reuse
            ARRAY['migrated', 'auto-generated'], -- Default tags
            1, -- Initial usage count
            0.0, -- Will be calculated later
            0 -- Will be calculated later
          ) RETURNING id INTO current_lock_id;
          
          created_locks := created_locks + 1;
          RAISE NOTICE '[Migration] Created lock % ("%") from post %', current_lock_id, lock_name, post_record.id;
        END IF;
        
        -- Link post to the lock
        UPDATE posts 
        SET lock_id = current_lock_id
        WHERE id = post_record.id;
        
        linked_posts := linked_posts + 1;
        
        -- Update usage count for the lock
        UPDATE locks 
        SET usage_count = usage_count + 1
        WHERE id = current_lock_id;
        
        -- Progress reporting every 10 posts
        IF processed_posts % 10 = 0 THEN
          RAISE NOTICE '[Migration] Progress: %/% posts processed, % locks created', 
            processed_posts, total_posts, created_locks;
        END IF;
      END LOOP;
      
      RAISE NOTICE '[Migration] ✅ Conversion complete:';
      RAISE NOTICE '  - Processed posts: %', processed_posts;
      RAISE NOTICE '  - Created locks: %', created_locks;
      RAISE NOTICE '  - Linked posts: %', linked_posts;
      RAISE NOTICE '  - Average reuse: %.1f posts per lock', 
        CASE WHEN created_locks > 0 THEN processed_posts::FLOAT / created_locks ELSE 0 END;
    END $$;
  `);

  console.log('[Migration] ✅ Successfully converted existing gating configurations to locks');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Rolling back gating-to-locks conversion...');

  // Remove the helper function
  await pgm.sql(`DROP FUNCTION IF EXISTS generate_lock_metadata(JSONB);`);

  // Clear lock_id references from posts
  await pgm.sql(`UPDATE posts SET lock_id = NULL WHERE lock_id IS NOT NULL;`);

  // Delete all migrated locks (identified by tags)
  await pgm.sql(`
    DELETE FROM locks 
    WHERE tags && ARRAY['migrated', 'auto-generated'];
  `);

  console.log('[Migration] ✅ Successfully rolled back gating-to-locks conversion');
}
