// Example: Instrumented API Route
// src/app/api/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger, createContextLogger, generateRequestId } from '@/lib/logger';
import { traced } from '@/lib/tracing';
import { metrics } from '@/lib/metrics';
import { observableSupabase } from '@/lib/observable-supabase';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || generateRequestId();
  const log = createContextLogger({ 
    request_id: requestId,
    endpoint: '/api/contacts',
    method: 'GET',
  });

  log.info('Fetching contacts');

  return traced('api.contacts.get', async (span) => {
    const startTime = Date.now();

    try {
      // Get user from session (example)
      const userId = 'user_123'; // Replace with actual auth
      
      span.setAttributes({
        user_id: userId,
      });

      // Query with observability
      const contacts = await observableSupabase?.from('contacts').select('*', {
        context: { user_id: userId, request_id: requestId },
      });

      const duration = Date.now() - startTime;

      // Record metrics
      metrics.record({
        name: 'api.contacts.get.duration',
        value: duration,
        unit: 'milliseconds',
        tags: { status: 'success' },
      });

      // Track SLO
      metrics.trackSLO('api_success_rate', true);

      log.info('Contacts fetched successfully', {
        count: contacts?.length || 0,
        duration_ms: duration,
      });

      return NextResponse.json(contacts, {
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': duration.toString(),
        },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      log.error('Failed to fetch contacts', error as Error, {
        duration_ms: duration,
      });

      metrics.record({
        name: 'api.contacts.get.error',
        value: 1,
        tags: { error_type: (error as Error).name },
      });

      metrics.trackSLO('api_success_rate', false);

      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { 
          status: 500,
          headers: { 'X-Request-ID': requestId },
        }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || generateRequestId();
  const log = createContextLogger({ 
    request_id: requestId,
    endpoint: '/api/contacts',
    method: 'POST',
  });

  return traced('api.contacts.create', async (span) => {
    const startTime = Date.now();

    try {
      const body = await request.json();
      const userId = 'user_123'; // Replace with actual auth

      log.info('Creating contact', {
        contact_name: body.name,
        contact_email: body.email,
      });

      span.setAttributes({
        user_id: userId,
        contact_name: body.name,
      });

      // Insert with observability
      const contact = await observableSupabase?.from('contacts').insert([
        {
          ...body,
          user_id: userId,
        },
      ], {
        context: { user_id: userId, request_id: requestId },
      });

      const duration = Date.now() - startTime;

      metrics.record({
        name: 'api.contacts.create.duration',
        value: duration,
        unit: 'milliseconds',
        tags: { status: 'success' },
      });

      metrics.trackSLO('api_success_rate', true);

      log.info('Contact created successfully', {
        contact_id: contact?.[0]?.id,
        duration_ms: duration,
      });

      return NextResponse.json(contact?.[0], {
        status: 201,
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': duration.toString(),
        },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      log.error('Failed to create contact', error as Error, {
        duration_ms: duration,
      });

      metrics.record({
        name: 'api.contacts.create.error',
        value: 1,
        tags: { error_type: (error as Error).name },
      });

      metrics.trackSLO('api_success_rate', false);

      return NextResponse.json(
        { error: (error as Error).message },
        { 
          status: 400,
          headers: { 'X-Request-ID': requestId },
        }
      );
    }
  });
}
