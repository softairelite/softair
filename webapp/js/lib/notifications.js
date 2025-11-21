/**
 * Notifications Library
 * Gestione notifiche in-app per nuovi eventi
 */

import { supabase, TABLES, toCamelCase } from './supabase.js';
import { getCurrentUser } from './auth.js';

/**
 * Get count of events without attendance response for current user
 */
export async function getUnviewedEventsCount() {
  const user = getCurrentUser();
  if (!user) return 0;

  try {
    // Get all future event IDs
    const { data: allEvents } = await supabase
      .from(TABLES.events)
      .select('id')
      .gte('event_date', new Date().toISOString());

    if (!allEvents || allEvents.length === 0) return 0;

    const eventIds = allEvents.map(e => e.id);

    // Get events where user has responded (attending or not_attending)
    const { data: respondedEvents } = await supabase
      .from(TABLES.attendance)
      .select('event_id')
      .eq('user_id', user.id)
      .in('event_id', eventIds)
      .in('status', ['attending', 'not_attending']);

    const respondedIds = respondedEvents ? respondedEvents.map(v => v.event_id) : [];

    // Count events without response
    return eventIds.length - respondedIds.length;
  } catch (error) {
    console.error('Error getting unviewed events count:', error);
    return 0;
  }
}

