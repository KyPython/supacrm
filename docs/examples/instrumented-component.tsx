// Example: Instrumented React Component
// src/app/contacts/ContactsList.tsx
'use client';

import { useEffect, useState } from 'react';
import { 
  usePageTracking, 
  useInteractionTracking,
  useObservableAPI,
  useComponentObservability 
} from '@/hooks/useObservability';

interface Contact {
  id: string;
  name: string;
  email: string;
}

export function ContactsList({ userId }: { userId: string }) {
  // Set up observability
  const sessionId = usePageTracking(userId);
  const { trackInteraction } = useInteractionTracking('ContactsList', userId);
  const { callAPI } = useObservableAPI();
  const log = useComponentObservability('ContactsList');

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    log.info('Loading contacts');
    setLoading(true);
    setError(null);

    try {
      // Automatically tracked API call
      const data = await callAPI<Contact[]>('/api/contacts', {
        context: { user_id: userId, action: 'load_contacts' },
      });

      setContacts(data);
      log.info('Contacts loaded', { count: data.length });
      
      // Track successful load
      trackInteraction('contacts_loaded', { count: data.length });
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      log.error('Failed to load contacts', err as Error);
      
      // Track error
      trackInteraction('contacts_load_failed', { 
        error: errorMessage 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContactClick = (contact: Contact) => {
    log.debug('Contact clicked', { contact_id: contact.id });
    
    trackInteraction('contact_clicked', {
      contact_id: contact.id,
      contact_name: contact.name,
    });
    
    // Navigate or perform action...
  };

  const handleRefresh = () => {
    log.info('Refresh button clicked');
    trackInteraction('refresh_clicked');
    loadContacts();
  };

  if (loading) {
    return <div>Loading contacts...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={handleRefresh}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Contacts ({contacts.length})</h1>
      <button onClick={handleRefresh}>Refresh</button>
      
      <ul>
        {contacts.map((contact) => (
          <li 
            key={contact.id}
            onClick={() => handleContactClick(contact)}
          >
            {contact.name} - {contact.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
