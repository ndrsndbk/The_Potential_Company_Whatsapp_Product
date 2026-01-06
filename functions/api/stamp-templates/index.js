// GET /api/stamp-templates - List all stamp card templates for user's organization
// POST /api/stamp-templates - Create new template in user's organization

import { sbSelect, sbInsert } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env } = context;
  const user = context.data?.user;

  try {
    // Build filter based on user's organization
    let filter = 'order=created_at.desc';
    if (user && user.role !== 'super_admin' && user.organization_id) {
      filter = `organization_id=eq.${user.organization_id}&order=created_at.desc`;
    }

    const templates = await sbSelect(
      env,
      'stamp_card_templates',
      filter,
      '*'
    );

    return Response.json({ templates });
  } catch (error) {
    console.error('Error listing stamp templates:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const user = context.data?.user;

  try {
    const body = await request.json();
    const {
      name,
      title,
      subtitle,
      total_stamps,
      stamp_icon,
      background_color,
      accent_color,
      logo_url,
      reward_text
    } = body;

    // Validate required fields
    if (!name) {
      return Response.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // Build template data with organization_id
    const templateData = {
      name,
      title: title || 'LOYALTY CARD',
      subtitle: subtitle || 'Collect stamps to earn rewards!',
      total_stamps: total_stamps || 10,
      stamp_icon: stamp_icon || 'cup',
      background_color: background_color || '#000000',
      accent_color: accent_color || '#ccff00',
      logo_url: logo_url || null,
      reward_text: reward_text || 'FREE ITEM',
      is_active: true,
    };

    // Add organization_id if user belongs to an organization
    if (user && user.organization_id) {
      templateData.organization_id = user.organization_id;
    }

    const templateRows = await sbInsert(
      env,
      'stamp_card_templates',
      [templateData],
      true
    );

    const template = templateRows[0];

    return Response.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating stamp template:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
