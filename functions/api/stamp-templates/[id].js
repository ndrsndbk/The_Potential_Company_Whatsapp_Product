// GET /api/stamp-templates/:id - Get single template
// PUT /api/stamp-templates/:id - Update template
// DELETE /api/stamp-templates/:id - Delete template

import { sbSelectOne, sbUpdate, sbDelete } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  const user = context.data?.user;
  const templateId = params.id;

  try {
    let filter = `id=eq.${templateId}`;

    // Non-super-admins can only access their org's templates
    if (user && user.role !== 'super_admin' && user.organization_id) {
      filter += `&organization_id=eq.${user.organization_id}`;
    }

    const template = await sbSelectOne(env, 'stamp_card_templates', filter, '*');

    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }

    return Response.json({ template });
  } catch (error) {
    console.error('Error getting stamp template:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPut(context) {
  const { env, params, request } = context;
  const user = context.data?.user;
  const templateId = params.id;

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
      reward_text,
      is_active
    } = body;

    // Build filter
    let filter = `id=eq.${templateId}`;
    if (user && user.role !== 'super_admin' && user.organization_id) {
      filter += `&organization_id=eq.${user.organization_id}`;
    }

    // Build update data (only include provided fields)
    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (total_stamps !== undefined) updateData.total_stamps = total_stamps;
    if (stamp_icon !== undefined) updateData.stamp_icon = stamp_icon;
    if (background_color !== undefined) updateData.background_color = background_color;
    if (accent_color !== undefined) updateData.accent_color = accent_color;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (reward_text !== undefined) updateData.reward_text = reward_text;
    if (is_active !== undefined) updateData.is_active = is_active;

    const results = await sbUpdate(
      env,
      'stamp_card_templates',
      filter,
      updateData,
      true
    );

    if (!results || results.length === 0) {
      return Response.json({ error: 'Template not found or access denied' }, { status: 404 });
    }

    return Response.json({ template: results[0] });
  } catch (error) {
    console.error('Error updating stamp template:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const user = context.data?.user;
  const templateId = params.id;

  try {
    // Build filter
    let filter = `id=eq.${templateId}`;
    if (user && user.role !== 'super_admin' && user.organization_id) {
      filter += `&organization_id=eq.${user.organization_id}`;
    }

    await sbDelete(env, 'stamp_card_templates', filter);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting stamp template:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
