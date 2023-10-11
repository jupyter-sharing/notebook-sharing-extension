import React, { useState, useEffect, useMemo, useCallback, FC } from 'react';
import { useDebounce } from '../../utils';
import { PublishingExtensionClient } from '../service';
import { Contact, ICollaborators } from '../types';
import { AutoSuggestionInput } from './auto_suggestion';

type Props = {
  author: Contact;
  isReadOnly: boolean;
  onChange: (v: Contact[]) => void;
  client: PublishingExtensionClient;
  collaborators: ICollaborators[] | null;
};

export const ShareNotebooksComponent: FC<Props> = ({
  onChange,
  author,
  client,
  isReadOnly,
  collaborators = []
}) => {
  const [query, setQuery] = useState('');
  const searchQuery = useDebounce(query, 100);
  const [value, setValue] = useState<Contact[]>([]);
  const [people, setPeople] = useState(collaborators || []);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const owner = useMemo(() => collaborators?.find(c => c.id === author.id), []);

  useEffect(() => {
    const fetchContacts = async (input: string) => {
      const result = await client.searchUsers(input);

      if (searchQuery === input) {
        setContacts(result);
      }
    };

    if (searchQuery) {
      fetchContacts(searchQuery);

      return;
    }

    setContacts([]);
  }, [searchQuery]);

  const handleChange = useCallback(
    (value: Contact[]) => {
      setValue(value);
      onChange([...people, ...value]);
    },
    [people]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const nextState = people.filter(({ email }) => email !== id);

      setPeople(nextState);
      onChange([...nextState, ...value]);
    },
    [people]
  );

  const handleSearchQuery = useCallback((query: string) => {
    setQuery(query);
  }, []);

  return (
    <>
      {isReadOnly ? (
        <p className="header-info">
          You're a viewer and can't share. Please request owner to share with
          others
        </p>
      ) : (
        <>
          <p>
            This document has been published to Data Studio's document sharing
            service. You can now share this document with others.
          </p>
          <AutoSuggestionInput
            value={value}
            contacts={contacts}
            onChange={handleChange}
            onSearch={handleSearchQuery}
          />
        </>
      )}
      <div className="list-header">People with access</div>
      <ul className="list">
        {owner && (
          <li key="author" className="list-item">
            <div className="contact">
              <div className="name">{owner.name}</div>
              <div className="email">{owner.email}</div>
            </div>
            <button disabled>Owner</button>
          </li>
        )}
        {people
          .filter(p => p.id !== author.id)
          .map(item => {
            return (
              <li key={item.email} className="list-item">
                <div className="contact">
                  <span className="name">{item.name}</span>
                  <span className="email">{item.email}</span>
                </div>
                {isReadOnly ? null : (
                  <button onClick={() => handleRemove(item.email)}>
                    Remove
                  </button>
                )}
              </li>
            );
          })}
      </ul>
    </>
  );
};
