/**
 * Notifications Library
 * Gestione notifiche in-app per nuovi eventi
 */

import { supabase, TABLES, toCamelCase } from './supabase.js';
import { getCurrentUser } from './auth.js';

/**
 * Get count of unviewed events for current user
 */
export async function getUnviewedEventsCount() {
  const user = getCurrentUser();
  if (!user) return 0;

  try {
    // Get all event IDs
    const { data: allEvents } = await supabase
      .from(TABLES.events)
      .select('id')
      .gte('event_date', new Date().toISOString());

    if (!allEvents || allEvents.length === 0) return 0;

    const eventIds = allEvents.map(e => e.id);

    // Get viewed event IDs for this user
    const { data: viewedEvents } = await supabase
      .from(TABLES.userEventViews)
      .select('event_id')
      .eq('user_id', user.id)
      .in('event_id', eventIds);

    const viewedIds = viewedEvents ? viewedEvents.map(v => v.event_id) : [];

    // Count unviewed
    return eventIds.length - viewedIds.length;
  } catch (error) {
    console.error('Error getting unviewed events count:', error);
    return 0;
  }
}

/**
 * Mark event as viewed by current user
 */
export async function markEventAsViewed(eventId) {
  const user = getCurrentUser();
  if (!user) return;

  try {
    await supabase
      .from(TABLES.userEventViews)
      .upsert({
        user_id: user.id,
        event_id: eventId,
        viewed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,event_id'
      });
  } catch (error) {
    console.error('Error marking event as viewed:', error);
  }
}

/**
 * Get list of unviewed events
 */
export async function getUnviewedEvents() {
  const user = getCurrentUser();
  if (!user) return [];

  try {
    // Get all future events
    const { data: allEvents } = await supabase
      .from(TABLES.events)
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });

    if (!allEvents || allEvents.length === 0) return [];

    const eventIds = allEvents.map(e => e.id);

    // Get viewed event IDs
    const { data: viewedEvents } = await supabase
      .from(TABLES.userEventViews)
      .select('event_id')
      .eq('user_id', user.id)
      .in('event_id', eventIds);

    const viewedIds = viewedEvents ? viewedEvents.map(v => v.event_id) : [];

    // Filter unviewed events
    return toCamelCase(allEvents.filter(e => !viewedIds.includes(e.id)));
  } catch (error) {
    console.error('Error getting unviewed events:', error);
    return [];
  }
}
