import React, { useState, useEffect, useMemo, useCallback, FC } from 'react';
import { useDebounce } from '@jupyter_sharing/core';
import { PublishingExtensionClient } from '../service';
import { Contact, ICollaborator } from '../types';
import { AutoSuggestionInput } from './auto_suggestion';
import { Divider, Button, Menu, MenuItem, ListItemText } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';

type Props = {
  author: Contact;
  isReadOnly: boolean;
  onChange: (v: ICollaborator[]) => void;
  client: PublishingExtensionClient;
  collaborators: ICollaborator[] | null;
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
  const [newCollaborator, setNewCollaborator] = useState<ICollaborator[]>([]); // this is for added contact from input box
  const [
    newCollaboratorPermission,
    setNewCollaboratorPermission
  ] = useState<string>('Viewer'); // this is for added contact from input box's permission
  const [collaboratorList, setCollaboratorList] = useState(collaborators || []); // this is for existing contacts from data and handle removing
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
    (value: ICollaborator[]) => {
      const permissions =
        newCollaboratorPermission == 'Editor' ? ['LiveAccess'] : [];
      const nextNewCollaborator: ICollaborator[] = [];
      for (let user of value) {
        nextNewCollaborator.push({
          id: user.id,
          email: user.email,
          name: user.name,
          permissions: permissions
        });
      }
      const nextUniqueNewCollaborators = nextNewCollaborator
        .filter((obj, index) => {
          return index === nextNewCollaborator.findIndex(o => obj.id === o.id);
        })
        .filter(c => c.id !== author.id); //deduplicate
      setNewCollaborator(nextUniqueNewCollaborators);
      const nextCollaboratorList = collaboratorList.filter(
        ({ id }) => !nextUniqueNewCollaborators.map(e => e.id).includes(id)
      ); //deduplicate
      onChange([...nextCollaboratorList, ...nextUniqueNewCollaborators]);
    },
    [collaboratorList, newCollaborator]
  );

  const handleSearchQuery = useCallback((query: string) => {
    setQuery(query);
  }, []);

  const handlePermissionsForSearch = (p: string) => {
    setNewCollaboratorPermission(p);
    const permissions = p == 'Editor' ? ['LiveAccess'] : [];
    const nextNewCollaborator: ICollaborator[] = [];
    for (let user of newCollaborator) {
      nextNewCollaborator.push({
        id: user.id,
        email: user.email,
        name: user.name,
        permissions: permissions
      });
    }
    setNewCollaborator(nextNewCollaborator);
    const newCollaboratorList = collaboratorList.filter(
      ({ id }) => !nextNewCollaborator.map(e => e.id).includes(id)
    ); //deduplicate
    onChange([...newCollaboratorList, ...nextNewCollaborator]);
  };

  const handlePermissions = (item: ICollaborator) => (permission: string) => {
    const permissions = permission == 'Editor' ? ['LiveAccess'] : [];
    const nextCollaboratorList = [];
    for (let user of collaboratorList) {
      if (user.id == item.id) {
        nextCollaboratorList.push({
          id: item.id,
          email: item.email,
          name: item.name,
          permissions: permissions
        });
      } else {
        nextCollaboratorList.push(user);
      }
    }
    setCollaboratorList(nextCollaboratorList);
    onChange([...nextCollaboratorList, ...newCollaborator]);
  };

  const handleRemove = useCallback(
    (userId: string) => () => {
      const nextCollaboratorList = collaboratorList.filter(
        ({ id }) => id !== userId
      );

      setCollaboratorList(nextCollaboratorList);
      onChange([...nextCollaboratorList, ...newCollaborator]);
    },
    [collaboratorList, newCollaborator]
  );

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
            This document has been published to Jupyter's document sharing
            service. You can now share this document with others.
          </p>
          <div className="auto-suggestion">
            <AutoSuggestionInput
              value={newCollaborator}
              contacts={contacts}
              onChange={handleChange}
              onSearch={handleSearchQuery}
            />
            <div className="auto-suggestion-permission">
              <OptionsMenu
                permission={newCollaboratorPermission}
                isOptionsOnly={true}
                isReadOnly={false}
                handleRemove={() => {}}
                onChange={handlePermissionsForSearch}
              ></OptionsMenu>
            </div>
          </div>
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
            <div className="contact-permission">
              <Button
                id="options-button"
                className="options-button"
                variant="contained"
                disabled={true}
              >
                <span className="options-button-text">Owner</span>
              </Button>
            </div>
          </li>
        )}
        {collaboratorList
          .filter(p => p.id !== author.id)
          .map(item => {
            return (
              <li key={item.email} className="list-item">
                <div className="contact">
                  <span className="name">{item.name}</span>
                  <span className="email">{item.email}</span>
                </div>
                <div className="contact-permission">
                  <OptionsMenu
                    permission={
                      item.permissions == null || item.permissions.length == 0
                        ? 'Viewer'
                        : item.permissions.indexOf('LiveAccess') != -1
                        ? 'Editor'
                        : 'Viewer'
                    }
                    isReadOnly={isReadOnly}
                    isOptionsOnly={isReadOnly}
                    handleRemove={handleRemove(item.id)}
                    onChange={handlePermissions(item)}
                  ></OptionsMenu>
                </div>
              </li>
            );
          })}
      </ul>
      <div className="live-notebook"></div>
    </>
  );
};

type OptionMenuProps = {
  permission: string;
  isReadOnly: boolean;
  isOptionsOnly: boolean;
  handleRemove: () => void;
  onChange: (permission: string) => void;
};

export const OptionsMenu: FC<OptionMenuProps> = ({
  permission,
  isReadOnly,
  isOptionsOnly,
  handleRemove,
  onChange
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [perm, setPerm] = useState<string>(permission);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (
    _event: React.MouseEvent<HTMLElement>,
    permission: string
  ) => {
    setPerm(permission);
    onChange(permission);
    setAnchorEl(null);
  };

  return (
    <div>
      <Button
        id="options-button"
        className="options-button"
        aria-controls={open ? 'options-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        variant="contained"
        disableElevation
        disabled={isReadOnly}
        onClick={handleClick}
        endIcon={isReadOnly ? null : <KeyboardArrowDown />}
      >
        <span className="options-button-text">{perm}</span>
      </Button>
      {isReadOnly ? null : (
        <Menu
          id="option-menu"
          className="option-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'options-button',
            role: 'listbox'
          }}
        >
          <MenuItem
            key={'Viewer'}
            selected={perm === 'Viewer'}
            onClick={event => handleMenuItemClick(event, 'Viewer')}
          >
            Viewer
          </MenuItem>
          <MenuItem
            key={'Editor'}
            selected={perm === 'Editor'}
            onClick={event => handleMenuItemClick(event, 'Editor')}
          >
            Editor
          </MenuItem>
          {isOptionsOnly ? null : <Divider />}
          {isOptionsOnly ? null : (
            <MenuItem onClick={() => handleRemove()}>
              <ListItemText>Remove</ListItemText>
            </MenuItem>
          )}
        </Menu>
      )}
    </div>
  );
};
