/* eslint-disable max-len */
import React from 'react';
import Notes from '../../router/noteRoutes';
import { useAuth0 } from '@auth0/auth0-react';
import type { Note } from '../../types';
import './search.css';

interface SearchProps {
  searchNotes: (notes: Note[], searchTerm: string) => void;
}

function Search(props: SearchProps) {
  const { user } = useAuth0();

  // This handler is bound to both onChange and onKeyUp, which fire two
  // structurally different React event types — ChangeEvent has no
  // `.code`, KeyboardEvent has no properly-typed `.target`. Typed as a
  // union and read via `.currentTarget` (typed correctly as the input
  // for both event kinds), rather than `.target`, which only
  // ChangeEvent types strictly.
  const searchDataBase = async (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.KeyboardEvent<HTMLInputElement>
  ) => {
    if ('code' in e && e.code === 'Enter') {
      return;
    }

    const userId = user?.sub?.split('|')[1];
    if (!userId) return;

    const searchValue = e.currentTarget.value;

    // Clearing the search box should reset back to "All" results — this
    // branch was previously unreachable because an earlier guard here
    // returned early on the same empty-value condition before this code
    // could ever run.
    if (searchValue.length === 0) {
      props.searchNotes([], '');
      return;
    }

    if (searchValue === '#' || searchValue === '%' || /[\\?/]+/.test(searchValue)) {
      return;
    }
    e.preventDefault();
    const searchedNotes = await Notes.searchNote(searchValue, userId);
    props.searchNotes(searchedNotes, searchValue);
  };

  return (
    <>
      <input
      id='smallScreen'
        autoComplete="new-password"
        style={{
          borderRadius: '25px',
          height: '30%',
          textAlign: 'center',
          width: '13rem',
          marginLeft: '5%',
        }}
        type="text"
        placeholder="Search…"
        onChange={(e) => searchDataBase(e)}
        onKeyUp={(e) => searchDataBase(e)}
      ></input>
    </>
  );
}

export default Search;